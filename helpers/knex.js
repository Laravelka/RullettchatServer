/**
 * @type {Knex}
 */
const knex = require('knex')({
    client: process.env.DB_DRIVER,
    version: process.env.DB_VERSION,
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    },
    pool: { min: 0, max: 10 }
});

// knex.migrate.latest();

module.exports = knex;