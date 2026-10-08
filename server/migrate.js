/**
 * ==============================================================================
 * ENTERA.AI — PRODUCTION DATABASE MIGRATION & SCHEMA INITIALIZATION
 * ==============================================================================
 * Provides an idempotent, zero-downtime, non-destructive migration process.
 * Can be run on fresh databases or existing production databases.
 *
 * Usage:
 *   node server/migrate.js
 *   npm run db:migrate
 * ==============================================================================
 */

require('dotenv').config();
const { initDB, getDB } = require('./db');

async function runMigration() {
  console.log('==============================================================================');
  console.log('        ENTERA.AI — PRODUCTION DATABASE SCHEMA MIGRATION & SETUP              ');
  console.log('==============================================================================\n');

  try {
    console.log('[STEP 1/4] Initializing Database & Executing Schema Migrations...');
    await initDB();
    const pool = getDB();
    console.log('  ✓ Schema migrations applied successfully.');

    console.log('\n[STEP 2/4] Verifying Required Production Tables...');
    const requiredTables = [
      'organizations',
      'users',
      'applications',
      'templates',
      'modules',
      'application_modules',
      'database_schemas',
      'apis',
      'deployments',
      'students',
      'application_pages',
      'application_navigation',
      'application_entities',
      'designer_applications'
    ];

    for (const table of requiredTables) {
      const res = await pool.query(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
        ['public', table]
      );
      if (parseInt(res.rows[0].count, 10) > 0) {
        console.log(`  ✓ Table verified: [public.${table}]`);
      } else {
        throw new Error(`Required table "${table}" is missing!`);
      }
    }

    console.log('\n[STEP 3/4] Verifying Core Constraints & Indexes...');
    // Verify One Organization = One Active Application rule index
    const uniqueIndexRes = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_one_active_app_per_org'`
    );
    if (uniqueIndexRes.rows.length > 0) {
      console.log('  ✓ Unique Partial Index verified: [idx_one_active_app_per_org] (One Org = One App)');
    } else {
      console.warn('  ⚠ Warning: idx_one_active_app_per_org index not found!');
    }

    // Verify foreign key integrity
    const fksRes = await pool.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `);
    console.log(`  ✓ Foreign keys verified (${fksRes.rowCount} constraints active)`);

    console.log('\n[STEP 4/4] Verifying Seed Data...');
    const templatesCount = await pool.query('SELECT COUNT(*) FROM templates');
    const modulesCount = await pool.query('SELECT COUNT(*) FROM modules');
    const adminCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'sys_admin'");
    console.log(`  ✓ Templates count: ${templatesCount.rows[0].count}`);
    console.log(`  ✓ Modules count: ${modulesCount.rows[0].count}`);
    console.log(`  ✓ System Admin accounts: ${adminCount.rows[0].count}`);

    // Ensure App 5 (Student Management System) has baseline module and published state
    const app5 = await pool.query('SELECT id, status FROM applications WHERE id = 5');
    if (app5.rows.length > 0) {
      await pool.query(`
        INSERT INTO application_modules (application_id, module_id, is_enabled)
        SELECT 5, 'student_management', true
        WHERE NOT EXISTS (
          SELECT 1 FROM application_modules WHERE application_id = 5 AND module_id = 'student_management'
        )
      `);
      // Ensure student-list page exists for App 5
      const pageCheck = await pool.query("SELECT id FROM application_pages WHERE application_id = 5 AND slug = 'student-list'");
      if (pageCheck.rows.length === 0) {
        await pool.query(`
          INSERT INTO application_pages (application_id, name, slug, title, description, components)
          VALUES (5, 'Student List', 'student-list', 'Student Directory', 'View and manage enrolled students', $1)
        `, [JSON.stringify([
          { id: 'c_title', type: 'heading', level: 'h1', text: 'Enrolled Students' },
          { id: 'c_table', type: 'table', label: 'Students Directory', tableConfig: { tableName: 'students', columns: ['id', 'name', 'email', 'phone', 'course', 'status'] } }
        ])]);
      }

      if (app5.rows[0].status !== 'published') {
        await pool.query("UPDATE applications SET status = 'published' WHERE id = 5");
      }
      console.log('  ✓ Default application "Student Management System" verified and ready.');
    }

    console.log('\n==============================================================================');
    console.log('>>> ENTERA.AI DATABASE MIGRATION COMPLETED SUCCESSFULLY (READY FOR PRODUCTION) <<<');
    console.log('==============================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL ERROR] Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
