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

        var articles =  k.crud.sql( db, { table: "articles",     key: "id", foreignName: "title",
            selectListQuery: { sql: "SELECT `articles`.`id`, `users`.`id` AS `user`, `users`.`name` AS `userName`, `articles`.`title`"
                + "FROM `articles` INNER JOIN `users` ON `articles`.`user`=`users`.`id`"
                + "ORDER BY `users`.`name`, `articles`.`title`"
            },
            foreignBoldName: "userName",
            foreignNameSeparator: " / ",
            foreignKeys: {
                user:       { crud: users },
                category:   { crud: categories }
            }
        } );

        return {
            articles:       articles,
            categories:     categories,
            navigation:     navigation,
            users:          users
        };
    }
}
