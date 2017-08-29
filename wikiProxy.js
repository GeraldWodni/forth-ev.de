// wiki proxy for inserting navigation
// (c)copyright 2017 by Gerald Wodni <gerald.wodni@gmail.com>
"use strict";

var https = require( "https" );
var cheerio = require( "cheerio" );
var url = require("url");
var _ = require("underscore");

var proxyPrefix = "/wiki";
var wikiHost = "wiki.forth-ev.de";
var wikiPrefix = "https://" + wikiHost;

function mangleWiki( path, html ) {
    var $ = cheerio.load( html );

    /* get header info, then remove header */
    var title = $("title").text();

    /* rewrite wiki-lokal images */
    $("img[src^='/']").each(function() {
        $(this).attr("src", wikiPrefix + $(this).attr("src"));
    });

    /* rewrite internal links */
    $("a[href^='/doku.php/']").each(function() {
        $(this).attr("href", proxyPrefix + $(this).attr("href").substr("/doku.php".length));
    });

    /* rewrite post requests */
    $("form[action^='/doku.php']").each(function() {
        $(this).attr("action", proxyPrefix + $(this).attr("action").substr("/doku.php".length));
    });

    /* move header content, then delete it */
    var links = "";
    $("head link").each( function() {
        var $link = $(this);
        var href = $link.attr("href");
        switch( $link.attr( "rel" ) ) {
            case "start":
                href = "/wiki" + href;
                break;
            case "canonical":
                href = "https://forth-ev.de/wiki" + path;
                break;
            default:
                // TODO: if( href.indexOf( "doku.php" )
                href = "/wiki/res" + $link.attr("href");
        }
        $link.attr( "href", href );
        links += $.html( $link ) + "\n";
    });
    var scripts = $.html( $("head script") );

    return {
        html: $("body").html(),
        title: title,
        links: links,
        scripts: scripts
    };
}

module.exports = {
    setup: function( k ) {

        /* default jade value helper */
        var vals = k.setupOpts.vals;
        var renderVals = k.setupOpts.renderVals;

        k.router.get("/res/*", function( req, res, next ) {
            var resUrl = wikiPrefix + url.parse( req.url ).path.substr(4);
            console.log( "RES:", resUrl );
            https.get( resUrl, function( httpRes ) {
                httpRes.pipe( res );
            });
        });

        /* render logged in user */
        k.router.all("/*", function( req, res, next ) {
            var wikiPath = url.parse( req.url ).path;
            if( wikiPath == "/" )
                wikiPath = "/start";
            console.log( wikiPath, req.method );

            function performRequest( opts ) {
                var httpReq = https.request(_.extend({
                    hostname: wikiHost,
                    path: "/doku.php" + wikiPath,
                    port: 443,
                    method: req.method
                }, opts), function( httpRes ) {
                    var httpContent = "";
                    httpRes.on( "data", function( data ) { httpContent += data; });
                    httpRes.on( "end", function() {
                        var wiki = mangleWiki( wikiPath, httpContent );
                        renderVals( req, res, next, "wiki", { wiki, manage: req.session && user.name==req.session.loggedInUsername, title: wiki.title } );
                    });
                });

                httpReq.on("error", function(err) {
                    console.log( err );
                    k.err.renderHttpStatus( req, res, 502 );
                });

                httpReq.end();
            };

            if( req.method == "POST" || req.method == "PUT" ) {
                var body = "";
                req.on("data", function(chunk) {
                    body += chunk;
                });
                req.on("end", function() {
                    performRequest({
                        body: body
                    });
                });
            }
            else
                performRequest();


            //https.get( wikiPrefix + "/doku.php" + wikiPath, function( httpRes ) {
            //    var httpContent = "";
            //    httpRes.on( "data", function( data ) { httpContent += data; });
            //    httpRes.on( "end", function() {
            //        var wiki = mangleWiki( httpContent );
            //        renderVals( req, res, next, "wiki", { wikiContent: wiki.html, manage: req.session && user.name==req.session.loggedInUsername, title: wiki.title } );
            //    });
            //});
        });

    }
};
