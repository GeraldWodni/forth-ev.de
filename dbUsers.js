// manage database Users
// (c)copyright 2019 by Gerald Wodni <gerald.wodni@gmail.com>

module.exports = {
    setup: function( k ) {
        var kData = k.getData();

        k.crud.presenter( k, kData.users, {
            
            title: "DBUsers",
            path: "/admin/db-users",

            fields: {
                id:         { name: "id",           filter: "id",   source: "requestman"                    },
                //oid:        { text: "=Alte ID (Importrestl, bitte nicht ändern)",    type: "text"           },
                name:       { text: "Title",        type: "text",   attributes: { required: true }          },
                fullName:   { text: "Display",      type: "checkbox"                                        },
                email:      { text: "Type",         type: "text", filter: "email" },
                details:    { text: "Details",      type: "textarea"                            }
            }
        });
    }
};
