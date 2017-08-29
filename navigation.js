// manage navigation
// (c)copyright 2017 by Gerald Wodni <gerald.wodni@gmail.com>

module.exports = {
    setup: function( k ) {
        var kData = k.getData();

        k.crud.presenter( k, kData.navigation, {
            
            title: "Navigation",
            path: "/admin/navigation",

            fields: {
                id:         { name: "id",           filter: "id",   source: "requestman"                    },
                name:       { text: "Name",         type: "text",   attributes: { required: true }          },
                priority:   { text: "Priority",     type: "number", filter: "decimal"                       },
                link:       { text: "Link",         type: "text",   filter: "link",   attributes: { required: true } },
                icon:       { text: "Icon",         type: "text",   filter: "link"                          },
                class:      { text: "CSS-Class",    type: "text"                                            },
                position:   { text: "Position",     type: "enum", keys: [ "top", "bottom" ]                 },
                category:   { text: "Category",     type: "foreign"                                         },
                file:       { text: "File",         type: "text"                                            }
            }
        });
    }
};
