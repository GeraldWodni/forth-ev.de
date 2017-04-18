module.exports = {
    setup: function _setup( k ) {
        var db = k.getDb();

        var categories =  k.crud.sql( db, { table: "categories",     key: "id", foreignName: "name",
            wheres: {
                "name": { where: "`name`=?" }
            }
        } );

        var navigation =  k.crud.sql( db, { table: "navigation",     key: "id", foreignName: "name",
            foreignKeys: {
                category:   { crud: categories }
            }
        } );

        var users =  k.crud.sql( db, { table: "users",     key: "id", foreignName: "name",
            wheres: {
                "name": { where: "`name`=?" }
            }
        } );

        return {
            categories:     categories,
            navigation:     navigation,
            users:          users
        };
    }
}
