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
        function httpStatus( req, res, code, vals ) {
            k.httpStatus( req, res, code, { values: vals } );
        }

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

        /* profile */
        /* TODO: pass navigation information to login and profile renderers */
        k.router.use( k.users.loginRequired( "login", { path: "/profile" } ) );
        k.useSiteModule( "/profile", "forth-ev.de", "profile.js" );

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
                    var vals = {}, i=0;
                    _.keys( callQueries ).forEach( function( key ) {
                        vals[ key ] = data[ i++ ];
                    });
                    /* perform callback */
                    callback( req, res, vals );
                });
            });
        }

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
                                k.jade.render( req, res, file.name, _.extend( data, { naked: true, link: item.link, offset: offset } ) );
                            });


                        /* register provider */
                        provide( "get", item.link + "/:offset?", { queries: queries }, function( req, res, data ) {
                            switch( file.ext ) {
                                case ".jade":
                                    var offset = req.requestman ? parseInt(req.requestman.uint( "offset" )||"0") : 0;
                                    k.jade.render( req, res, file.name, _.extend( data, { link: item.link, bodyClass: item.class, offset: offset } ) );
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
                    k.jade.render( req, res, "home", _.extend( data, { bodyClass: "home" } ) );
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
