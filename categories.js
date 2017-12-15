// manage categories
// (c)copyright 2017 by Gerald Wodni <gerald.wodni@gmail.com>

module.exports = {
    setup: function( k ) {
        var kData = k.getData();

        k.crud.presenter( k, kData.categories, {
            
            title: "Categories",
            path: "/admin/categories",

            fields: {
                id:         { name: "id",           filter: "id",   source: "requestman"                    },
                //oid:        { text: "=Alte ID (Importrestl, bitte nicht ändern)",    type: "text"           },
                name:       { text: "=Name",        type: "text",   attributes: { required: true }          },
                image:      { text: "=Bild",        type: "image"                                           },
                newsCount:  { text: "=Newseinträge",type: "number", attributes: { min: 0, max: 100, step: 1 } }
            },
        });
    }
};
