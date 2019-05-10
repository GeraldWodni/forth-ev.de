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

function mangleCommon( html ) {

    var $ = cheerio.load( html );

    /* rewrite wiki videos */
    $("video[src^='/']").each(function() {
        $(this).attr("src", "/wiki/res" + $(this).attr("src"));
    });
    $("video source[src^='/']").each(function() {
        $(this).attr("src", "/wiki/res" + $(this).attr("src"));
    });

    /* rewrite wiki-lokal images */
    $("img[src^='/']").each(function() {
        $(this).attr("src", wikiPrefix + $(this).attr("src"));
    });

    /* rewrite internal links */
    $("a[href^='/doku.php/']").each(function() {
        $(this).attr("href", proxyPrefix + $(this).attr("href").substr("/doku.php".length));
    });
    $("a[href^='/lib/exe/']").each(function() {
        $(this).attr("href", "/wiki/res" + $(this).attr("href"));
    });

    /* rewrite post requests */
    $("form[action^='/doku.php']").each(function() {
        $(this).attr("action", proxyPrefix + $(this).attr("action").substr("/doku.php".length));
    });

    /* remove start logo */
    $("#dokuwiki__header div.headings.group h1 a img").remove();

    /* scripts */
    $("head script").each(function() {
        var $script = $(this);
        if( $script.attr("src") )
            $script.attr("src", $script.attr("src").replace(/^\/lib\//g, "/wiki/res/lib/") );
    });

    return $;
}


function mangleWiki( path, html ) {

    var $ = mangleCommon( html );

    /* get header info, then remove header */
    var title = $("title").text();

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
            if( resUrl.indexOf( "css.php?t=dokuwiki" ) > 0 ) {
                https.get( resUrl, function( httpRes ) {
                    /* consume and mangle */
                    var cssContent = "";

                    _.each( httpRes.headers, function( value, name ) {
                        if( name.toLowerCase() != "content-length" )
                            res.setHeader( name, value );
                    });

                    httpRes.on("data", function( data ) { cssContent += data; } );
                    httpRes.on("end", function() {
                        /* mangle CSS */
                        cssContent = cssContent
                        /* remove body-styles */
                        .replace( /(body{[^}]+})/g, function( m ) {
                            return "";
                        })
                        /* redirect lib request */
                        .replace( /url\(\/lib\//g, "url(/wiki/res/lib/" )
                        /* prefix style in #dokuwiki__site */
                        .replace( /([{}])([-_>.,:# \[\]a-zA-Z0-9]+){/g, function( m, prefix, name ) {
                            if( m.indexOf( "#dokuwiki__site" ) >= 0 )
                                /* skip, already cxontained */
                                return m;
                            else
                                /* prefix (also prefix comma-separated list */
                                return prefix + "\n#dokuwiki__site " + name.replace(/,/g, ",#dokuwiki__site ") + "{";
                        });

                        res.end( cssContent );
                    });
                });
            }
            else if( resUrl.indexOf( "/lib/exe/js.php?t=dokuwiki&tseed=" ) >= 0 ) {
                https.get( resUrl, function( httpRes ) {
                    /* consume and mangle */
                    var jsContent = "";

                    _.each( httpRes.headers, function( value, name ) {
                        if( name.toLowerCase() != "content-length" )
                            res.setHeader( name, value );
                    });

                    httpRes.on("data", function( data ) { jsContent += data; } );
                    httpRes.on("end", function() {
                        /* mangle JS */
                        jsContent = jsContent.replace( /DOKU_BASE='\/';/g, "DOKU_BASE='/wiki/res/';" );

                        res.end( jsContent );
                    });
                });
            }
            else if( resUrl.indexOf( "mediamanager.php" ) >= 0 ) {
                console.log( "MEDIAMNGR" );
                https.get( resUrl, function( httpRes ) {
                    /* consume and mangle */
                    var htmlContent = "";

                    _.each( httpRes.headers, function( value, name ) {
                        if( name.toLowerCase() != "content-length" )
                            res.setHeader( name, value );
                    });

                    httpRes.on("data", function( data ) { htmlContent += data; } );
                    httpRes.on("end", function() {

                        /* mangle HTML */
                        var $ = mangleCommon( htmlContent );

                        $("head link[rel='stylesheet']").each( function() {
                            var $link = $(this);
                            $link.attr( "href", "/wiki/res" + $link.attr("href") );
                        });

                        $("body").attr("id", "dokuwiki__site");

                        res.end( $.html() );
                    });
                });
            }
            else {
                /* proxy the request 1:1 */
                var reqOpts = _.extend({},
                    url.parse( resUrl ), {
                    headers: req.headers,
                    host: wikiHost,
                    method: req.method
                });
                reqOpts.headers.host = wikiHost;

                var httpReq = https.request( reqOpts, (httpRes) => {
                    res.statusCode = httpRes.statusCode;
                    _.each( httpRes.headers, ( value, name ) => {
                        res.setHeader( name, value );
                    });

                    httpRes.pipe( res );
                });
                httpReq.on("error", ( err ) => { next( err ); });
                httpReq.end();
            }
        });

        /* render logged in user */
        k.router.all("/*", function( req, res, next ) {
            var wikiPath = url.parse( req.url ).path;
            if( wikiPath == "/" )
                wikiPath = "/start";
            console.log( wikiPath, req.method );

            function performRequest( opts ) {
                opts = opts || {};
                var reqOpts = {
                    hostname: wikiHost,
                    path: "/doku.php" + (opts.path || wikiPath),
                    port: 443,
                    method: opts.method || req.method,
                    headers: _.extend( {
                        host: wikiHost
                    },_.omit( _.pick( req.headers,
                        "accept",
                        "accept-encoding",
                        "accept-language",
                        "cache-control",
                        "cookie",
                        "content-length",
                        "content-type",
                        "user-agent"
                    ), opts.omittedHeaders ),
                    opts.extendHeaders )
                };

                var httpReq = https.request( reqOpts, ( httpRes ) => {
                    var httpContent = "";
                    httpRes.on( "data", function( data ) { httpContent += data; });
                    httpRes.on( "end", function() {
                        var setCookie = opts.setCookie || httpRes.headers["set-cookie"];

                        if( httpRes.statusCode == 302 )
                        {
                            /* handle redirect */
                            var location = httpRes.headers.location;
                            location = url.parse( location ).path.substr( "/doku.php".length );
                            performRequest( _.extend( _.omit( opts, "body" ), {
                                omittedHeaders: ["content-length", "content-type"],
                                method: "GET",
                                setCookie: setCookie,
                                extendHeaders: {
                                    cookie: setCookie.join( ";" ) + ";" + req.headers.cookie
                                },
                                path: location
                            }));
                        }
                        else
                        {
                            /* send wiki */
                            if( setCookie )
                                res.setHeader( "set-cookie", setCookie );
                            var wiki = mangleWiki( wikiPath, httpContent );
                            renderVals( req, res, next, "wiki", { wiki, title: wiki.title } );
                        }
                    });
                });

                httpReq.on("error", function(err) {
                    console.log( err );
                    k.err.renderHttpStatus( req, res, 502 );
                });

                if( opts.body )
                    httpReq.write( opts.body );

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
