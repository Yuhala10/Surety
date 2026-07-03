const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  database: process.env.DATABASE_NAME || 'surety',
  password: process.env.DATABASE_PASSWORD || 'password',
  port: process.env.DATABASE_PORT || 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
