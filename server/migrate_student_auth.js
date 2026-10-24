const { getDB } = require('./db');

async function migrateStudentAuth() {
  const db = getDB();
  console.log('Running safe schema migration for Student Portal Authentication...');

  // 1. Add student_id to users table
  await db.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE SET NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON users (student_id) WHERE student_id IS NOT NULL;
  `);

  // 2. Add user_id, account_status, and verified_at to students table
  await db.query(`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'unregistered';
    ALTER TABLE students ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id) WHERE user_id IS NOT NULL;
  `);

  console.log('Verifying columns in users and students...');
  const userCols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'student_id';
  `);
  console.log('Users student_id column:', userCols.rows);

  const studentCols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name IN ('user_id', 'account_status', 'verified_at');
  `);
  console.log('Students auth columns:', studentCols.rows);

  console.log('Migration completed successfully!');
}

if (require.main === module) {
  migrateStudentAuth()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateStudentAuth;
