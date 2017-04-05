module.exports = {
    setup: function _setup( k ) {
        var db = k.getDb();

        var users =  k.crud.sql( db, { table: "users",     key: "id", foreignName: "name",
            wheres: {
                "name": { where: "`name`=?" }
            }
        } );

        return {
            users:          users
        };
    }
}
