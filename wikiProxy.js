// wiki proxy for inserting navigation
// (c)copyright 2017 by Gerald Wodni <gerald.wodni@gmail.com>
"use strict";

var https = require( "https" );

module.exports = {
    setup: function( k ) {

        /* default jade value helper */
        var vals = k.setupOpts.vals;
        var renderVals = k.setupOpts.renderVals;

        /* render logged in user */
        k.router.get("/*", function( req, res, next ) {
            var url =  req.url;
            https.get( "https://wiki.forth-ev.de/doku.php/start", function( httpRes ) {
                var httpContent = "";
                httpRes.on( "data", function( data ) { httpContent += data; });
                httpRes.on( "end", function() {
                    renderVals( req, res, next, "wiki", { wikiContent: httpContent, manage: req.session && user.name==req.session.loggedInUsername, title: "WIKI:" + url } );
                });
            });
        });

    }
};
