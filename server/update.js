const { Pool } = require('pg'); 
const pool = new Pool({
  user: 'postgres', 
  host: 'localhost', 
  database: 'entera', 
  password: 'password', 
  port: 5433
}); 
const run = async () => { 
  try { 
    await pool.query(UPDATE organizations SET email='admin@gmail.com', password_hash='$2b$10$VwbbHZbUtxXcuxTFaHrjTeJiNLAwOPTnYr8P8i8hhxI36yq.MbQTy'); 
    await pool.query(UPDATE users SET email='admin@gmail.com', password_hash='$2b$10$VwbbHZbUtxXcuxTFaHrjTeJiNLAwOPTnYr8P8i8hhxI36yq.MbQTy'); 
    console.log('Updated successfully'); 
  } catch(e) { 
    console.error(e); 
  } finally { 
    pool.end(); 
  } 
}; 
run();
