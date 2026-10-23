# Entera.ai — Supabase PostgreSQL Migration Plan (Step 2)

This guide provides a secure, non-destructive procedure for provisioning, migrating, and verifying the **Supabase PostgreSQL** database for the **Entera.ai** production deployment.

---

## 1. Current Database Assessment Findings

### Current Database Setup (Confirmed)
- **Database Engine:** PostgreSQL (running locally via TCP socket).
- **Host:** `localhost` (Port `5432`).
- **Database Name:** `entera`.
- **Client Driver:** `pg` (v8.23.0) via connection pooling (`new Pool(...)`).
- **Data Status:** The local database currently contains existing records, including:
  - System Administrator account (`admin@gmail.com`).
  - Active Organizations (e.g. Org ID `7` — *TechCorp Solutions*).
  - Platform users with various roles (`sys_admin`, `org_admin`, `app_admin`, `designer`, `user`).
  - Applications (e.g. App ID `5` — *Student Management System*), dynamic schemas, and runtime records (`students`).
  - Built-in templates (32 industry templates) and modules (17 core modules).

---

## 2. Supabase Compatibility Analysis

### Schema Compatibility
The database schema in [server/db.js](file:///c:/Users/sneha/Downloads/Entera_Project/server/db.js) and [server/migrate.js](file:///c:/Users/sneha/Downloads/Entera_Project/server/migrate.js) is **100% compatible** with Supabase PostgreSQL:
- **Data Types:** Uses native PostgreSQL types (`SERIAL`, `INTEGER`, `VARCHAR`, `TEXT`, `BOOLEAN`, `TIMESTAMP`, `JSONB`).
- **Constraints & Foreign Keys:** Standard `REFERENCES ... ON DELETE CASCADE` and unique constraints.
- **Partial Indexes:** Supported natively (e.g., `idx_one_active_app_per_org ON applications (organization_id) WHERE archived = false`).
- **Security:** Passwords are fully hashed via `bcryptjs` (cost factor 10). Zero plaintext passwords are saved in database tables.

### Idempotency & Seed Logic Safeguard Analysis
1. **Structural Safety:** All table, column, and index creation statements use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS`. Running the migration multiple times will not drop or alter existing tables.
2. **Data Seed Safeguards:**
   - Templates and modules are only inserted if `SELECT COUNT(*) FROM ...` returns `0`.
   - Default Administrator is only created if `SELECT COUNT(*) FROM users WHERE role = 'sys_admin'` returns `0`.
   - **Important Constraint Safeguard:** Lines in `server/db.js` attempt to seed test users (`John` and `Tom`) assigned to `organization_id = 7`. On a completely blank database where Organization 7 does not yet exist, a foreign key constraint violation would occur if inserting users before the organization exists.
   - **Recommended Approach:** Exporting the existing local database via `pg_dump` and importing it into Supabase guarantees that all foreign keys, organizations, applications, and user accounts are migrated in perfect topological order.

---

## 3. Supabase Project Setup (Manual Steps)

Follow these manual steps in your browser:

1. Log in to [Supabase](https://supabase.com/).
2. Click **"New Project"**.
3. Choose your organization, assign a project name (e.g. `entera-ai-prod`), and select a hosting region closest to your users or Render backend (e.g. `US East`, `EU Frankfurt`, etc.).
4. Enter a strong database password and **save it in your password manager**.
5. Once project provisioning completes (~2 minutes), navigate to:
   - **Project Settings** (gear icon) -> **Database** -> **Connection string**.
6. Select **URI** mode:
   - **Session Pooler (Recommended for Render):**
     ```text
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```
   - **Direct Connection (Recommended for Migration CLI):**
     ```text
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```

---

## 4. Required Environment Variables (Names Only)

When connecting the backend to Supabase, configure these variables in the Render dashboard (and locally when testing):

| Variable Name | Value / Placeholder | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres.[PROJECT-REF]:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres` | Full connection URI to Supabase |
| `DATABASE_SSL` | `true` | **Mandatory:** Instructs `server/db.js` to enable SSL rejection bypass (`rejectUnauthorized: false`) |
| `NODE_ENV` | `production` | Enables production security and error handling |

> [!CAUTION]
> Cloud PostgreSQL providers like Supabase **require SSL encryption**. Failure to set `DATABASE_SSL=true` will result in connection rejection (`SSL connection required`).

---

## 5. Local Database Backup Procedure (Zero Data Loss)

Before performing any migration, create a timestamped backup of the local PostgreSQL database:

### Command (Run in local PowerShell or Bash):
```powershell
# Create timestamped SQL dump of local database
pg_dump -h localhost -p 5432 -U postgres -d entera -F p -b -v -f "entera_backup_local.sql"
```

*Notes:*
- If prompted for a password, enter your local PostgreSQL password.
- `-F p`: Plain text SQL script (human-readable and easily inspected).
- `-b`: Includes large objects.
- `-v`: Verbose output to track progress.

---

## 6. Migration Execution Options

### Option A: Complete Data Migration (Recommended)
*Preserves all existing organizations, users, applications, schemas, runtime student records, and configurations.*

#### Step 1: Export data cleanly
```powershell
# Export schema + data
pg_dump -h localhost -p 5432 -U postgres -d entera --clean --if-exists --no-owner --no-privileges -f "entera_supabase_import.sql"
```

#### Step 2: Import into Supabase
Run `psql` using your Supabase Direct connection string:
```powershell
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f "entera_supabase_import.sql"
```

#### Step 3: Run verification migration
Execute `server/migrate.js` to verify all 15 tables, indexes, and constraints:
```powershell
$env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
$env:DATABASE_SSL="true"
node server/migrate.js
```

---

### Option B: Fresh Production Schema & Initial Seed
*If you prefer starting with a clean database containing only built-in templates, modules, and the System Administrator.*

#### Step 1: Run migration script directly on Supabase
```powershell
$env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
$env:DATABASE_SSL="true"
$env:INITIAL_ADMIN_EMAIL="admin@gmail.com"
$env:INITIAL_ADMIN_PASSWORD="<YOUR-STRONG-ADMIN-PASSWORD>"
node server/migrate.js
```

---

## 7. Migration Verification Queries

Run the following queries in the **Supabase SQL Editor** to verify the database:

### 1. Verify All 15 Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```
*Expected Tables:*
- `apis`
- `application_entities`
- `application_modules`
- `application_navigation`
- `application_pages`
- `applications`
- `database_schemas`
- `deployments`
- `designer_applications`
- `modules`
- `organizations`
- `password_reset_tokens`
- `students`
- `templates`
- `users`

### 2. Verify Table Row Counts
```sql
SELECT 'organizations' AS table_name, COUNT(*) AS count FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'applications', COUNT(*) FROM applications
UNION ALL
SELECT 'templates', COUNT(*) FROM templates
UNION ALL
SELECT 'modules', COUNT(*) FROM modules;
```

### 3. Verify Constraints & Indexes
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' AND indexname IN (
  'idx_one_active_app_per_org',
  'idx_users_lower_username',
  'idx_password_reset_token_hash'
);
```

---

## 8. Backend Connection Verification Script

To test the backend's ability to communicate with Supabase before configuring Render, execute this non-destructive one-line test:

```powershell
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); pool.query('SELECT current_database(), current_user, version();').then(r => { console.log('Successfully connected to Supabase PostgreSQL:'); console.log(r.rows[0]); pool.end(); }).catch(e => { console.error('Connection failed:', e.message); process.exit(1); });"
```

---

## 9. Rollback Plan

If any issue occurs during the Supabase migration:

1. **Local Database Safety:** The local PostgreSQL database is completely unaffected because no write operations are performed against it.
2. **Supabase Reset:** In the Supabase SQL Editor, you can reset the public schema cleanly with:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```
3. **Backend Recovery:** The Render backend can point back to any functional PostgreSQL database simply by updating the `DATABASE_URL` environment variable. Zero code deployment is required to change databases.
