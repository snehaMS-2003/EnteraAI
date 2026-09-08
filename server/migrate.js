const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'entera',
  password: 'password',
  port: 5432,
});

async function migrate() {
  const targetOrgId = 7;
  const orgsToDelete = [5, 8];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Update users
    console.log(`Reassigning users to org ${targetOrgId}...`);
    await client.query(
      `UPDATE users SET organization_id = $1 WHERE organization_id = ANY($2::int[])`,
      [targetOrgId, orgsToDelete]
    );

    // 2. Update applications
    console.log(`Reassigning applications to org ${targetOrgId}...`);
    await client.query(
      `UPDATE applications SET organization_id = $1 WHERE organization_id = ANY($2::int[])`,
      [targetOrgId, orgsToDelete]
    );

    // 3. Delete old organizations
    console.log(`Deleting old organizations...`);
    await client.query(
      `DELETE FROM organizations WHERE id = ANY($1::int[])`,
      [orgsToDelete]
    );

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
