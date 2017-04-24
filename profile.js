// profile management and user rendering
// (c)copyright 2015 by Gerald Wodni <gerald.wodni@gmail.com>
"use strict";

var md5     = require('md5');
var _       = require('underscore');

var renderUser;

module.exports = {
    setup: function( k ) {

        /* default jade value helper */
        var vals = k.setupOpts.vals;
        var renderVals = k.setupOpts.renderVals;

        var kData = k.getData();
        var db = k.getDb();

        renderUser = function _renderUser( userLink, req, res, next ) {
            /* user */
            kData.users.readWhere( "name", [ userLink ], function( err, users ) {
                if( err ) return next( err );
                if( users.length == 0 ) return k.httpStatus( req, res, 404 );

                var user = users[0];
                user.emailMd5 = md5( user.email );

                /* user's articles */
                kData.articles.readWhere( "user", [ user.id ], function( err, articles ) {
                    if( err ) return next( err );

                    renderVals( req, res, next, "profile", { user: user, articles: articles, manage: req.session && user.name==req.session.loggedInUsername, title: user.name } );
                });
            });
        };

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
	function renderEditProfile( req, res, next ) {
            db.query("SELECT details FROM users WHERE name=?", [req.session.loggedInUsername ], function( err, data ) {
                if( err ) return next( err );
                if( data.length != 1 ) return k.httpStatus( req, res, 404 );

                k.jade.render( req, res, "editProfile", vals( req, { title: "Profile editieren", user: data[0] } ) );
            });
	}
        k.router.post("/edit", function( req, res, next ) {
            k.postman( req, res, function() {
                db.query("UPDATE users SET details=? WHERE name=?", [
                    req.postman.text("details"),
                    req.session.loggedInUsername
                ], function( err ) {
                    if( err ) return next( err );
                    renderEditProfile( req, res, next );
                });
            });
        });

        k.router.get("/edit", function( req, res, next ) {
	    renderEditProfile( req, res, next );
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

    },
    renderUser: function() { renderUser.apply( this, arguments ); }
};
