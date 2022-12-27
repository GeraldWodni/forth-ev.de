// forth-ev.de main include file
// (c)copyright 2016 by Gerald Wodni <gerald.wodni@gmail.com>

var fs      = require("fs");
var path    = require("path");
var _       = require("underscore");
var { marked } = require('marked');
var md5     = require("md5");
var moment  = require("moment");
var mysql   = require("mysql");

module.exports = {
    setup: async function( k ) {

        /* globals */
        var kData = k.getData();
        var db = k.getDb();

        /* utlitiy */
        function httpStatus( req, res, code, values ) {
            k.httpStatus( req, res, code, { values: values } );
        }

        function vals( req, values ) {
            return _.extend( values, {
                loggedIn: "session" in req
            });
        }

        function renderVals( req, res, next, view, values ) {
            kData.navigation.readWhere( "top", [], function( err, navigationTop ) {
                if( err ) return next( err );
                kData.navigation.readWhere( "bottom", [], function( err, navigationBottom ) {
                    if( err ) return next( err );
                    k.jade.render( req, res, view, vals( req, _.extend( values, {
                        navigationTop: navigationTop,
                        navigationBottom: navigationBottom
                    })) );
                });
            });
        }

        k.router.get("/logout", function( req, res ) {
            req.sessionInterface.destroy( req, res, function() {
                k.jade.render( req, res, "logout" );
            });
        });

        k.router.get("/anmeldung", function( req, res, next ) {
            renderVals( req, res, next, "anmeldung", { title: "Anmeldung" });
        });

        /* explicit static content */
        k.router.get("/favicon.ico", k.serveStaticFile( "images/favicon.ico" ) );

        /* gravatar proxy */
        k.proxyCache.gravatar( k.website, k.router );

        /* layout queries (to be used on every view) */
        var layoutQueries = {
            "navigationTop": "SELECT * FROM navigation WHERE position='top' ORDER BY priority",
            "navigationBottom": "SELECT * FROM navigation WHERE position='bottom' ORDER BY priority"
        }

        /* extend marked to allow embedding videos */
        marked.use( { renderer: {
            image: ( href, title, text ) => {
                if( /\.mp4$/.test( href ) )
                    return `<video controls style="max-width:100%"><source src="${href}" type="video/mp4"/>${text}</video>`;

                return `<img src="${href}" alt="${text}"/>`;
            }
        }});

        /** ajax api **/
        k.router.get("/ajax/articles/body/:id", function( req, res, next ) {
            k.requestman( req );
            db.query("SELECT type,body FROM articles WHERE id=?", [ req.requestman.uint("id") ], function( err, data ) {
                if( err ) return next( err );
                if( data.length != 1 ) return httpStatus( req, res, 404 );
                var body = data[0].body;
                if( data[0].type == "markdown" )
                    body = marked( body );
                res.send( "<p>" + body + "</p>" );
            });
        });

        /* finish user registration */
        k.router.get("/confirm/:hash", function( req, res, next ) {
            k.requestman( req );

            var hash = req.requestman.alnum( "hash" );
            k.users.confirmCreate( req.kern.website, hash, function( err, user ) {
                if( err )
                    if( err.message && err.message.indexOf( "Unknown hash" ) == 0 )
                        return k.jade.render( req, res, "confirm", vals( req, { error: { title: "Unknown hash", text:"Please use your link provided your email (visiting this page twice will also trigger this message)." } } ) );
                    else
                        return next( err );

                /* create sql user */
                console.log( "CREATE USER:", user );
                kData.users.create({
                    id: user.id,
                    name: user.name,
                    email: user.email
                });

                k.jade.render( req, res, "confirm" );
            });
        });

        /** wiki proxy **/
        k.useSiteModule( "/wiki", k.website, "wikiProxy.js", { setup: { vals: vals, renderVals: renderVals } } );

        /** profile **/
        k.router.use( k.users.loginRequired( "login", { path: "/profile" } ) );
        k.useSiteModule( "/profile", k.website, "profile.js", { setup: { vals: vals, renderVals: renderVals }, register: "profile" } );

        /* TODO: get renderUser from profile-module */
        var renderUser = k.reg("profile").renderUser;
        k.router.use( "/~:link", function( req, res, next ) {
            k.requestman( req );
            var userLink = req.requestman.id( "link" );

            renderUser( userLink, req, res, next );
        });
        k.router.use( "/users", function( req, res, next ) {
            kData.users.readAll( function( err, users ) {
                if( err )
                    return next( err );

                users.forEach( function( user ) {
                    user.emailMd5 = md5( user.email );
                });

                renderVals( req, res, next, "users", { users: users, title: "Benutzer" });
            });
        });

        /** administration **/
        k.reg("admin").addSiteModule( "navigation", k.website, "navigation.js", "Navigation",   "book"      );
        k.reg("admin").addSiteModule( "categories", k.website, "categories.js", "Categories",   "th-large"  );
        k.reg("admin").addSiteModule( "articles",   k.website, "articles.js",   "Articles",     "edit"      );
        k.reg("admin").addSiteModule( "albums",     k.website, "albums.js",     "Albums",       "camera"    );
        k.reg("admin").addSiteModule( "db-users",   k.website, "dbUsers.js",    "DB-Users",     "user"     );


        /** rendering **/

        /* wrapper for layout queries + custom queries */
        function provide( method, path, opts, callback ) {
            opts = opts || {}
            console.log( "PROVIDE".bold.magenta, method, path );

            /* combine query-object, allow override */
            var queries = _.isFunction( opts.queries ) ? opts.queries : function() { return opts.queries || {} };
            /* register path */
            k.router[ method ]( path, function( req, res, next ) {
                /* assemble queries */
                var callQueries = _.extend( {}, layoutQueries, queries( req ) );
                /* send all queires at once */
                db.query( _.values( callQueries ).join(";"), function( err, data ) {
                    if( err ) return next( err ); // handle errors directly

                    /* assign results */
                    var values = {}, i=0;
                    _.keys( callQueries ).forEach( function( key ) {
                        values[ key ] = data[ i++ ];
                    });
                    /* perform callback */
                    callback( req, res, next, values );
                });
            });
        }

        /* single article */
        function renderArticle( req, res, next, id ) {
            kData.articles.read( id, function( err, article ) {
                if( err ) return next( err );
                if( article.length === 0 ) return k.httpStatus( req, res, 404 );

                kData.users.read( article.user, function( err, user ) {
                    if( err ) return next( err );
                    if( article.length === 0 ) return k.httpStatus( req, res, 404 );

                    article.userEmailMd5 = md5( user.email );
                    article.userName = user.name;
                    article.userAvatar = user.avatar;
                    console.log( "UAV:", article.userAvatar );

                    renderVals( req, res, next, "singleArticle", { article: article } );
                });
            });
        }

        /* article by id */
        k.router.get("/articles/id/:id", function( req, res, next ) {
            renderArticle( req, res, next, req.requestman.id() );
        });

        /* article permalink (parse id, ignore rest) */
        k.router.get("/articles/:id/*", function( req, res, next ) {
            renderArticle( req, res, next, req.requestman.id() );
        });

        var specials = {
            albums: function( req, res, next, data, callback ) {
                /* TODO: read hierarchy-photo-directory, check for readmes, markdown readmes */

                /* no offset? just render albums then */
                if( !req.requestman ) k.requestman( req );
                var offset = req.requestman.filename("offset");
                if( !offset ) return callback();

                k.readHierarchyDir( req.kern.website, "images/" + offset, function( err, items ) {
                    if( err ) return next( err );
                    console.log( items );
                    items = items.map( function( item ) { return "/images/" + offset + "/" + item; } );
                    data.albumImages = items;
                    data.albumLink = offset;
                    callback();
                });
            }
        };

        /* setup routes for dynamic content; async is used to make sure home and catchall do not register too soon */
        try {
            /** categories **/
            const navigationItems = await db.pQuery( "SELECT * FROM navigation" );
            /* register each navigation link first */
            for( const item of navigationItems ) {
                        /* HINT: indentation kept this deep to allow easy diffing to pre-ES6-version */
                        /* do not register extenal links */
                        if( item.link.indexOf("http") >= 0 ) return;

                        /* query articles if requested */
                        var file = path.parse( item.file );
                        var queries = {};
                        if( item.category > 0 )
                            queries = function( req ) {
                                var offset = parseInt(req.requestman.uint("offset")||"0") || 0;
                                return { articles: mysql.format(
                                       "SELECT articles.*, MD5(users.email) AS userEmailMd5, users.name AS userName, users.avatar AS userAvatar"
                                    + " FROM articles INNER JOIN users ON articles.user=users.id"
                                    + " WHERE category=? AND DATE(reveal) < NOW() ORDER BY reveal DESC LIMIT ?,10", [ item.category, offset ] )
                                }
                            }

                        /* register ajax */
                        if( item.category > 0 && file.ext == ".jade" )
                            provide( "get", "/ajax/articles/offset" + item.link + "/:offset", { queries: queries },
                            function( req, res, next, data )  {
                                var offset = req.requestman ? parseInt(req.requestman.uint( "offset" )||"0") : 0;
                                k.jade.render( req, res, file.name, vals( req, _.extend( data, { naked: true, link: item.link, offset: offset } ) ) );
                            });

                        /* specials */
                        if( item.class == "albums" )
                            queries.albums = "SELECT * FROM albums ORDER BY start DESC";


                        /* register provider */
                        provide( "get", item.link + "/:offset?", { queries: queries }, function( req, res, next, data ) {
                            switch( file.ext ) {
                                case ".jade":
                                    var offset = req.requestman ? parseInt(req.requestman.uint( "offset" )||"0") : 0;
                                    var special = function( req, res, next, data, callback ) { callback( null ); };
                                    if( _.has( specials, item.class ) )
                                        special = specials[ item.class ];

                                    special( req, res, next, data, function( obj ) {
                                        data = _.extend( data, obj || {} );
                                        renderVals( req, res, next, file.name, _.extend( data, { link: item.link, bodyClass: item.class, offset: offset } ) );
                                    });
                                    break;
                                case ".md":
                                    k.readHierarchyFile( k.website, "/views/" + file.name + file.ext, function( err, contents ) {
                                        if( err ) return next( err );
                                        renderVals( req, res, next, "markdown-wrapper", { content: contents[0] } );
                                    });
                                    break;
                                default:
                                    httpStatus( req, res, 501, { title: "Unknown file-extension", text: "File-extension " + file.ext + " is not handled by site-provider" } );
                            }
                        });
            }

                /** home **/
                provide( "get", "/", { queries: {
                    "articlesHot": "SELECT * FROM articles WHERE hot",
                    articles: `
                        SELECT
                            articles.*,
                            MD5(users.email) AS userEmailMd5,
                            users.avatar AS userAvatar,
                            users.name AS userName
                        FROM articles
                        INNER JOIN users
                        ON articles.user=users.id
                        WHERE frontPage AND DATE(expires) > NOW() AND DATE(reveal) < NOW() AND NOT hot
                        ORDER BY reveal DESC
                        LIMIT 10`
                } }, function( req, res, next, data ) {
                    renderVals( req, res, next, "home", _.extend( data, vals( req, { bodyClass: "home" } ) ) );
                });

                /* catch all */
                k.router.all("*", function( req, res, next ) {
                    /* allow admin */
                    if( /^\/admin.*/.test( req.url ) )
                        next();
                    else
                        httpStatus( req, res, 404 );
                });

        } catch( err ) {
            console.log( "kern setup(k) Error:", err.toString().red.bold );
        }
    }
};
