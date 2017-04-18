module.exports = {
    setup: function _setup( k ) {
        var db = k.getDb();

        var categories =  k.crud.sql( db, { table: "categories",     key: "id", foreignName: "name",
            wheres: {
                "name": { where: "`name`=?" }
            }
        } );

        var users =  k.crud.sql( db, { table: "users",     key: "id", foreignName: "name",
            wheres: {
                "name": { where: "`name`=?" }
            }
        } );

        return {
            categories:     categories,
            users:          users
        };
    }
}
