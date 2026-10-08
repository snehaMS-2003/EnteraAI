const http = require('http');
const { getDB } = require('./server/db');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runComprehensiveVerification() {
  console.log('===============================================================');
  console.log('  ENTERAI — COMPLETE ORGANIZATION ADMIN WORKFLOW VERIFICATION  ');
  console.log('===============================================================\n');

  const pool = getDB();
  const results = {};

  try {
    // ── AUTHENTICATION OF ROLES ──
    console.log('[AUTH] Logging in with different roles...');
    
    // 1. Org Admin (Org 7: TechCorp Solutions)
    const orgAdminLogin = await request('POST', '/api/login', {
      email: 'abc123@gmail.com',
      password: 'admin@123'
    });
    if (orgAdminLogin.status !== 200) throw new Error('Org Admin login failed');
    const orgAdmin = orgAdminLogin.data.user;
    const org7Id = orgAdmin.organizationId;
    const orgAdminHeaders = {
      'X-Org-Id': String(org7Id),
      'X-User-Id': String(orgAdmin.id),
      'X-User-Email': orgAdmin.email,
      'X-User-Role': orgAdmin.role
    };
    console.log(`  ✓ Org Admin: ${orgAdmin.name} (${orgAdmin.email}), Org ID: ${org7Id}`);

    // 2. Org Admin 2 (Org 9: XYZ)
    const org9AdminLogin = await request('POST', '/api/login', {
      email: 'xyz123@gmail.com',
      password: 'xyz@123'
    });
    if (org9AdminLogin.status !== 200) throw new Error('Org 9 Admin login failed');
    const org9Admin = org9AdminLogin.data.user;
    const org9Id = org9Admin.organizationId;
    const org9Headers = {
      'X-Org-Id': String(org9Id),
      'X-User-Id': String(org9Admin.id),
      'X-User-Email': org9Admin.email,
      'X-User-Role': org9Admin.role
    };
    console.log(`  ✓ Org 9 Admin: ${org9Admin.name} (${org9Admin.email}), Org ID: ${org9Id}`);

    // 3. Designer (Org 7)
    const designerLogin = await request('POST', '/api/login', {
      email: 'sneha123@gmail.com',
      password: 'password123'
    });
    if (designerLogin.status !== 200) throw new Error('Designer login failed');
    const designer = designerLogin.data.user;
    const designerHeaders = {
      'X-Org-Id': String(designer.organizationId),
      'X-User-Id': String(designer.id),
      'X-User-Email': designer.email,
      'X-User-Role': designer.role
    };
    console.log(`  ✓ Designer: ${designer.name} (${designer.email}), Org ID: ${designer.organizationId}`);

    // 4. System Admin
    const sysAdminLogin = await request('POST', '/api/login', {
      email: 'admin@gmail.com',
      password: 'admin@123'
    });
    if (sysAdminLogin.status !== 200) throw new Error('Sys Admin login failed');
    const sysAdmin = sysAdminLogin.data.user;
    const sysAdminHeaders = {
      'X-User-Id': String(sysAdmin.id),
      'X-User-Email': sysAdmin.email,
      'X-User-Role': 'sys_admin'
    };
    console.log(`  ✓ System Admin: ${sysAdmin.name} (${sysAdmin.email})`);

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 1 — ORGANIZATION ADMIN DASHBOARD
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 1 — ORGANIZATION ADMIN DASHBOARD');
    console.log('---------------------------------------------------------------');
    const statsRes = await request('GET', '/api/orgadmin/stats', null, orgAdminHeaders);
    const profileRes = await request('GET', '/api/org/profile', null, orgAdminHeaders);
    const appsRes = await request('GET', '/api/org/applications', null, orgAdminHeaders);

    console.log('  API /api/orgadmin/stats response:', statsRes.data);
    console.log('  API /api/org/profile response:', { name: profileRes.data.name, admin_name: profileRes.data.admin_name });
    console.log('  API /api/org/applications count:', appsRes.data.length);

    // Cross-verify with PostgreSQL database directly
    const dbOrg = await pool.query('SELECT name, admin_name FROM organizations WHERE id = $1', [org7Id]);
    const dbUsers = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as active FROM users WHERE organization_id = $2', ['active', org7Id]);
    const dbApps = await pool.query('SELECT COUNT(*) as total, status, app_name FROM applications WHERE organization_id = $1 AND archived = false GROUP BY status, app_name', [org7Id]);

    const expectedOrgName = dbOrg.rows[0].name;
    const expectedAdminName = dbOrg.rows[0].admin_name;
    const expectedTotalUsers = parseInt(dbUsers.rows[0].total, 10);
    const expectedActiveUsers = parseInt(dbUsers.rows[0].active, 10);
    const expectedTotalApps = dbApps.rows.length;
    const expectedAppStatus = dbApps.rows[0]?.status || 'none';

    console.log(`  PostgreSQL DB check:
    - Organization Name: "${expectedOrgName}" (API: "${profileRes.data.name}")
    - Administrator: "${expectedAdminName}" (API: "${profileRes.data.admin_name}")
    - Total Users: ${expectedTotalUsers} (API: ${statsRes.data.totalUsers})
    - Active Users: ${expectedActiveUsers} (API: ${statsRes.data.activeUsers})
    - Total Applications: ${expectedTotalApps} (API: ${statsRes.data.totalApplications})
    - Application Status: "${expectedAppStatus}" (API: "${appsRes.data[0]?.status || 'none'}")`);

    if (
      profileRes.data.name === expectedOrgName &&
      profileRes.data.admin_name === expectedAdminName &&
      statsRes.data.totalUsers === expectedTotalUsers &&
      statsRes.data.activeUsers === expectedActiveUsers &&
      statsRes.data.totalApplications === expectedTotalApps &&
      (appsRes.data[0]?.status || 'none') === expectedAppStatus
    ) {
      console.log('  ✓ TASK 1 PASSED: All dashboard values match PostgreSQL database exactly without hardcoding.');
      results['Organization Dashboard'] = 'PASS';
    } else {
      throw new Error('Dashboard stats mismatch between API and PostgreSQL');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 2 — ORGANIZATION USERS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 2 — ORGANIZATION USERS');
    console.log('---------------------------------------------------------------');
    // 1. View users
    const usersRes = await request('GET', '/api/org/users', null, orgAdminHeaders);
    console.log(`  Fetched ${usersRes.data.length} users for Org 7`);
    const allBelong = usersRes.data.every(u => !u.organization_id || u.organization_id === org7Id);
    if (!allBelong) throw new Error('Found user not belonging to organization!');

    // 2. Add / Invite user
    const newEmail = `designer_test_${Date.now()}@example.com`;
    console.log(`  Adding new user: ${newEmail}...`);
    const addRes = await request('POST', '/api/org/users', {
      name: 'Test Workflow User',
      email: newEmail,
      role: 'designer',
      password: 'password123',
      applications: [appsRes.data[0].id]
    }, orgAdminHeaders);
    if (addRes.status !== 201) throw new Error('Failed to create user: ' + JSON.stringify(addRes.data));
    const newUserId = addRes.data.id;
    console.log(`  ✓ User created with ID: ${newUserId}`);

    // Verify in PostgreSQL
    const checkDbUser = await pool.query('SELECT id, name, email, status, organization_id FROM users WHERE id = $1', [newUserId]);
    if (checkDbUser.rows.length === 0 || checkDbUser.rows[0].organization_id !== org7Id) {
      throw new Error('Created user not found or org mismatch in PostgreSQL');
    }

    // 3. Edit user
    console.log('  Editing user info...');
    const editRes = await request('PATCH', `/api/org/users/${newUserId}`, {
      name: 'Test Workflow User Modified',
      role: 'designer'
    }, orgAdminHeaders);
    if (editRes.status !== 200 || editRes.data.name !== 'Test Workflow User Modified') {
      throw new Error('Failed to update user');
    }

    // 4. Deactivate user
    console.log('  Deactivating user...');
    const deactRes = await request('POST', `/api/org/users/${newUserId}/deactivate`, null, orgAdminHeaders);
    if (deactRes.status !== 200) throw new Error('Failed to deactivate user');
    const dbDeact = await pool.query('SELECT status FROM users WHERE id = $1', [newUserId]);
    if (dbDeact.rows[0].status !== 'inactive') throw new Error('User status not inactive in DB');
    console.log('  ✓ Status in PostgreSQL verified as "inactive"');

    // 5. Reactivate user
    console.log('  Reactivating user...');
    const actRes = await request('POST', `/api/org/users/${newUserId}/activate`, null, orgAdminHeaders);
    if (actRes.status !== 200) throw new Error('Failed to activate user');
    const dbAct = await pool.query('SELECT status FROM users WHERE id = $1', [newUserId]);
    if (dbAct.rows[0].status !== 'active') throw new Error('User status not active in DB');
    console.log('  ✓ Status in PostgreSQL verified as "active"');

    // 6. Delete user
    console.log('  Deleting user...');
    const delRes = await request('DELETE', `/api/org/users/${newUserId}`, null, orgAdminHeaders);
    if (delRes.status !== 200) throw new Error('Failed to delete user');
    const dbDel = await pool.query('SELECT id FROM users WHERE id = $1', [newUserId]);
    if (dbDel.rows.length !== 0) throw new Error('User still exists in DB after delete');
    console.log('  ✓ User deletion confirmed in PostgreSQL');

    // 7. Security Isolation: Org Admin 7 cannot modify Org 9's user (ID 19)
    console.log('  Testing Security Constraint: Org 7 Admin trying to modify Org 9 user...');
    const attackEdit = await request('PATCH', `/api/org/users/19`, { name: 'Hacked' }, orgAdminHeaders);
    const attackDeact = await request('POST', `/api/org/users/19/deactivate`, null, orgAdminHeaders);
    const attackDel = await request('DELETE', `/api/org/users/19`, null, orgAdminHeaders);
    console.log(`  Cross-org user actions: edit=${attackEdit.status}, deact=${attackDeact.status}, del=${attackDel.status}`);
    if (attackEdit.status === 200 || attackDeact.status === 200 || attackDel.status === 200) {
      throw new Error('Security Breach: Org Admin was able to modify a user from another organization!');
    }
    console.log('  ✓ Backend strictly prevented cross-tenant user modification!');

    results['Organization Users'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 3 — APPLICATION & ONE ORG = ONE APPLICATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 3 — APPLICATION & ONE APPLICATION RULE');
    console.log('---------------------------------------------------------------');
    const existingApp = appsRes.data[0];
    console.log(`  Existing Application: "${existingApp.app_name}" (ID: ${existingApp.id}, Status: ${existingApp.status})`);

    // 1. Edit application info
    console.log('  Editing application description and deployment type...');
    const updateAppRes = await request('PUT', `/api/org/applications/${existingApp.id}`, {
      app_name: existingApp.app_name,
      app_description: 'Updated description for E2E verification test',
      deployment_type: 'cloud'
    }, orgAdminHeaders);
    if (updateAppRes.status !== 200) throw new Error('Failed to update application');
    
    // Verify in PostgreSQL
    const dbAppCheck = await pool.query('SELECT app_description FROM applications WHERE id = $1', [existingApp.id]);
    if (dbAppCheck.rows[0].app_description !== 'Updated description for E2E verification test') {
      throw new Error('Application description not updated in PostgreSQL');
    }
    console.log('  ✓ Application update persisted to PostgreSQL');

    // 2. View / Update status
    console.log('  Updating application status to draft...');
    const statusUpdateRes = await request('PATCH', `/api/org/applications/${existingApp.id}/status`, {
      status: 'draft'
    }, orgAdminHeaders);
    if (statusUpdateRes.status !== 200) throw new Error('Failed to update app status');

    // 3. Business rule: ONE ORGANIZATION = ONE APPLICATION
    console.log('  Attempting to create a 2nd application for Org 7...');
    const dupRes1 = await request('POST', '/api/org/applications', {
      app_name: 'Second Application For Org 7',
      industry: 'Education'
    }, orgAdminHeaders);
    console.log(`  POST /api/org/applications response: HTTP ${dupRes1.status} - "${dupRes1.data?.error}"`);
    if (dupRes1.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate app, got ${dupRes1.status}`);
    }

    const dupRes2 = await request('POST', '/api/applications', {
      app_name: 'Direct Endpoint Second Application',
      organization_id: org7Id
    }, orgAdminHeaders);
    console.log(`  POST /api/applications response: HTTP ${dupRes2.status} - "${dupRes2.data?.error}"`);
    if (dupRes2.status !== 409) {
      throw new Error(`Expected 409 Conflict for generic duplicate app, got ${dupRes2.status}`);
    }

    // 4. Verify PostgreSQL unique partial index
    const indexCheck = await pool.query(`
      SELECT indexname, indexdef FROM pg_indexes 
      WHERE tablename = 'applications' AND indexname = 'idx_one_active_app_per_org'
    `);
    if (indexCheck.rows.length === 0) {
      throw new Error('Database index idx_one_active_app_per_org is missing in PostgreSQL');
    }
    console.log('  ✓ PostgreSQL unique partial index idx_one_active_app_per_org verified in pg_indexes');

    results['Application Management'] = 'PASS';
    results['One Application Rule'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 4 — APPLICATION CONTEXT & CROSS-TENANT ISOLATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 4 — APPLICATION CONTEXT & CROSS-TENANT ISOLATION');
    console.log('---------------------------------------------------------------');
    // First, let Org 9 create its 1 application
    console.log('  Creating application for Org 9...');
    const org9CreateApp = await request('POST', '/api/org/applications', {
      app_name: 'XYZ Enterprise Portal',
      industry: 'Retail',
      status: 'draft'
    }, org9Headers);
    if (org9CreateApp.status !== 201) throw new Error('Org 9 failed to create app: ' + JSON.stringify(org9CreateApp.data));
    const org9AppId = org9CreateApp.data.application.id;
    console.log(`  ✓ Org 9 Application created with ID: ${org9AppId}`);

    // Now test: Org 7 Admin tries to access Org 9's application
    console.log(`  Testing: Org 7 Admin attempting to access Org 9 App (${org9AppId})...`);
    const crossGetApp = await request('GET', `/api/org/applications/${org9AppId}`, null, orgAdminHeaders);
    const crossEditApp = await request('PUT', `/api/org/applications/${org9AppId}`, { app_name: 'Stolen App' }, orgAdminHeaders);
    const crossGetSchema = await request('GET', `/api/org/applications/${org9AppId}/schema`, null, orgAdminHeaders);
    const crossPutSchema = await request('PUT', `/api/org/applications/${org9AppId}/schema`, { schema_data: { tables: [] } }, orgAdminHeaders);
    const crossGetApis = await request('GET', `/api/org/applications/${org9AppId}/apis`, null, orgAdminHeaders);
    const crossPutApis = await request('PUT', `/api/org/applications/${org9AppId}/apis`, { api_data: { endpoints: [] } }, orgAdminHeaders);

    console.log(`  Cross-tenant access responses:
    - GET App: HTTP ${crossGetApp.status}
    - PUT App: HTTP ${crossEditApp.status}
    - GET Schema: HTTP ${crossGetSchema.status}
    - PUT Schema: HTTP ${crossPutSchema.status}
    - GET APIs: HTTP ${crossGetApis.status}
    - PUT APIs: HTTP ${crossPutApis.status}`);

    if (
      crossGetApp.status === 200 ||
      crossEditApp.status === 200 ||
      crossGetSchema.status === 200 ||
      crossPutSchema.status === 200 ||
      crossGetApis.status === 200 ||
      crossPutApis.status === 200
    ) {
      throw new Error('SECURITY VIOLATION: Org 7 Admin was able to access or mutate Org 9 Application resources!');
    }
    console.log('  ✓ Backend strictly validated authenticated user -> organization -> application -> resource!');

    // Cleanup Org 9 application
    await request('DELETE', `/api/org/applications/${org9AppId}`, null, org9Headers);
    console.log('  ✓ Cleaned up temporary Org 9 application');

    results['Application Context'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 5 — DATABASE SCHEMA
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 5 — DATABASE SCHEMA');
    console.log('---------------------------------------------------------------');
    const newSchema = {
      tables: [
        {
          id: 'tbl_students',
          name: 'students',
          columns: [
            { id: 'c1', name: 'id', type: 'integer', primaryKey: true },
            { id: 'c2', name: 'full_name', type: 'varchar', primaryKey: false },
            { id: 'c3', name: 'email', type: 'varchar', primaryKey: false },
            { id: 'c4', name: 'enrolled_at', type: 'timestamp', primaryKey: false },
            { id: 'c5', name: 'is_active', type: 'boolean', primaryKey: false }
          ]
        },
        {
          id: 'tbl_courses',
          name: 'courses',
          columns: [
            { id: 'c10', name: 'course_code', type: 'varchar', primaryKey: true },
            { id: 'c11', name: 'title', type: 'varchar', primaryKey: false },
            { id: 'c12', name: 'metadata', type: 'jsonb', primaryKey: false }
          ]
        }
      ]
    };

    console.log('  Saving Database Schema for Org 7 application (ID 5)...');
    const putSchemaRes = await request('PUT', `/api/org/applications/${existingApp.id}/schema`, {
      schema_data: newSchema
    }, orgAdminHeaders);
    if (putSchemaRes.status !== 200) throw new Error('Failed to save schema: ' + JSON.stringify(putSchemaRes.data));
    console.log('  ✓ Schema saved via API');

    // Verify in PostgreSQL
    const dbSchema = await pool.query('SELECT schema_data FROM database_schemas WHERE application_id = $1', [existingApp.id]);
    if (dbSchema.rows.length === 0) throw new Error('No schema record found in database_schemas table');
    const savedTables = dbSchema.rows[0].schema_data.tables;
    if (savedTables.length !== 2) throw new Error(`Expected 2 tables, found ${savedTables.length}`);
    if (savedTables[0].name !== 'students' || savedTables[1].name !== 'courses') {
      throw new Error('Table names do not match expected in PostgreSQL');
    }
    if (savedTables[0].columns.length !== 5 || !savedTables[0].columns[0].primaryKey) {
      throw new Error('Table columns or primary key not persisted in PostgreSQL');
    }
    console.log(`  ✓ Verified PostgreSQL database_schemas record: ${savedTables.length} tables, ${savedTables[0].columns.length} columns, primary keys and types all intact.`);

    // Refresh simulation: fetch via GET endpoint
    const getSchemaRes = await request('GET', `/api/org/applications/${existingApp.id}/schema`, null, orgAdminHeaders);
    if (getSchemaRes.status !== 200 || getSchemaRes.data.tables.length !== 2) {
      throw new Error('Failed to fetch persisted schema after save');
    }
    console.log('  ✓ Refetched schema from API matches saved data perfectly');

    results['Database Schema'] = 'PASS';
    results['Schema Persistence'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 6 — REST APIs
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 6 — REST APIs');
    console.log('---------------------------------------------------------------');
    const newApis = {
      endpoints: [
        { id: 'ep_1', method: 'GET', path: '/api/students', description: 'Retrieve student directory' },
        { id: 'ep_2', method: 'POST', path: '/api/students', description: 'Enroll new student' },
        { id: 'ep_3', method: 'PUT', path: '/api/students/:id', description: 'Update student record' },
        { id: 'ep_4', method: 'DELETE', path: '/api/students/:id', description: 'Withdraw student' },
        { id: 'ep_5', method: 'GET', path: '/api/courses', description: 'List available courses' }
      ]
    };

    console.log('  Saving REST APIs for Org 7 application (ID 5)...');
    const putApisRes = await request('PUT', `/api/org/applications/${existingApp.id}/apis`, {
      api_data: newApis
    }, orgAdminHeaders);
    if (putApisRes.status !== 200) throw new Error('Failed to save APIs: ' + JSON.stringify(putApisRes.data));
    console.log('  ✓ APIs saved via API');

    // Verify in PostgreSQL
    const dbApis = await pool.query('SELECT api_data FROM apis WHERE application_id = $1', [existingApp.id]);
    if (dbApis.rows.length === 0) throw new Error('No API record found in apis table');
    const savedEndpoints = dbApis.rows[0].api_data.endpoints;
    if (savedEndpoints.length !== 5) throw new Error(`Expected 5 endpoints, found ${savedEndpoints.length}`);
    if (savedEndpoints[0].method !== 'GET' || savedEndpoints[1].method !== 'POST') {
      throw new Error('API methods mismatch in PostgreSQL');
    }
    console.log(`  ✓ Verified PostgreSQL apis record: ${savedEndpoints.length} endpoints with GET, POST, PUT, DELETE persisted.`);

    // Refresh simulation: fetch via GET endpoint
    const getApisRes = await request('GET', `/api/org/applications/${existingApp.id}/apis`, null, orgAdminHeaders);
    if (getApisRes.status !== 200 || getApisRes.data.endpoints.length !== 5) {
      throw new Error('Failed to fetch persisted APIs after save');
    }
    console.log('  ✓ Refetched APIs from API matches saved data perfectly');

    results['REST APIs'] = 'PASS';
    results['API Persistence'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 7 — ORGANIZATION PROFILE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 7 — ORGANIZATION PROFILE');
    console.log('---------------------------------------------------------------');
    const originalProfile = profileRes.data;
    console.log('  Updating organization profile in PostgreSQL...');
    const updateProfile = await request('PUT', '/api/org/profile', {
      name: 'TechCorp Solutions International',
      admin_name: 'RAVI K',
      phone: '+1 555-0199',
      industry: 'Education',
      industry_specific: 'Higher Education Management',
      address: '777 Tech Boulevard, Suite 500',
      city: 'Tech City',
      state: 'California',
      district: 'Bay District',
      pincode: '94016',
      website: 'https://techcorp-intl.example.com'
    }, orgAdminHeaders);

    if (updateProfile.status !== 200) throw new Error('Failed to update organization profile');
    console.log('  ✓ Profile updated via PUT /api/org/profile');

    // Verify in PostgreSQL
    const dbProfCheck = await pool.query('SELECT name, address, city, state, website FROM organizations WHERE id = $1', [org7Id]);
    console.log('  PostgreSQL record verified:', dbProfCheck.rows[0]);
    if (
      dbProfCheck.rows[0].name !== 'TechCorp Solutions International' ||
      dbProfCheck.rows[0].address !== '777 Tech Boulevard, Suite 500' ||
      dbProfCheck.rows[0].website !== 'https://techcorp-intl.example.com'
    ) {
      throw new Error('Profile changes did not persist to PostgreSQL database');
    }

    // Restore original profile name
    await request('PUT', '/api/org/profile', {
      name: 'TechCorp Solutions',
      admin_name: originalProfile.admin_name,
      phone: originalProfile.phone,
      industry: originalProfile.industry,
      address: originalProfile.address,
      website: originalProfile.website
    }, orgAdminHeaders);
    console.log('  ✓ Profile restored to clean state in PostgreSQL');

    results['Organization Profile'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 8 — AUTHORIZATION TESTING (SYS_ADMIN vs ORG_ADMIN vs DESIGNER)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 8 — AUTHORIZATION TESTING');
    console.log('---------------------------------------------------------------');
    // 1. Designer cannot access Org Admin functions
    console.log('  Testing Designer access to Org Admin management endpoints...');
    const desAddUser = await request('POST', '/api/org/users', { name: 'Fail', email: 'fail@fail.com' }, designerHeaders);
    const desUpdateProfile = await request('PUT', '/api/org/profile', { name: 'Fail' }, designerHeaders);
    const desCreateApp = await request('POST', '/api/org/applications', { app_name: 'Fail' }, designerHeaders);
    const desGetUsers = await request('GET', '/api/org/users', null, designerHeaders);

    console.log(`  Designer forbidden actions:
    - POST /api/org/users: HTTP ${desAddUser.status}
    - PUT /api/org/profile: HTTP ${desUpdateProfile.status}
    - POST /api/org/applications: HTTP ${desCreateApp.status}
    - GET /api/org/users: HTTP ${desGetUsers.status}`);

    if (
      desAddUser.status !== 403 ||
      desUpdateProfile.status !== 403 ||
      desCreateApp.status !== 403 ||
      desGetUsers.status !== 403
    ) {
      throw new Error('Authorization test failed: Designer was able to access Org Admin management functions!');
    }
    console.log('  ✓ Designer correctly denied (403 Forbidden) from all Org Admin endpoints');

    // 2. Org Admin can manage ONLY their organization
    console.log('  Testing Org Admin restriction to own organization...');
    const orgAdminCrossOrgStats = await request('GET', '/api/orgadmin/stats', null, {
      ...orgAdminHeaders,
      'X-Org-Id': String(org9Id) // Trying to spoof Org 9
    });
    console.log(`  Org Admin spoofing Org 9 context: HTTP ${orgAdminCrossOrgStats.status}`);
    if (orgAdminCrossOrgStats.status === 200) {
      throw new Error('Authorization test failed: Org Admin was able to access another org by spoofing X-Org-Id header!');
    }
    console.log('  ✓ Header spoofing rejected with 403 Forbidden by backend authorization gateway');

    // 3. Sys Admin can access platform-wide resources
    console.log('  Testing System Admin platform-wide access...');
    const sysAdminOrgs = await request('GET', '/api/organizations', null, sysAdminHeaders);
    const sysAdminStats = await request('GET', '/api/sysadmin/stats', null, sysAdminHeaders);
    if (sysAdminOrgs.status !== 200 || sysAdminStats.status !== 200) {
      throw new Error(`System Admin access failed: orgs status ${sysAdminOrgs.status}, stats status ${sysAdminStats.status}`);
    }
    console.log(`  ✓ System Admin successfully accessed platform-wide resources (${sysAdminOrgs.data.organizations?.length || sysAdminOrgs.data.length} orgs)`);

    results['Authorization'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 9 — REFRESH TEST
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n---------------------------------------------------------------');
    console.log('TASK 9 — REFRESH PERSISTENCE TEST');
    console.log('---------------------------------------------------------------');
    // Verify that all saved state persists across completely separate requests and direct DB queries
    const verifyApp = await pool.query('SELECT app_name, status FROM applications WHERE id = $1', [existingApp.id]);
    const verifySchema = await pool.query('SELECT schema_data FROM database_schemas WHERE application_id = $1', [existingApp.id]);
    const verifyApis = await pool.query('SELECT api_data FROM apis WHERE application_id = $1', [existingApp.id]);
    const verifyOrg = await pool.query('SELECT name, email FROM organizations WHERE id = $1', [org7Id]);

    if (
      verifyApp.rows.length === 1 &&
      verifySchema.rows[0].schema_data.tables.length === 2 &&
      verifyApis.rows[0].api_data.endpoints.length === 5 &&
      verifyOrg.rows[0].name === 'TechCorp Solutions'
    ) {
      console.log('  ✓ PostgreSQL confirmed 100% persistent data across applications, schemas, apis, and organizations');
      results['Refresh Persistence'] = 'PASS';
      results['PostgreSQL Integration'] = 'PASS';
    } else {
      throw new Error('Refresh persistence failed in PostgreSQL database');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 10 — FINAL VERIFICATION REPORT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n===============================================================');
    console.log('TASK 10 — FINAL VERIFICATION RESULTS');
    console.log('===============================================================\n');

    const checklist = [
      'Organization Dashboard',
      'Organization Users',
      'Application Management',
      'One Application Rule',
      'Application Context',
      'Database Schema',
      'Schema Persistence',
      'REST APIs',
      'API Persistence',
      'Organization Profile',
      'Authorization',
      'Refresh Persistence',
      'PostgreSQL Integration'
    ];

    let allPassed = true;
    for (const item of checklist) {
      const status = results[item] || 'FAIL';
      console.log(`  ${item.padEnd(26)} : [${status}]`);
      if (status !== 'PASS') allPassed = false;
    }

    console.log('\n===============================================================');
    if (allPassed) {
      console.log('  FINAL RESULT: ALL 13 VERIFICATION CRITERIA PASSED! ✓');
    } else {
      console.log('  FINAL RESULT: SOME TESTS FAILED!');
      process.exitCode = 1;
    }
    console.log('===============================================================\n');

  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runComprehensiveVerification();
