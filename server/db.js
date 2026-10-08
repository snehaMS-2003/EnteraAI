const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.POSTGRES_USER || 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      database: process.env.POSTGRES_DB || 'entera',
      password: process.env.POSTGRES_PASSWORD || 'password',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    };

if (process.env.DATABASE_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

const createDatabaseIfNecessary = async () => {
  let tempPoolConfig;
  let targetDbName = process.env.POSTGRES_DB || 'entera';

  if (process.env.DATABASE_URL) {
    try {
      const parsedUrl = new URL(process.env.DATABASE_URL);
      if (parsedUrl.pathname && parsedUrl.pathname.length > 1) {
        targetDbName = parsedUrl.pathname.slice(1);
      }
      parsedUrl.pathname = '/postgres';
      tempPoolConfig = { connectionString: parsedUrl.toString(), connectionTimeoutMillis: 5000 };
    } catch {
      tempPoolConfig = { connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 };
    }
  } else {
    tempPoolConfig = {
      user: process.env.POSTGRES_USER || 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      database: 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      connectionTimeoutMillis: 5000,
    };
  }

  const tempPool = new Pool(tempPoolConfig);

  try {
    const client = await tempPool.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDbName]);
    if (res.rowCount === 0) {
      console.log(`Database "${targetDbName}" does not exist. Creating it...`);
      await client.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`Database "${targetDbName}" created successfully.`);
    } else {
      console.log(`Database "${targetDbName}" already exists.`);
    }
    client.release();
  } catch (err) {
    console.warn('Note: Could not check/create database via default postgres catalog, proceeding to target DB:', err.message);
  } finally {
    try {
      await tempPool.end();
    } catch {
      // ignore
    }
  }
};

