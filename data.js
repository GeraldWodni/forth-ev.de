module.exports = {
    setup: function _setup( k ) {
        var db = k.getDb();

        var categories =  k.crud.sql( db, { table: "categories",     key: "id", foreignName: "name",
            wheres: {
                "name": { where: "`name`=?" }
            }
        } );

        var navigation =  k.crud.sql( db, { table: "navigation",     key: "id", foreignName: "name",
            orderBy: "priority",
            foreignBoldName: "priority",
            foreignKeys: {
                category:   { crud: categories }
            },
            wheres: {
                "top": { where: "`position`='top' AND display" },
                "bottom": { where: "`position`='bottom' AND display" }
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
            },
            wheres: {
                "user": { where: "`user`=?" }
            }
        } );

        var albums =  k.crud.sql( db, { table: "albums",     key: "id", foreignName: "title",
        } );

        return {
            albums:         albums,
            articles:       articles,
            categories:     categories,
            navigation:     navigation,
            users:          users
        };
    }
}
