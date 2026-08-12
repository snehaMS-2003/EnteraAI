require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { initDB, getDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database Table
initDB().catch(err => {
  console.warn('PostgreSQL DB initialization failed. Server will continue running:', err.message);
});

// Root endpoint: redirect browser requests to frontend on 5173, return JSON for API clients
app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ message: 'Entera API Server is running', status: 'OK' });
  }
  res.redirect('http://localhost:5173');
});

app.post('/api/register', async (req, res) => {
  try {
    const {
      name,
      email,
      adminName,
      phone,
      industry,
      industrySpecific,
      address,
      city,
      state,
      county,
      district,
      pincode,
      website,
      password
    } = req.body;

    if (!name || !email || !adminName || !password) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    const pool = getDB();

    // Check if email already exists in organizations or users
    const existingOrg = await pool.query('SELECT id FROM organizations WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingOrg.rows.length > 0) {
      return res.status(400).json({ error: 'An organization with this email address already exists' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'A user account with this email address already exists' });
    }

    // Securely hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Transaction for atomic multi-table insert
    const client = await pool.connect();
    let orgId;
    try {
      await client.query('BEGIN');

      const insertOrgQuery = `
        INSERT INTO organizations (
          name, email, admin_name, phone, industry, industry_specific,
          address, city, state, county, district, pincode, website, password_hash
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING id
      `;

      const orgValues = [
        name, email, adminName, phone, industry, industrySpecific || null,
        address, city, state, county, district, pincode, website || null, passwordHash
      ];

      const orgResult = await client.query(insertOrgQuery, orgValues);
      orgId = orgResult.rows[0].id;

      // Insert administrator account into users table
      const insertUserQuery = `
        INSERT INTO users (
          organization_id, name, email, password_hash, role
        ) VALUES (
          $1, $2, $3, $4, $5
        ) RETURNING id
      `;

      const userValues = [
        orgId, adminName, email, passwordHash, 'org_admin'
      ];

      await client.query(insertUserQuery, userValues);

      await client.query('COMMIT');
      console.log(`[SUCCESS] Registered Organization "${name}" (ID: ${orgId}) with admin email "${email}"`);
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
    
    res.status(201).json({
      message: 'Organization registered successfully',
      id: orgId
    });
  } catch (error) {
    console.error('Registration Error Details:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = getDB();
    // Search in users table first
    let userQuery = await pool.query(
      `SELECT u.*, o.name as organization_name 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    
    let user = userQuery.rows[0];

    // Fallback search in organizations table
    if (!user) {
      const orgQuery = await pool.query('SELECT * FROM organizations WHERE LOWER(email) = LOWER($1)', [email]);
      if (orgQuery.rows.length > 0) {
        const org = orgQuery.rows[0];
        const role = org.email === 'admin@gmail.com' ? 'sys_admin' : 'org_admin';
        user = {
          id: org.id,
          organization_id: org.id,
          name: org.admin_name,
          email: org.email,
          password_hash: org.password_hash,
          role: role,
          organization_name: org.name
        };
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`[SUCCESS] User "${user.email}" logged in successfully as "${user.role}"`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        organizationName: user.organization_name
      }
    });
  } catch (error) {
    console.error('Login Error Details:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});



// GET Templates
app.get('/api/templates', async (req, res) => {
  try {
    const industry = req.query.industry;
    const pool = getDB();
    let result;
    if (industry) {
      result = await pool.query('SELECT * FROM templates WHERE industry = $1', [industry]);
    } else {
      result = await pool.query('SELECT * FROM templates');
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Modules
app.get('/api/modules', async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query('SELECT * FROM modules');
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch modules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Org-Scoped Applications API ────────────────────────────────────────────
// Auth middleware: reads org context from request header X-Org-Id + X-User-Id
// (set by the frontend after login). In production this would be a signed JWT.
function requireOrgAuth(req, res, next) {
  const orgId = parseInt(req.headers['x-org-id'], 10);
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  if (!orgId) {
    return res.status(401).json({ error: 'Unauthorized: missing organization context' });
  }
  req.orgId = orgId;
  req.userId = userId;
  req.userEmail = userEmail || 'unknown';
  next();
}

// GET /api/org/applications — list all non-archived apps for the authenticated org
app.get('/api/org/applications', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const { status, industry, search } = req.query;
    let conditions = ['organization_id = $1', 'archived = false'];
    const values = [req.orgId];
    let idx = 2;

    if (status && status !== 'all') {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (industry && industry !== 'all') {
      conditions.push(`LOWER(industry) = LOWER($${idx++})`);
      values.push(industry);
    }
    if (search) {
      conditions.push(`(LOWER(app_name) LIKE LOWER($${idx}) OR LOWER(app_description) LIKE LOWER($${idx}) OR LOWER(industry) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`);
      idx++;
    }

    const result = await pool.query(
      `SELECT * FROM applications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch org applications error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/orgadmin/stats — org dashboard stats
app.get('/api/orgadmin/stats', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, 
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
      FROM applications 
      WHERE organization_id = $1 AND archived = false
    `, [req.orgId]);
    
    const usersResult = await pool.query('SELECT COUNT(*) as designers FROM users WHERE organization_id = $1', [req.orgId]);

    res.json({
      totalApplications: parseInt(result.rows[0].total || 0),
      activeApplications: parseInt(result.rows[0].active || 0),
      draftApplications: parseInt(result.rows[0].draft || 0),
      designers: parseInt(usersResult.rows[0].designers || 0)
    });
  } catch (error) {
    console.error('Fetch orgadmin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/org/applications/:id — get single app (org-scoped)
app.get('/api/org/applications/:id', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query(
      'SELECT * FROM applications WHERE id = $1 AND organization_id = $2 AND archived = false',
      [req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get org application error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/org/applications — create a new app for the authenticated org
app.post('/api/org/applications', requireOrgAuth, async (req, res) => {
  try {
    const {
      app_name, app_description, industry, industry_template,
      business_modules, deployment_type, status
    } = req.body;

    if (!app_name) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    const pool = getDB();
    // Look up the org name for denormalized storage
    const orgResult = await pool.query('SELECT name FROM organizations WHERE id = $1', [req.orgId]);
    const orgName = orgResult.rows[0]?.name || null;

    const result = await pool.query(
      `INSERT INTO applications
         (app_name, app_description, organization, organization_id, industry, industry_template,
          business_modules, deployment_type, status, created_by, archived, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,NOW()) RETURNING *`,
      [
        app_name,
        app_description || null,
        orgName,
        req.orgId,
        industry || null,
        industry_template || null,
        business_modules || null,
        deployment_type || 'cloud',
        status || 'draft',
        req.userEmail,
      ]
    );

    console.log(`[SUCCESS] App "${app_name}" created by "${req.userEmail}" for org ${req.orgId}`);
    res.status(201).json({ message: 'Application created successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Create org application error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PUT /api/org/applications/:id — update app (org-scoped)
app.put('/api/org/applications/:id', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    // Verify ownership
    const owned = await pool.query(
      'SELECT id FROM applications WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.orgId]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const {
      app_name, app_description, industry, industry_template,
      business_modules, deployment_type, status
    } = req.body;

    const result = await pool.query(
      `UPDATE applications SET
         app_name = COALESCE($1, app_name),
         app_description = COALESCE($2, app_description),
         industry = COALESCE($3, industry),
         industry_template = COALESCE($4, industry_template),
         business_modules = COALESCE($5, business_modules),
         deployment_type = COALESCE($6, deployment_type),
         status = COALESCE($7, status),
         updated_at = NOW()
       WHERE id = $8 AND organization_id = $9 RETURNING *`,
      [
        app_name || null,
        app_description || null,
        industry || null,
        industry_template || null,
        business_modules || null,
        deployment_type || null,
        status || null,
        req.params.id,
        req.orgId,
      ]
    );

    res.json({ message: 'Application updated successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Update org application error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH /api/org/applications/:id/archive — soft-delete (archive) an app
app.patch('/api/org/applications/:id/archive', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query(
      `UPDATE applications SET archived = true, status = 'archived', updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [req.params.id, req.orgId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    console.log(`[SUCCESS] App ${req.params.id} archived by "${req.userEmail}" for org ${req.orgId}`);
    res.json({ message: 'Application archived successfully' });
  } catch (error) {
    console.error('Archive org application error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// POST Application (Create Step 1)
app.post('/api/applications', async (req, res) => {
  try {
    const {
      app_name,
      app_description,
      organization,
      organization_id,
      industry,
      industry_template,
      business_modules,
      deployment_type,
      status,
    } = req.body;

    if (!app_name) {
      return res.status(400).json({ error: 'Application name is required.' });
    }

    const orgId = organization_id || (typeof organization === 'number' ? organization : null);

    const pool = getDB();
    const result = await pool.query(
      `INSERT INTO applications
         (app_name, app_description, organization, organization_id, industry, industry_template,
          business_modules, deployment_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        app_name,
        app_description || null,
        typeof organization === 'string' ? organization : null,
        orgId || null,
        industry || null,
        industry_template || null,
        business_modules || null,
        deployment_type || 'cloud',
        status || 'draft',
      ]
    );

    res.status(201).json({
      message: 'Application saved successfully',
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT Application (Update Step)
app.put('/api/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      app_name,
      app_description,
      organization,
      organization_id,
      industry,
      industry_template,
      business_modules,
      deployment_type,
      status,
    } = req.body;

    const orgId = organization_id || (typeof organization === 'number' ? organization : null);

    const pool = getDB();
    const result = await pool.query(
      `UPDATE applications SET
         app_name = COALESCE($1, app_name),
         app_description = COALESCE($2, app_description),
         organization = COALESCE($3, organization),
         organization_id = COALESCE($4, organization_id),
         industry = COALESCE($5, industry),
         industry_template = COALESCE($6, industry_template),
         business_modules = COALESCE($7, business_modules),
         deployment_type = COALESCE($8, deployment_type),
         status = COALESCE($9, status)
       WHERE id = $10 RETURNING *`,
      [
        app_name,
        app_description,
        typeof organization === 'string' ? organization : null,
        orgId || null,
        industry,
        industry_template,
        business_modules,
        deployment_type,
        status,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application updated successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Generate Schema (Org-Scoped)
app.post('/api/org/applications/:id/schema', requireOrgAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { schema_data } = req.body;
    
    const pool = getDB();
    // Verify ownership
    const appCheck = await pool.query('SELECT id FROM applications WHERE id = $1 AND organization_id = $2', [id, req.orgId]);
    if (appCheck.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    const result = await pool.query(
      'INSERT INTO database_schemas (application_id, schema_data) VALUES ($1, $2) RETURNING id',
      [id, JSON.stringify(schema_data)]
    );
    
    res.status(201).json({ message: 'Schema saved', id: result.rows[0].id });
  } catch (error) {
    console.error('Schema generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Generate APIs (Org-Scoped)
app.post('/api/org/applications/:id/apis', requireOrgAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { api_data } = req.body;
    
    const pool = getDB();
    // Verify ownership
    const appCheck = await pool.query('SELECT id FROM applications WHERE id = $1 AND organization_id = $2', [id, req.orgId]);
    if (appCheck.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    const result = await pool.query(
      'INSERT INTO apis (application_id, api_data) VALUES ($1, $2) RETURNING id',
      [id, JSON.stringify(api_data)]
    );
    
    res.status(201).json({ message: 'APIs saved', id: result.rows[0].id });
  } catch (error) {
    console.error('API generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Save Modules (Org-Scoped)
app.post('/api/org/applications/:id/modules', requireOrgAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { modules } = req.body; // array of module_id strings
    
    const pool = getDB();
    // Verify ownership
    const appCheck = await pool.query('SELECT id FROM applications WHERE id = $1 AND organization_id = $2', [id, req.orgId]);
    if (appCheck.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    // Insert modules
    for (const modId of modules) {
      await pool.query(
        'INSERT INTO application_modules (application_id, module_id, is_enabled) VALUES ($1, $2, true)',
        [id, modId]
      );
    }
    
    res.status(201).json({ message: 'Modules saved successfully' });
  } catch (error) {
    console.error('Save modules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Deploy
app.post('/api/applications/:id/deploy', async (req, res) => {
  try {
    const { id } = req.params;
    const { deployment_type } = req.body;
    
    const pool = getDB();
    const deployment_url = `https://entera.cloud/app/${id}`;
    const result = await pool.query(
      'INSERT INTO deployments (application_id, deployment_type, status, deployment_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, deployment_type, 'success', deployment_url]
    );
    
    res.status(201).json({ message: 'Deployment successful', deployment: result.rows[0] });
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── SysAdmin APIs ────────────────────────────────────────────

function requireSysAdminAuth(req, res, next) {
  const role = req.headers['x-user-role'];
  if (role !== 'sys_admin') {
    return res.status(403).json({ error: 'Forbidden: System Administrator access required' });
  }
  next();
}

app.get('/api/sysadmin/stats', requireSysAdminAuth, async (req, res) => {
  try {
    const pool = getDB();
    const appsResult = await pool.query('SELECT COUNT(*) as count FROM applications');
    const orgsResult = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive FROM organizations");
    
    res.json({
      totalApplications: parseInt(appsResult.rows[0].count),
      totalOrganizations: parseInt(orgsResult.rows[0].total),
      activeOrganizations: parseInt(orgsResult.rows[0].active || 0),
      inactiveOrganizations: parseInt(orgsResult.rows[0].inactive || 0)
    });
  } catch (error) {
    console.error('Fetch sysadmin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/organizations', async (req, res) => {
  try {
    const role = req.headers['x-user-role'];
    const pool = getDB();
    
    if (role === 'sys_admin') {
      const result = await pool.query(`
        SELECT 
          o.id, o.name, o.email, o.admin_name, o.industry, o.created_at, o.status,
          (SELECT COUNT(*) FROM applications a WHERE a.organization_id = o.id) as applications_count,
          (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) as users_count
        FROM organizations o
        ORDER BY o.created_at DESC
      `);
      return res.json(result.rows);
    } else {
      const result = await pool.query('SELECT id, name FROM organizations ORDER BY name ASC');
      return res.json(result.rows);
    }
  } catch (error) {
    console.error('Fetch organizations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/organizations/:id', requireSysAdminAuth, async (req, res) => {
  try {
    const pool = getDB();
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM applications a WHERE a.organization_id = o.id) as applications_count,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) as users_count
      FROM organizations o
      WHERE o.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/organizations/:id/status', requireSysAdminAuth, async (req, res) => {
  try {
    const pool = getDB();
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await pool.query(
      'UPDATE organizations SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update organization status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
