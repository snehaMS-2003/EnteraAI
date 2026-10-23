const { getDB } = require('./db');

async function migrateStudents() {
  const db = getDB();
  console.log('Running safe schema expansion for students table...');

  await db.query(`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_number VARCHAR(50);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS class_grade VARCHAR(50);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS section VARCHAR(20);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_date DATE;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_students_app_adm_no ON students (application_id, admission_number) WHERE admission_number IS NOT NULL;
  `);

  // Backfill class_grade from course if null
  await db.query(`
    UPDATE students 
    SET class_grade = course 
    WHERE class_grade IS NULL AND course IS NOT NULL;
  `);

  // Ensure existing students have an admission number if null
  await db.query(`
    UPDATE students
    SET admission_number = 'ADM-' || LPAD(id::text, 4, '0')
    WHERE admission_number IS NULL;
  `);

  const cols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'students'
    ORDER BY ordinal_position
  `);
  console.log('Updated columns:', cols.rows.map(c => c.column_name));

  const sample = await db.query('SELECT id, name, admission_number, class_grade, status FROM students WHERE application_id = 5');
  console.log('Preserved students in App 5:', sample.rows);

  console.log('Migration complete successfully!');
}

if (require.main === module) {
  migrateStudents()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateStudents;
