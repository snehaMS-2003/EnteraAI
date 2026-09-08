const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'index.js');
let content = fs.readFileSync(targetFile, 'utf8');

const designerRoutes = `
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
      query = \`
        SELECT 
          COUNT(*) as total, 
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, 
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
        FROM applications 
        WHERE organization_id = $1 AND archived = false
      \`;
      values = [req.orgId];
    } else {
      query = \`
        SELECT 
          COUNT(*) as total, 
          SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) as active, 
          SUM(CASE WHEN a.status = 'draft' THEN 1 ELSE 0 END) as draft
        FROM applications a
        JOIN designer_applications da ON a.id = da.application_id
        WHERE a.organization_id = $1 AND da.designer_id = $2 AND a.archived = false
      \`;
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
      query = \`SELECT * FROM applications WHERE organization_id = $1 AND archived = false ORDER BY updated_at DESC\`;
      values = [req.orgId];
    } else {
      query = \`
        SELECT a.* 
        FROM applications a
        JOIN designer_applications da ON a.id = da.application_id
        WHERE a.organization_id = $1 AND da.designer_id = $2 AND a.archived = false
        ORDER BY a.updated_at DESC
      \`;
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
      \`UPDATE applications SET
         app_name = COALESCE($1, app_name),
         app_description = COALESCE($2, app_description),
         industry_template = COALESCE($3, industry_template),
         deployment_type = COALESCE($4, deployment_type),
         status = COALESCE($5, status),
         updated_at = NOW()
       WHERE id = $6 RETURNING *\`,
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
`;

if (!content.includes('requireDesignerAuth')) {
  content = content.replace('app.listen(PORT, () => {', designerRoutes + '\\napp.listen(PORT, () => {');
  fs.writeFileSync(targetFile, content);
  console.log('Routes added successfully.');
} else {
  console.log('Routes already exist.');
}
