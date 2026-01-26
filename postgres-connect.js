const { Pool } = require('pg');
require('dotenv').config();

const poolPostgres = new Pool({
    connectionString: process.env.CONNETION_STRING,
    ssl: {
        rejectUnauthorized: false
    }
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
