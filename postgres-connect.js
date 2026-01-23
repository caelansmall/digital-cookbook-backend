const { Pool } = require('pg');
require('dotenv').config();

const poolPostgres = new Pool({
    user: process.env.COOKBOOK_DB_USER,
    password: process.env.COOKBOOK_DB_USER_PW,
    host: process.env.COOKBOOK_DB,
    port: process.env.COOKBOOK_DB_PORT,
    database: process.env.DATABASE_NAME
});

poolPostgres.connect(err => {
    if(err) {
        console.error('Database connection error',err.stack);
    } else {
        console.log('Connected to the database');
    }
});

module.exports = {
    psgres: (text, params) => poolPostgres.query(text, params),
};