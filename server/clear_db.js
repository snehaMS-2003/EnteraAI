const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'entera',
  password: 'admin',
  port: 5433
});

async function clearData() {
  try {
    await client.connect();
    console.log('Connected to database...');

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const tables = result.rows.map(row => row.table_name);
    
    if (tables.length > 0) {
      const truncateQuery = `TRUNCATE TABLE ${tables.join(', ')} CASCADE;`;
      console.log(`Executing: ${truncateQuery}`);
      await client.query(truncateQuery);
      console.log('All tables successfully truncated (all data removed).');
    } else {
      console.log('No tables found to truncate.');
    }
    
  } catch (err) {
    console.error('Error clearing data:', err);
  } finally {
    await client.end();
  }
}

clearData();
