// manage articles
// (c)copyright 2017 by Gerald Wodni <gerald.wodni@gmail.com>

module.exports = {
    setup: function( k ) {
        var kData = k.getData();

        k.crud.presenter( k, kData.articles, {
            
            title: "Articles",
            path: "/admin/articles",

            scripts: ["/js/ace-min/ace.js","/js/articles.js"],

            fields: {
                id:         { name: "id",           filter: "id",   source: "requestman"                    },
                //oid:        { text: "=Alte ID (Importrestl, bitte nicht ändern)",    type: "text"         },
                user:       { text: "User",         type: "foreign"                                         },
                title:      { text: "Title",        type: "text",   attributes: { required: true }          },
                display:    { text: "Display",      type: "checkbox"                                        },
                type:       { text: "Type",         type: "enum",   keys: ["markdown", "html", "plaintext"] },
                category:   { text: "Category",     type: "foreign"                                         },
                hot:        { text: "=Hot - Ganz oben anzeigen (z.B. für Tagungen)", type: "checkbox"       },
                frontPage:  { text: "=Startseite - Nicht nur in der Kategorie, sondern auch auf der Startseite anzeigen", type: "checkbox" },
                reveal:     { text: "=Aufdecken (bis zum Datum unsichtbar)", type: "date"                   },
                expires:    { text: "=Ablaufdatum (wandert ins Archiv)",    type: "date"                    },
                intro:      { text: "Intro",        type: "textarea"                                        },
                body:       { text: "=Körper - optional, ausklappbar",    type: "textarea"                            }
            }
        });
    }
};
