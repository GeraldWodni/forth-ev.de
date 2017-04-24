// forth-ev.de main include file
// (c)copyright 2016 by Gerald Wodni <gerald.wodni@gmail.com>

var fs      = require("fs");
var path    = require("path");
var _       = require("underscore");
var marked  = require('marked');
var md5     = require("md5");
var moment  = require("moment");
var async   = require("async");
var mysql   = require("mysql");

module.exports = {
    setup: function( k ) {

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

        /* explicit static content */
        k.router.get("/favicon.ico", k.serveStaticFile( "images/favicon.ico" ) );

        /* gravatar proxy */
        k.proxyCache.gravatar( k.website, k.router );

        /* layout queries (to be used on every view) */
        var layoutQueries = {
            "navigationTop": "SELECT * FROM navigation WHERE position='top'",
            "navigationBottom": "SELECT * FROM navigation WHERE position='bottom'"
        }

        /** ajax api **/
        k.router.get("/ajax/articles/body/:id", function( req, res, next ) {
            k.requestman( req );
            db.query("SELECT body FROM articles WHERE id=?", [ req.requestman.uint("id") ], function( err, data ) {
                if( err ) return next( err );
                if( data.length != 1 ) return httpStatus( req, res, 404 );
                res.send( "<p>" + data[0].body + "</p>" );
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

        /** profile **/
        k.router.use( k.users.loginRequired( "login", { path: "/profile" } ) );
        k.useSiteModule( "/profile", "forth-ev.de", "profile.js", { setup: { vals: vals, renderVals: renderVals }, register: "profile" } );

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
        k.reg("admin").addSiteModule( "navigation", "forth-ev.de", "navigation.js", "Navigation",   "book"      );
        k.reg("admin").addSiteModule( "categories", "forth-ev.de", "categories.js", "Categories",   "th-large"  );
        k.reg("admin").addSiteModule( "articles",   "forth-ev.de", "articles.js",   "Articles",     "edit"      );


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
                    callback( req, res, values );
                });
            });
        }

        /* single article */
        /* TODO: use proper permalinks here instead of IDs! */
        k.router.get("/articles/id/:id", function( req, res, next ) {
            k.requestman(req);
            kData.articles.read( req.requestman.id(), function( err, article ) {
                if( err ) return next( err );
                if( article.length === 0 ) return k.httpStatus( req, res, 404 );

                kData.users.read( article.user, function( err, user ) {
                    if( err ) return next( err );
                    if( article.length === 0 ) return k.httpStatus( req, res, 404 );

                    article.userEmailMd5 = md5( user.email );
                    article.userName = user.name;

                    renderVals( req, res, next, "singleArticle", { article: article } );
                });
            });
        });

        /* setup routes for dynamic content; async is used to make sure home and catchall do not register too soon */
        async.series([
            function( done ) {
                /** categories **/
                db.query( "SELECT * FROM navigation", function( err, data ) {
                    if( err ) return console.log( err.toString().red.bold );

                    /* register each navigation link first */
                    data.forEach( function( item ) {
                        /* do not register extenal links */
                        if( item.link.indexOf("http") >= 0 ) return;

                        /* query articles if requested */
                        var file = path.parse( item.file );
                        var queries = {};
                        if( item.category > 0 )
                            queries = function( req ) {
                                k.requestman( req );
                                var offset = parseInt(req.requestman.uint("offset")||"0") || 0;
                                return { articles: mysql.format( 
                                       "SELECT articles.*, MD5(users.email) AS userEmailMd5, users.name AS userName"
                                    + " FROM articles INNER JOIN users ON articles.user=users.id"
                                    + " WHERE category=? ORDER BY created DESC LIMIT ?,10", [ item.category, offset ] )
                                }
                            }

                        /* register ajax */
                        if( item.category > 0 && file.ext == ".jade" )
                            provide( "get", "/ajax/articles/offset" + item.link + "/:offset", { queries: queries },
                            function( req, res, data )  {
                                var offset = req.requestman ? parseInt(req.requestman.uint( "offset" )||"0") : 0;
                                k.jade.render( req, res, file.name, vals( req, _.extend( data, { naked: true, link: item.link, offset: offset } ) ) );
                            });


                        /* register provider */
                        provide( "get", item.link + "/:offset?", { queries: queries }, function( req, res, data ) {
                            switch( file.ext ) {
                                case ".jade":
                                    var offset = req.requestman ? parseInt(req.requestman.uint( "offset" )||"0") : 0;
                                    k.jade.render( req, res, file.name, vals( req, _.extend( data, { link: item.link, bodyClass: item.class, offset: offset } ) ) );
                                    break;
                                default:
                                    httpStatus( req, res, 501, { title: "Unknown file-extension", text: "File-extension " + file.ext + " is not handled by site-provider" } );
                            }
                        });
                    });

                    /* register home */
                    done();
                });
            },
            function( done ) {
                /** home **/
                provide( "get", "/", { queries: {
                    "articlesHot": "SELECT * FROM articles WHERE hot",
                    "articles": "SELECT articles.*, MD5(users.email) AS userEmailMd5, users.name AS userName"
                            + "  FROM articles INNER JOIN users ON articles.user=users.id"
                            + "  WHERE frontPage AND expires > NOW() ORDER BY created DESC LIMIT 10"
                } }, function( req, res, data ) {
                    k.jade.render( req, res, "home", _.extend( data, vals( req, { bodyClass: "home" } ) ) );
                });
                done();
            },
            function( done ) {
                /* catch all */
                k.router.all("*", function( req, res, next ) {
                    /* allow admin */
                    if( /^\/admin.*/.test( req.url ) )
                        next();
                    else
                        httpStatus( req, res, 404 );
                });
                done();
            }
        ]);

    }
};
