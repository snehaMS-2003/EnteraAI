const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'entera',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: process.env.POSTGRES_PORT || 5432,
});

const createDatabaseIfNecessary = async () => {
  const tempPool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: process.env.POSTGRES_PORT || 5432,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await tempPool.connect();
    const dbName = process.env.POSTGRES_DB || 'entera';
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating it...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
    client.release();
  } catch (err) {
    console.error('Failed to connect to native PostgreSQL server. Please check credentials and ensure the service is running on port 5432.');
    throw err;
  } finally {
    await tempPool.end();
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        application_id INTEGER REFERENCES applications(id),
        module_id VARCHAR(100) REFERENCES modules(id),
        is_enabled BOOLEAN DEFAULT true,
        config JSONB
      );
    `);

    // Database Schemas Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS database_schemas (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id),
        schema_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // APIs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS apis (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id),
        api_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Deployments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id),
        deployment_type VARCHAR(50),
        status VARCHAR(50),
        deployment_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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

