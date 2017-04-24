// profile management and user rendering
// (c)copyright 2015 by Gerald Wodni <gerald.wodni@gmail.com>
"use strict";

var _       = require('underscore');

module.exports = {
    setup: function( k ) {

        /* default jade value helper */
        var vals = k.setupOpts.vals;

        var kData = k.getData();
        var db = k.getDb();

        function renderUser( userLink, req, res, next ) {
            /* user */
            console.log( "RENDER", userLink );
            kData.users.readWhere( "name", [ userLink ], function( err, users ) {
                if( err ) return next( err );
                if( users.length == 0 ) return k.httpStatus( req, res, 404 );

                var user = users[0];
                k.jade.render( req, res, "profile", vals( req, { user: user, articles: [], manage: req.session && user.name==req.session.loggedInUsername, title: user.name } ) );

                /* user's articles */
                //kData.articles.readWhere( "user", [ user.id ], function( err, packages ) {
                //    if( err ) return next( err );

                //    user.emailMd5 = md5( user.email );
                //    k.jade.render( req, res, "user", vals( req, { user: user, articles: articles, manage: req.session && user.name==req.session.loggedInUsername, title: user.name } ) );
                //});
            });
        }

        /* change password */
        k.router.post("/change-password", function( req, res, next ) {
            k.users.changePassword( req, res, function( err ) {
                if( err )
                    k.jade.render( req, res, "changePassword", vals( req, { title: "Change Password", error: err.message } ) );
                else
                    k.jade.render( req, res, "changePassword", vals( req, { title: "Change Password", success: "Password changed" } ) );
            });
        });
        k.router.get("/change-password", function( req, res ) {
            k.jade.render( req, res, "changePassword", vals( req, { title: "Change Password" } ) );
        });

        /* update profile details */
        k.router.get("/edit", function( req, res ) {
            k.jade.render( req, res, "editProfile", vals( req, { title: "Profile editieren" } ) );
        });

        k.router.post("/articles/edit/:id", function( req, res, next ) {
            k.requestman( req );
            k.postman( req, res, function() {
                db.query("UPDATE articles SET ? WHERE id=?", [{
                    title: req.postman.text( "title" ),
                    hot:   req.postman.exists( "hot" ),
                    frontPage:   req.postman.exists( "frontPage" ),
                    intro: req.postman.text( "intro" ),
                    body: req.postman.text( "body" )
                }, req.requestman.uint("id")], function( err ) {
                    /* forward to get */
                    req.method = "GET";
                    next( err );
                });
            });
        });

        k.router.get("/articles/edit/:id", function( req, res ) {
            k.requestman( req );
            db.query("SELECT * FROM articles WHERE id=?", [ req.requestman.uint("id") ], function( err, data ) {
                if( err ) return next( err );
                if( data.length != 1 ) return httpStatus( req, res, 404 );
                k.jade.render( req, res, "editArticle", vals( req, { article: data[0] } ) );
            });
        });

        /* render logged in user */
        k.router.get("/", function( req, res, next ) {
            renderUser( req.session.loggedInUsername, req, res, next );
        });

    }
};
