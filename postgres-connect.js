const { Pool } = require('pg');

const poolPostgres = new Pool({
    user: process.env.COOKBOOK_DB_USER,
    password: process.env.COOKBOOK_DB_PW,
    host: process.env.COOKBOOK_DB,
    port: process.env.COOKBOOK_DB_PORT,
    database: process.env.DATABASE_NAME
});

module.exports = {
    psgres: (text, params) => poolPostgres.query(text, params),
};