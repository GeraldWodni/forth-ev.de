// manage phozos
// (c)copyright 2017 by Gerald Wodni <gerald.wodni@gmail.com>

module.exports = {
    setup: function( k ) {
        var kData = k.getData();

        k.crud.presenter( k, kData.albums, {
            
            title: "Albums",
            path: "/admin/albums",

            scripts: ["/js/ace-min/ace.js","/js/articles.js"],

            fields: {
                id:         { name: "id",           filter: "id",   source: "requestman"                    },
                title:      { text: "Title",        type: "text",   attributes: { required: true }          },
                folder:     { text: "Folder",       type: "folder", attributes: { required: true }, folderOpts: {
                    root: "/images",
                    prefix: "/images",
                    hidePrefix: true
                }},
                intro:      { text: "Intro",        type: "textarea"                                        },
                body:       { text: "=Lange Beschreibung",    type: "textarea"                              }
            }
        });
    }
};
