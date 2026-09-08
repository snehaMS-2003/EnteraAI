require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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

    // Check if an organization already exists (single organization limit)
    const orgCountRes = await pool.query('SELECT COUNT(*) FROM organizations');
    if (parseInt(orgCountRes.rows[0].count) >= 1) {
      return res.status(409).json({ error: 'Only one organization is allowed.' });
    }

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
      `SELECT u.*, o.name as organization_name, o.industry as organization_industry 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    
    let user = userQuery.rows[0];

    // Force sys_admin role for admin@gmail.com
    if (user && user.email === 'admin@gmail.com') {
      user.role = 'sys_admin';
    }

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
          organization_name: org.name,
          organization_industry: org.industry
        };
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending approval.' });
    }
    if (user.status === 'invited') {
      return res.status(403).json({ error: 'Your account is invited but not activated. Please accept your invitation first.' });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account is inactive. Contact your organization administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
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
        organizationName: user.organization_name,
        organizationIndustry: user.organization_industry
      }
    });
  } catch (error) {
    console.error('Login Error Details:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/invitations/:token
app.get('/api/invitations/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const pool = getDB();
    const userQuery = await pool.query(
      `SELECT u.name, u.email, u.role, o.name as organization_name, u.status, u.invitation_expires_at 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.invitation_token_hash = $1`,
      [tokenHash]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    const user = userQuery.rows[0];
    if (new Date(user.invitation_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    if (user.status !== 'invited' && user.status !== 'pending') {
       return res.status(400).json({ error: 'Invitation has already been accepted' });
    }

    res.json(user);
  } catch (error) {
    console.error('Verify invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/accept-invite
app.post('/api/accept-invite', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const pool = getDB();
    const userQuery = await pool.query(
      'SELECT id, status, invitation_expires_at FROM users WHERE invitation_token_hash = $1',
      [tokenHash]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation token' });
    }

    const user = userQuery.rows[0];
    
    if (new Date(user.invitation_expires_at) < new Date()) {
       return res.status(400).json({ error: 'Invitation has expired. Please contact your administrator.' });
    }

    if (user.status !== 'invited' && user.status !== 'pending') {
      return res.status(400).json({ error: 'This account has already been activated' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query(
      `UPDATE users SET password_hash = $1, status = 'active', invitation_token_hash = NULL, invitation_expires_at = NULL, accepted_at = CURRENT_TIMESTAMP, activated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({ message: 'Account activated successfully' });
  } catch (error) {
    console.error('Accept invite error:', error);
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

// Role-based auth middlewares
function requireSysAdmin(req, res, next) {
  // In a real app with JWTs, we'd verify the role from the token. 
  // Here we can check if the user is admin@gmail.com or fetch the user from DB.
  // For Phase 1, we expect frontend to only allow sys_admin to call these, but we can enforce it.
  const userEmail = req.headers['x-user-email'];
  if (userEmail !== 'admin@gmail.com') {
    return res.status(403).json({ error: 'Forbidden: requires sys_admin role' });
  }
  next();
}

async function requireOrgAdmin(req, res, next) {
  requireOrgAuth(req, res, async () => {
    try {
      const pool = require('./db').getDB();
      const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      if (userRes.rows.length === 0) {
        // Fallback: check if it's the org admin in organizations table
        const orgRes = await pool.query('SELECT email FROM organizations WHERE id = $1', [req.orgId]);
        if (orgRes.rows.length === 0 || orgRes.rows[0].email !== req.userEmail) {
          return res.status(403).json({ error: 'Forbidden: requires org_admin role' });
        }
      } else if (userRes.rows[0].role !== 'org_admin' && userRes.rows[0].role !== 'sys_admin') {
        return res.status(403).json({ error: 'Forbidden: requires org_admin role' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: 'Auth check failed' });
    }
  });
}

async function requireDesigner(req, res, next) {
  requireOrgAuth(req, res, async () => {
    try {
      const pool = require('./db').getDB();
      const userRes = await pool.query('SELECT role FROM users WHERE id = $1 AND status = $2', [req.userId, 'active']);
      if (userRes.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden: active user not found' });
      }
      const role = userRes.rows[0].role;
      if (role !== 'designer' && role !== 'lead_designer' && role !== 'org_admin' && role !== 'sys_admin') {
        return res.status(403).json({ error: 'Forbidden: requires designer role' });
      }
      req.userRole = role; // attach for downstream route logic
      next();
    } catch (err) {
      res.status(500).json({ error: 'Auth check failed' });
    }
  });
}

async function requireLeadDesigner(req, res, next) {
  requireOrgAuth(req, res, async () => {
    try {
      const pool = require('./db').getDB();
      const userRes = await pool.query('SELECT role FROM users WHERE id = $1 AND status = $2', [req.userId, 'active']);
      if (userRes.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden: active user not found' });
      }
      const role = userRes.rows[0].role;
      if (role !== 'lead_designer' && role !== 'org_admin' && role !== 'sys_admin') {
        return res.status(403).json({ error: 'Forbidden: requires lead_designer role' });
      }
      req.userRole = role;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Auth check failed' });
    }
  });
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

// GET /api/org/profile — get authenticated org details
app.get('/api/org/profile', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.orgId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch org profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orgadmin/stats — org dashboard stats
app.get('/api/orgadmin/stats', requireOrgAdmin, async (req, res) => {
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
    
    const usersResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users
      FROM users WHERE organization_id = $1
    `, [req.orgId]);

    res.json({
      totalApplications: parseInt(result.rows[0].total || 0),
      activeApplications: parseInt(result.rows[0].active || 0),
      draftApplications: parseInt(result.rows[0].draft || 0),
      totalUsers: parseInt(usersResult.rows[0].total_users || 0),
      activeUsers: parseInt(usersResult.rows[0].active_users || 0)
    });
  } catch (error) {
    console.error('Fetch orgadmin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orgadmin/activity — org dashboard timeline activity
app.get('/api/orgadmin/activity', requireOrgAdmin, async (req, res) => {
  try {
    const pool = getDB();
    const appsActivity = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM applications
      WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
    `, [req.orgId]);
    
    const usersActivity = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
    `, [req.orgId]);

    const timelineMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      timelineMap[ds] = { date: ds, apps: 0, users: 0 };
    }
    
    appsActivity.rows.forEach(r => {
      const ds = r.date.toISOString().split('T')[0];
      if (timelineMap[ds]) timelineMap[ds].apps = parseInt(r.count);
    });
    usersActivity.rows.forEach(r => {
      const ds = r.date.toISOString().split('T')[0];
      if (timelineMap[ds]) timelineMap[ds].users = parseInt(r.count);
    });

    res.json({ timeline: Object.values(timelineMap) });
  } catch (error) {
    console.error('Fetch orgadmin activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/designer/dashboard — designer dashboard stats
app.get('/api/designer/dashboard', requireDesigner, async (req, res) => {
  try {
    const pool = getDB();
    let result;
    
    if (req.userRole === 'lead_designer' || req.userRole === 'org_admin' || req.userRole === 'sys_admin') {
      // Lead Designer sees all apps in the org
      result = await pool.query(`
        SELECT 
          COUNT(*) as total, 
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, 
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
        FROM applications 
        WHERE organization_id = $1 AND archived = false
      `, [req.orgId]);
    } else {
      // Normal Designer sees ONLY assigned apps
      result = await pool.query(`
        SELECT 
          COUNT(*) as total, 
          SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) as active, 
          SUM(CASE WHEN a.status = 'draft' THEN 1 ELSE 0 END) as draft
        FROM applications a
        JOIN designer_applications da ON a.id = da.application_id
        WHERE a.organization_id = $1 AND da.designer_id = $2 AND a.archived = false
      `, [req.orgId, req.userId]);
    }

    res.json({
      totalApplications: parseInt(result.rows[0].total || 0),
      activeApplications: parseInt(result.rows[0].active || 0),
      draftApplications: parseInt(result.rows[0].draft || 0)
    });
  } catch (error) {
    console.error('Fetch designer dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/designer/applications — designer assigned apps list
app.get('/api/designer/applications', requireDesigner, async (req, res) => {
  try {
    const pool = getDB();
    let result;
    
    if (req.userRole === 'lead_designer' || req.userRole === 'org_admin' || req.userRole === 'sys_admin') {
      // Lead Designer sees all apps in the org
      result = await pool.query(`
        SELECT * FROM applications 
        WHERE organization_id = $1 AND archived = false 
        ORDER BY created_at DESC
      `, [req.orgId]);
    } else {
      // Normal Designer sees ONLY assigned apps
      result = await pool.query(`
        SELECT a.*, da.assigned_at FROM applications a
        JOIN designer_applications da ON a.id = da.application_id
        WHERE a.organization_id = $1 AND da.designer_id = $2 AND a.archived = false
        ORDER BY a.created_at DESC
      `, [req.orgId, req.userId]);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Fetch designer applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/designer/applications/:id — get single assigned app
app.get('/api/designer/applications/:id', requireDesigner, async (req, res) => {
  try {
    const pool = getDB();
    let result;
    
    if (req.userRole === 'lead_designer' || req.userRole === 'org_admin' || req.userRole === 'sys_admin') {
      result = await pool.query(
        'SELECT * FROM applications WHERE id = $1 AND organization_id = $2 AND archived = false',
        [req.params.id, req.orgId]
      );
    } else {
      result = await pool.query(`
        SELECT a.* FROM applications a
        JOIN designer_applications da ON a.id = da.application_id
        WHERE a.id = $1 AND a.organization_id = $2 AND da.designer_id = $3 AND a.archived = false
      `, [req.params.id, req.orgId, req.userId]);
    }

    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found or access denied' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch single designer application error:', error);
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
    
    // Check if the organization already has an application
    const appCountResult = await pool.query('SELECT COUNT(*) FROM applications WHERE organization_id = $1', [req.orgId]);
    if (parseInt(appCountResult.rows[0].count) >= 1) {
      return res.status(409).json({ error: 'Your organization already has an application. Only one application per organization is allowed.' });
    }
    
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

// DELETE /api/org/applications/:id — hard-delete an app
app.delete('/api/org/applications/:id', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    
    // Delete dependent records first to avoid foreign key constraint errors
    await pool.query('DELETE FROM application_modules WHERE application_id = $1', [req.params.id]);
    await pool.query('DELETE FROM database_schemas WHERE application_id = $1', [req.params.id]);
    await pool.query('DELETE FROM apis WHERE application_id = $1', [req.params.id]);
    await pool.query('DELETE FROM deployments WHERE application_id = $1', [req.params.id]);
    
    const result = await pool.query(
      'DELETE FROM applications WHERE id = $1 AND organization_id = $2 RETURNING *',
      [req.params.id, req.orgId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    console.log(`[SUCCESS] App ${req.params.id} deleted by "${req.userEmail}" for org ${req.orgId}`);
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete org application error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH /api/org/applications/:id/status — update app status
app.patch('/api/org/applications/:id/status', requireOrgAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const pool = getDB();
    const result = await pool.query(
      `UPDATE applications SET status = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 RETURNING *`,
      [status, req.params.id, req.orgId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ message: 'Application status updated successfully', application: result.rows[0] });
  } catch (error) {
    console.error('Update app status error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/org/applications/:id/users — get users assigned to app
app.get('/api/org/applications/:id/users', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    
    // Check application ownership
    const appCheck = await pool.query('SELECT id FROM applications WHERE id = $1 AND organization_id = $2', [req.params.id, req.orgId]);
    if (appCheck.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    // Get assigned users
    const assignedResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, da.assigned_at
      FROM users u
      JOIN designer_applications da ON u.id = da.designer_id
      WHERE da.application_id = $1 AND u.organization_id = $2
    `, [req.params.id, req.orgId]);

    // Get all users in org (to populate assignment dropdowns)
    const allUsersResult = await pool.query(`
      SELECT id, name, email, role, status 
      FROM users 
      WHERE organization_id = $1
    `, [req.orgId]);

    res.json({
      assigned: assignedResult.rows,
      allOrgUsers: allUsersResult.rows
    });
  } catch (error) {
    console.error('Fetch app users error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/org/applications/:id/users — assign user to app
app.post('/api/org/applications/:id/users', requireOrgAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const pool = getDB();
    
    // Verify app ownership
    const appCheck = await pool.query('SELECT id FROM applications WHERE id = $1 AND organization_id = $2', [req.params.id, req.orgId]);
    if (appCheck.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    
    // Verify user belongs to same org
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND organization_id = $2', [userId, req.orgId]);
    if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found in your organization' });

    await pool.query(
      'INSERT INTO designer_applications (designer_id, application_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, req.params.id]
    );
    
    res.status(201).json({ message: 'User assigned successfully' });
  } catch (error) {
    console.error('Assign user to app error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// DELETE /api/org/applications/:id/users/:userId — remove user from app
app.delete('/api/org/applications/:id/users/:userId', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    
    // Verify app ownership
    const appCheck = await pool.query('SELECT id FROM applications WHERE id = $1 AND organization_id = $2', [req.params.id, req.orgId]);
    if (appCheck.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    await pool.query(
      'DELETE FROM designer_applications WHERE designer_id = $1 AND application_id = $2',
      [req.params.userId, req.params.id]
    );
    
    res.json({ message: 'User removed from application' });
  } catch (error) {
    console.error('Remove user from app error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Org-Scoped Users API (Replaces Designers API) ─────────────────────────

// GET /api/org/users/stats
app.get('/api/org/users/stats', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, 
        SUM(CASE WHEN status IN ('pending', 'invited') THEN 1 ELSE 0 END) as pending
      FROM users 
      WHERE organization_id = $1
    `, [req.orgId]);
    
    // Total assigned applications count across all users
    const appsAssigned = await pool.query(`
      SELECT COUNT(DISTINCT application_id) as apps_assigned
      FROM designer_applications da
      JOIN users u ON da.designer_id = u.id
      WHERE u.organization_id = $1
    `, [req.orgId]);

    res.json({
      totalUsers: parseInt(result.rows[0].total || 0),
      activeUsers: parseInt(result.rows[0].active || 0),
      pendingInvitations: parseInt(result.rows[0].pending || 0),
      applicationsAssigned: parseInt(appsAssigned.rows[0].apps_assigned || 0)
    });
  } catch (error) {
    console.error('Fetch user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/org/users
app.get('/api/org/users', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.last_active, u.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', a.id, 'name', a.app_name)
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) as assigned_applications
      FROM users u
      LEFT JOIN designer_applications da ON u.id = da.designer_id
      LEFT JOIN applications a ON da.application_id = a.id
      WHERE u.organization_id = $1
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `, [req.orgId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/org/users
app.post('/api/org/users', requireOrgAuth, async (req, res) => {
  try {
    const { name, email, role, applications, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    
    const pool = getDB();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      
      const userRes = await client.query(
        `INSERT INTO users (organization_id, name, email, password_hash, role, status, activated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP) RETURNING id, name, email, role, status`,
        [req.orgId, name, email, password_hash, role || 'user']
      );
      
      const userId = userRes.rows[0].id;
      
      if (applications && applications.length > 0) {
        for (const appId of applications) {
          await client.query(
            `INSERT INTO designer_applications (designer_id, application_id) VALUES ($1, $2)`,
            [userId, appId]
          );
        }
      }
      
      await client.query('COMMIT');
      res.status(201).json(userRes.rows[0]);
    } catch (txError) {
      await client.query('ROLLBACK');
      if (txError.code === '23505') return res.status(400).json({ error: 'Email already exists' });
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/org/users/:id
app.patch('/api/org/users/:id', requireOrgAuth, async (req, res) => {
  try {
    const { name, role, status, applications } = req.body;
    const pool = getDB();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify ownership
      const userRes = await client.query('SELECT id FROM users WHERE id = $1 AND organization_id = $2', [req.params.id, req.orgId]);
      if (userRes.rowCount === 0) throw new Error('User not found');
      
      // Update user details
      const updateRes = await client.query(
        `UPDATE users SET 
           name = COALESCE($1, name), 
           role = COALESCE($2, role), 
           status = COALESCE($3, status)
         WHERE id = $4 RETURNING id, name, email, role, status, last_active`,
        [name, role, status, req.params.id]
      );
      
      // Update assigned applications if provided
      if (applications !== undefined) {
        await client.query('DELETE FROM designer_applications WHERE designer_id = $1', [req.params.id]);
        for (const appId of applications) {
          await client.query(
            'INSERT INTO designer_applications (designer_id, application_id) VALUES ($1, $2)',
            [req.params.id, appId]
          );
        }
      }
      
      await client.query('COMMIT');
      res.json(updateRes.rows[0]);
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update designer error:', error);
    res.status(error.message === 'User not found' ? 404 : 500).json({ error: error.message || 'Internal server error' });
  }
});

// DELETE /api/org/users/:id
app.delete('/api/org/users/:id', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query('DELETE FROM users WHERE id = $1 AND organization_id = $2 RETURNING *', [req.params.id, req.orgId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/org/users/:id/approve (or resend)
const generateAndSendInvite = async (req, res, actionMsg) => {
  try {
    const pool = getDB();
    
    // Validate user belongs to org
    const userQuery = await pool.query('SELECT * FROM users WHERE id = $1 AND organization_id = $2', [req.params.id, req.orgId]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in your organization' });
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await pool.query(
      `UPDATE users 
       SET status = 'invited', 
           invitation_token_hash = $1, 
           invitation_expires_at = $2, 
           invited_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [tokenHash, expiresAt, req.params.id]
    );

    // In a real application, send email with the token link here.
    // We return it for testing purposes.
    res.json({ message: actionMsg, token });
  } catch (error) {
    console.error('Approve/Resend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

app.post('/api/org/users/:id/approve', requireOrgAuth, async (req, res) => {
  await generateAndSendInvite(req, res, 'Invitation sent successfully.');
});

app.post('/api/org/users/:id/resend', requireOrgAuth, async (req, res) => {
  await generateAndSendInvite(req, res, 'Invitation resent successfully.');
});

app.post('/api/org/users/:id/cancel', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query(
      `UPDATE users 
       SET status = 'pending', 
           invitation_token_hash = NULL, 
           invitation_expires_at = NULL 
       WHERE id = $1 AND organization_id = $2 RETURNING *`, 
      [req.params.id, req.orgId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Cancel invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/org/users/:id/deactivate', requireOrgAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query(
      `UPDATE users SET status = 'inactive' WHERE id = $1 AND organization_id = $2 RETURNING *`, 
      [req.params.id, req.orgId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    const orgsResult = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive FROM organizations WHERE email != 'admin@gmail.com'");
    const usersResult = await pool.query("SELECT COUNT(*) as count FROM users");
    
    res.json({
      totalApplications: parseInt(appsResult.rows[0].count),
      totalOrganizations: parseInt(orgsResult.rows[0].total),
      activeOrganizations: parseInt(orgsResult.rows[0].active || 0),
      inactiveOrganizations: parseInt(orgsResult.rows[0].inactive || 0),
      registeredUsers: parseInt(usersResult.rows[0].count)
    });
  } catch (error) {
    console.error('Fetch sysadmin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sysadmin/activity (Last 7 days of creations)
app.get('/api/sysadmin/activity', requireSysAdminAuth, async (req, res) => {
  try {
    const pool = getDB();
    // Use a simple query to group users by creation date for the last 7 days
    const activityQuery = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);
    
    const orgsActivityQuery = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_orgs
      FROM organizations
      WHERE created_at >= NOW() - INTERVAL '7 days' AND email != 'admin@gmail.com'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    // Combine them into a single timeline array
    const timelineMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      timelineMap[ds] = { date: ds, users: 0, orgs: 0 };
    }
    
    activityQuery.rows.forEach(r => {
      const ds = r.date.toISOString().split('T')[0];
      if (timelineMap[ds]) timelineMap[ds].users = parseInt(r.new_users);
    });
    orgsActivityQuery.rows.forEach(r => {
      const ds = r.date.toISOString().split('T')[0];
      if (timelineMap[ds]) timelineMap[ds].orgs = parseInt(r.new_orgs);
    });

    res.json({
      timeline: Object.values(timelineMap),
      health: {
        status: 'Operational',
        uptime: '99.99%',
        dbLatency: '12ms'
      }
    });
  } catch (error) {
    console.error('Fetch sysadmin activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sysadmin/users
app.get('/api/sysadmin/users', requireSysAdminAuth, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_active, o.name as organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch sysadmin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sysadmin/users/:id
app.delete('/api/sysadmin/users/:id', requireSysAdminAuth, async (req, res) => {
  try {
    const pool = getDB();
    const userId = req.params.id;
    // Prevent sysadmin from deleting themselves
    const checkRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (checkRes.rows[0]?.role === 'sys_admin') {
      return res.status(403).json({ error: 'Cannot delete system administrators' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete sysadmin user error:', error);
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
        WHERE o.email != 'admin@gmail.com'
        ORDER BY o.created_at DESC
      `);
      return res.json(result.rows);
    } else {
      const result = await pool.query("SELECT id, name FROM organizations WHERE email != 'admin@gmail.com' ORDER BY name ASC");
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


// ─── Phase 1 Application Designer APIs ──────────────────────────────────────

// Auth middleware for Designer
async function requireDesignerAuth(req, res, next) {
  const orgId = parseInt(req.headers['x-org-id'], 10);
  const userId = req.headers['x-user-id'];
  
  if (!orgId || !userId) {
    return res.status(401).json({ error: 'Unauthorized: missing context' });
  }
  
  try {
    const pool = getDB();
    const userQuery = await pool.query('SELECT role, status FROM users WHERE id = $1 AND organization_id = $2', [userId, orgId]);
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: invalid user or organization' });
    }
    const user = userQuery.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }
    // Allow lead_designer, designer, and org_admin, sys_admin
    if (!['lead_designer', 'designer', 'org_admin', 'sys_admin'].includes(user.role)) {
       return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
    }
    
    req.orgId = orgId;
    req.userId = userId;
    req.userRole = user.role;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during auth' });
  }
}

// Middleware to check if designer is assigned to the application
async function checkDesignerAppAccess(req, res, next) {
  const appId = req.params.id;
  const pool = getDB();
  try {
    // Check if app belongs to org
    const appQuery = await pool.query('SELECT id FROM applications WHERE id = $1 AND organization_id = $2', [appId, req.orgId]);
    if (appQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or access denied' });
    }

    // Lead designers, org_admins, and sys_admins can access any app in their org (or globally for sys_admin but here orgId is enforced)
    if (['lead_designer', 'org_admin', 'sys_admin'].includes(req.userRole)) {
      return next();
    }

    // Regular designers must be assigned
    const assignedQuery = await pool.query(
      'SELECT * FROM designer_applications WHERE designer_id = $1 AND application_id = $2',
      [req.userId, appId]
    );
    
    if (assignedQuery.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this application' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during access check' });
  }
}

// GET /api/designer/dashboard
app.get('/api/designer/dashboard', requireDesignerAuth, async (req, res) => {
  try {
    const pool = getDB();
    let query, values;
    
    if (['lead_designer', 'org_admin', 'sys_admin'].includes(req.userRole)) {
      query = `
        SELECT 
          COUNT(*) as total, 
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, 
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
        FROM applications 
        WHERE organization_id = $1 AND archived = false
      `;
      values = [req.orgId];
    } else {
      query = `
        SELECT 
          COUNT(*) as total, 
          SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) as active, 
          SUM(CASE WHEN a.status = 'draft' THEN 1 ELSE 0 END) as draft
        FROM applications a
        JOIN designer_applications da ON a.id = da.application_id
        WHERE a.organization_id = $1 AND da.designer_id = $2 AND a.archived = false
      `;
      values = [req.orgId, req.userId];
    }

    const result = await pool.query(query, values);
    
    // Recent activity (dummy or real)
    res.json({
      totalApplications: parseInt(result.rows[0].total || 0),
      activeApplications: parseInt(result.rows[0].active || 0),
      draftApplications: parseInt(result.rows[0].draft || 0),
      recentActivity: []
    });
  } catch (error) {
    console.error('Fetch designer dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/designer/applications
app.get('/api/designer/applications', requireDesignerAuth, async (req, res) => {
  try {
    const pool = getDB();
    let query, values;

    if (['lead_designer', 'org_admin', 'sys_admin'].includes(req.userRole)) {
      query = `SELECT * FROM applications WHERE organization_id = $1 AND archived = false ORDER BY updated_at DESC`;
      values = [req.orgId];
    } else {
      query = `
        SELECT a.* 
        FROM applications a
        JOIN designer_applications da ON a.id = da.application_id
        WHERE a.organization_id = $1 AND da.designer_id = $2 AND a.archived = false
        ORDER BY a.updated_at DESC
      `;
      values = [req.orgId, req.userId];
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch designer applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/designer/applications/:id
app.get('/api/designer/applications/:id', requireDesignerAuth, checkDesignerAppAccess, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/designer/applications/:id
app.put('/api/designer/applications/:id', requireDesignerAuth, checkDesignerAppAccess, async (req, res) => {
  try {
    const pool = getDB();
    const { app_name, app_description, industry_template, deployment_type, status } = req.body;
    const result = await pool.query(
      `UPDATE applications SET
         app_name = COALESCE($1, app_name),
         app_description = COALESCE($2, app_description),
         industry_template = COALESCE($3, industry_template),
         deployment_type = COALESCE($4, deployment_type),
         status = COALESCE($5, status),
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [app_name, app_description, industry_template, deployment_type, status, req.params.id]
    );
    res.json({ message: 'Application updated', application: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/designer/applications/:id/modules
app.get('/api/designer/applications/:id/modules', requireDesignerAuth, checkDesignerAppAccess, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query('SELECT * FROM application_modules WHERE application_id = $1', [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/designer/applications/:id/modules
app.put('/api/designer/applications/:id/modules', requireDesignerAuth, checkDesignerAppAccess, async (req, res) => {
  try {
    const pool = getDB();
    const { modules } = req.body; // array of { module_id, is_enabled, config }
    const appId = req.params.id;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Clear existing modules for this app
      await client.query('DELETE FROM application_modules WHERE application_id = $1', [appId]);
      
      // Insert new
      if (modules && modules.length > 0) {
        for (const mod of modules) {
          await client.query(
            'INSERT INTO application_modules (application_id, module_id, is_enabled, config) VALUES ($1, $2, $3, $4)',
            [appId, mod.module_id, mod.is_enabled !== false, mod.config ? JSON.stringify(mod.config) : null]
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    
    res.json({ message: 'Modules updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/designer/applications/:id/schema
app.get('/api/designer/applications/:id/schema', requireDesignerAuth, checkDesignerAppAccess, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query('SELECT schema_data FROM database_schemas WHERE application_id = $1', [req.params.id]);
    res.json(result.rows.length > 0 ? result.rows[0].schema_data : { tables: [] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/designer/applications/:id/schema
app.put('/api/designer/applications/:id/schema', requireDesignerAuth, checkDesignerAppAccess, async (req, res) => {
  try {
    const pool = getDB();
    const { schema_data } = req.body;
    const appId = req.params.id;
    
    const existing = await pool.query('SELECT id FROM database_schemas WHERE application_id = $1', [appId]);
    if (existing.rows.length > 0) {
      await pool.query('UPDATE database_schemas SET schema_data = $1 WHERE application_id = $2', [JSON.stringify(schema_data), appId]);
    } else {
      await pool.query('INSERT INTO database_schemas (application_id, schema_data) VALUES ($1, $2)', [appId, JSON.stringify(schema_data)]);
    }
    res.json({ message: 'Schema updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/designer/applications/:id/apis
app.get('/api/designer/applications/:id/apis', requireDesignerAuth, checkDesignerAppAccess, async (req, res) => {
  try {
    const pool = getDB();
    const result = await pool.query('SELECT api_data FROM apis WHERE application_id = $1', [req.params.id]);
    res.json(result.rows.length > 0 ? result.rows[0].api_data : { endpoints: [] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/designer/applications/:id/apis
app.put('/api/designer/applications/:id/apis', requireDesignerAuth, checkDesignerAppAccess, async (req, res) => {
  try {
    const pool = getDB();
    const { api_data } = req.body;
    const appId = req.params.id;
    
    const existing = await pool.query('SELECT id FROM apis WHERE application_id = $1', [appId]);
    if (existing.rows.length > 0) {
      await pool.query('UPDATE apis SET api_data = $1 WHERE application_id = $2', [JSON.stringify(api_data), appId]);
    } else {
      await pool.query('INSERT INTO apis (application_id, api_data) VALUES ($1, $2)', [appId, JSON.stringify(api_data)]);
    }
    res.json({ message: 'APIs updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// ─── Change Password ────────────────────────────────────────────────────────
// GET /api/users/profile — get authenticated user profile details
app.get('/api/users/profile', async (req, res) => {
  try {
    const email = req.header('X-User-Email');
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    const pool = getDB();
    
    // Search in users table first
    let userQuery = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, o.name as organization_name 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    
    let user = userQuery.rows[0];

    // Fallback to organizations table (for org_admin/sys_admin before they are migrated to users)
    if (!user) {
      const orgQuery = await pool.query('SELECT id, admin_name as name, email, name as organization_name FROM organizations WHERE LOWER(email) = LOWER($1)', [email]);
      if (orgQuery.rows.length > 0) {
        const org = orgQuery.rows[0];
        user = {
          id: org.id,
          name: org.name,
          email: org.email,
          role: org.email === 'admin@gmail.com' ? 'sys_admin' : 'org_admin',
          status: 'active',
          organization_name: org.organization_name
        };
      }
    }

    if (user && user.email === 'admin@gmail.com') {
      user.role = 'sys_admin';
      user.organization_name = 'Entera.ai Platform';
    }

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Fetch user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/change-password', requireOrgAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    
    const pool = getDB();
    const userQuery = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (userQuery.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = userQuery.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect current password' });
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.userId]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
