// package upload module
// (c)copyright 2015 by Gerald Wodni <gerald.wodni@gmail.com>
// Note: as 'package' is a reserved keyword, we will be using the name 'packet' in javascript scope
"use strict";

var _       = require('underscore');

module.exports = {
    setup: function( k ) {

        k.router.get("/", function( req, res ) {
            k.jade.render( req, res, "profile" );
        });
    }
};