const initDB = async () => {
  await createDatabaseIfNecessary();

  try {
    const client = await pool.connect();

    // Organizations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        industry VARCHAR(100),
        industry_specific VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        county VARCHAR(100),
        district VARCHAR(100),
        pincode VARCHAR(20),
        website TEXT,
        password_hash TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure status column exists for older organizations
    await client.query(`
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
    `);

    // Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'org_admin',
        status VARCHAR(50) DEFAULT 'active',
        last_active TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure status and last_active columns exist for older users
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_token_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;
    `);

    // Ensure sysadmin user role and org are correct
    await client.query(`
      UPDATE users 
      SET role = 'sys_admin', organization_id = NULL 
      WHERE LOWER(email) = 'admin@gmail.com';
    `);

    // Ensure at least one system administrator exists on fresh databases
    const sysAdminCount = await client.query("SELECT COUNT(*) FROM users WHERE role = 'sys_admin'");
    if (parseInt(sysAdminCount.rows[0].count, 10) === 0) {
      const defaultAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
      const defaultAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin@123';
      const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, status, created_at)
        VALUES ('System Administrator', $1, $2, 'sys_admin', 'active', CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO UPDATE SET role = 'sys_admin', status = 'active';
      `, [defaultAdminEmail, passwordHash]);
      console.log(`Initial System Administrator initialized (${defaultAdminEmail}).`);
    }

    // Ensure default test Designer exists for TechCorp Solutions (Org 7)
    const designerCheck = await client.query("SELECT id FROM users WHERE LOWER(email) = 'sneha123@gmail.com'");
    if (designerCheck.rows.length === 0) {
      const designerHash = await bcrypt.hash('password123', 10);
      const designerRes = await client.query(`
        INSERT INTO users (organization_id, name, email, password_hash, role, status, created_at)
        VALUES (7, 'sneha', 'sneha123@gmail.com', $1, 'designer', 'active', CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO UPDATE SET password_hash = $1, status = 'active', role = 'designer', organization_id = 7
        RETURNING id;
      `, [designerHash]);
      if (designerRes.rows.length > 0) {
        await client.query(`
          INSERT INTO designer_applications (designer_id, application_id)
          VALUES ($1, 5)
          ON CONFLICT DO NOTHING;
        `, [designerRes.rows[0].id]);
        console.log('Default Designer initialized (sneha123@gmail.com).');
      }
    }

    // Designer Applications Table (Many-to-Many mapping)
    await client.query(`
      CREATE TABLE IF NOT EXISTS designer_applications (
        designer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (designer_id, application_id)
      );
    `);

    // Applications Table (org-scoped)
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        app_name VARCHAR(255) NOT NULL,
        app_description TEXT,
        organization VARCHAR(255),
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        industry VARCHAR(100),
        industry_template VARCHAR(255),
        business_modules TEXT,
        deployment_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'draft',
        created_by VARCHAR(255),
        archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate existing applications table to add missing columns (idempotent)
    await client.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS created_by VARCHAR(255)`);
    await client.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE`);
    await client.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS published_version VARCHAR(50) DEFAULT '1.0'`);
    await client.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS published_at TIMESTAMP`);
    await client.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS published_config JSONB`);
    
    // Enforce business rule: One Organization = One Active Application
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_app_per_org 
        ON applications (organization_id) 
        WHERE archived = false;
      `);
    } catch (e) {
      console.warn('Could not create idx_one_active_app_per_org index:', e.message);
    }


    // Templates Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        industry VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        recommended_modules INTEGER DEFAULT 0
      );
    `);

    // Modules Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
      );
    `);

    // Application Modules Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_modules (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        module_id VARCHAR(100) REFERENCES modules(id),
        is_enabled BOOLEAN DEFAULT true,
        config JSONB
      );
    `);

    // Database Schemas Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS database_schemas (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        schema_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // APIs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS apis (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        api_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Deployments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        deployment_type VARCHAR(50) DEFAULT 'cloud',
        status VARCHAR(50) DEFAULT 'published',
        deployment_state VARCHAR(50) DEFAULT 'DEPLOYED',
        version VARCHAR(50) DEFAULT '1.0',
        deployment_url TEXT,
        config_snapshot JSONB,
        published_by VARCHAR(255),
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure columns exist on deployments table (idempotent)
    await client.query(`ALTER TABLE deployments ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0'`);
    await client.query(`ALTER TABLE deployments ADD COLUMN IF NOT EXISTS deployment_state VARCHAR(50) DEFAULT 'DEPLOYED'`);
    await client.query(`ALTER TABLE deployments ADD COLUMN IF NOT EXISTS deployment_url TEXT`);
    await client.query(`ALTER TABLE deployments ADD COLUMN IF NOT EXISTS config_snapshot JSONB`);
    await client.query(`ALTER TABLE deployments ADD COLUMN IF NOT EXISTS published_by VARCHAR(255)`);
    await client.query(`ALTER TABLE deployments ADD COLUMN IF NOT EXISTS published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE deployments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    // Application Pages Table (Application Builder)
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_pages (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        layout JSONB DEFAULT '{"columns": 12, "spacing": "normal"}'::jsonb,
        components JSONB DEFAULT '[]'::jsonb,
        order_index INTEGER DEFAULT 0,
        is_home BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_app_page_slug UNIQUE (application_id, slug)
      );
    `);

    // Application Navigation Table (Application Builder)
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_navigation (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE UNIQUE,
        nav_items JSONB DEFAULT '[]'::jsonb,
        settings JSONB DEFAULT '{"brandName": "", "style": "sidebar", "theme": "dark"}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Application Students Table (Runtime Data)
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        course VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Generic Application Entities Table (Dynamic Runtime Entities)
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_entities (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        entity_type VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_app_entities_lookup ON application_entities (application_id, entity_type);
      CREATE INDEX IF NOT EXISTS idx_users_org_id ON users (organization_id);
      CREATE INDEX IF NOT EXISTS idx_applications_org_id ON applications (organization_id);
      CREATE INDEX IF NOT EXISTS idx_students_app_id ON students (application_id);
      CREATE INDEX IF NOT EXISTS idx_students_org_id ON students (organization_id);
      CREATE INDEX IF NOT EXISTS idx_deployments_app_id ON deployments (application_id);
    `);

    // Seed Templates and Modules
    const templatesCount = await client.query('SELECT COUNT(*) FROM templates');
    if (parseInt(templatesCount.rows[0].count) === 0) {
      const templates = [
        ['Healthcare', 'Patient Management System', 'Manage patient records and appointments', 5],
        ['Healthcare', 'HIPAA Compliant Portal', 'Secure portal for sensitive data', 6],
        ['Healthcare', 'Telemedicine Platform', 'Remote consultation platform', 4],
        ['Healthcare', 'Clinical Trial Tracker', 'Track clinical trial data', 5],
        ['Finance', 'Banking Core System', 'Core banking functionalities', 6],
        ['Finance', 'Investment Portfolio', 'Manage and track investments', 4],
        ['Finance', 'Insurance Management', 'Manage insurance policies', 5],
        ['Finance', 'Loan Origination', 'Process and track loans', 5],
        ['Education', 'Learning Management System', 'Complete LMS for students and teachers', 7],
        ['Education', 'Student Portal', 'Portal for students', 4],
        ['Education', 'Online Examination', 'Conduct online exams', 4],
        ['Education', 'Academic ERP', 'Manage school administration', 8],
        ['Retail', 'B2C E-commerce', 'Online store and shopping cart', 6],
        ['Retail', 'POS System', 'Point of sale management', 4],
        ['Retail', 'Loyalty & Rewards', 'Manage customer loyalty programs', 3],
        ['Retail', 'Multi-store Management', 'Manage multiple physical stores', 6],
        ['Manufacturing', 'Production Planning', 'Plan and schedule production', 5],
        ['Manufacturing', 'Quality Control', 'Track quality metrics', 4],
        ['Manufacturing', 'MES System', 'Manufacturing execution system', 6],
        ['Manufacturing', 'Supply Chain', 'Manage supply chain', 5],
        ['Logistics', 'Fleet Management', 'Track and manage vehicles', 4],
        ['Logistics', 'Warehouse Management', 'Manage warehouse inventory', 5],
        ['Logistics', 'Last-Mile Delivery', 'Track deliveries to customers', 4],
        ['Logistics', 'Freight Management', 'Manage freight shipping', 5],
        ['Government', 'Citizen Service Portal', 'Portal for citizen services', 6],
        ['Government', 'e-Governance Suite', 'Suite for governance', 7],
        ['Government', 'Public Records System', 'Manage public records', 4],
        ['Government', 'Permit Management', 'Issue and track permits', 4],
        ['IT Services', 'ITSM Platform', 'IT service management system', 5],
        ['IT Services', 'DevOps Dashboard', 'Dashboard for DevOps metrics', 4],
        ['IT Services', 'Client Billing System', 'Bill clients for services', 4],
        ['IT Services', 'Project Tracker', 'Track project progress', 3]
      ];
      
      for (const t of templates) {
        await client.query('INSERT INTO templates (industry, name, description, recommended_modules) VALUES ($1, $2, $3, $4)', t);
      }
    }

    const modulesCount = await client.query('SELECT COUNT(*) FROM modules');
    if (parseInt(modulesCount.rows[0].count) === 0) {
      const modules = [
        ['user_management', 'User Management', 'Manage users, roles and permissions'],
        ['employee_management', 'Employee Management', 'Manage staff details and records'],
        ['customer_management', 'Customer Management', 'CRM capabilities for your business'],
        ['inventory_management', 'Inventory Management', 'Track stock levels and items'],
        ['sales_management', 'Sales Management', 'Manage sales pipelines and orders'],
        ['purchase_management', 'Purchase Management', 'Manage vendors and purchase orders'],
        ['finance_management', 'Finance Management', 'Basic accounting and finance tools'],
        ['payroll', 'Payroll', 'Manage employee salaries and payments'],
        ['hr_management', 'HR Management', 'Human resources features'],
        ['reports', 'Reports', 'Generate business reports and analytics'],
        ['notifications', 'Notifications', 'Email, SMS and push notifications'],
        ['appointment_management', 'Appointment Management', 'Schedule and manage appointments'],
        ['file_management', 'File Management', 'Upload and organize files'],
        ['dashboard', 'Dashboard', 'Customizable analytics dashboard'],
        ['order_management', 'Order Management', 'Process and fulfill orders'],
        ['product_management', 'Product Management', 'Manage product catalogs'],
        ['role_permission_management', 'Role & Permission Management', 'Granular access control']
      ];

      for (const m of modules) {
        await client.query('INSERT INTO modules (id, name, description) VALUES ($1, $2, $3)', m);
      }
    }

    client.release();
    console.log('PostgreSQL Database initialized and ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
};

const getDB = () => {
  return pool;
};

module.exports = {
  initDB,
  getDB,
};

