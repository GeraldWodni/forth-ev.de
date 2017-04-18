// manage navigation
// (c)copyright 2017 by Gerald Wodni <gerald.wodni@gmail.com>

module.exports = {
    setup: function( k ) {
        var kData = k.getData();

        k.crud.presenter( k, kData.navigation, {
            
            title: "Navigation",
            path: "/admin/navigation",

            fields: {
                id:         { name: "id",           filter: "id",   source: "requestData"                   },
                name:       { text: "Name",         type: "text",   filter: "id",   attributes: { required: true } },
                link:       { text: "Link",         type: "text"                                            },
                class:      { text: "CSS-Class",    type: "text"                                            },
                position:   { text: "Position",     type: "enum", keys: [ "top", "bottom" ]                 },
                category:   { text: "Category",     type: "foreign"                                         },
                file:       { text: "File",         type: "text"                                            }
            }
        });
    }
};
