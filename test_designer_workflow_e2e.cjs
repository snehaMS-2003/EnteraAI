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

async function runDesignerVerification() {
  console.log('===============================================================');
  console.log('    ENTERAI — COMPLETE DESIGNER WORKFLOW VERIFICATION (E2E)    ');
  console.log('===============================================================\n');

  const pool = getDB();
  const results = {};

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // TASK 1 — DESIGNER LOGIN & AUTHENTICATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[TASK 1] Verifying Designer Login & Authentication...');

    // 1. Designer Login
    const loginRes = await request('POST', '/api/login', {
      email: 'sneha123@gmail.com',
      password: 'password123'
    });
    console.log('  Login status:', loginRes.status, 'Role:', loginRes.data?.user?.role);
    if (loginRes.status !== 200 || loginRes.data.user.role !== 'designer') {
      throw new Error('Designer login failed or role mismatch: ' + JSON.stringify(loginRes.data));
    }
    const designer = loginRes.data.user;
    const orgId = designer.organizationId;
    console.log(`  ✓ Logged in as: ${designer.name} (${designer.email}), Org ID: ${orgId}`);

    const designerHeaders = {
      'X-Org-Id': String(orgId),
      'X-User-Id': String(designer.id),
      'X-User-Email': designer.email,
      'X-User-Role': designer.role
    };

    // 2. Bad password test
    const badLogin = await request('POST', '/api/login', {
      email: 'sneha123@gmail.com',
      password: 'wrong_password_999'
    });
    if (badLogin.status !== 401) throw new Error('Expected 401 for bad password, got ' + badLogin.status);
    console.log('  ✓ Invalid password properly returns 401 Unauthorized');

    // 3. Unauthenticated request test
    const unauthReq = await request('GET', '/api/designer/workspace');
    if (unauthReq.status !== 401) throw new Error('Expected 401 for unauthenticated request, got ' + unauthReq.status);
    console.log('  ✓ Missing context properly returns 401 Unauthorized');

    results['Designer Login'] = 'PASS';
    results['Authentication'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 2 — DESIGNER DASHBOARD
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 2] Verifying Designer Dashboard (Real PostgreSQL Data)...');
    const wsRes = await request('GET', '/api/designer/workspace', null, designerHeaders);
    if (wsRes.status !== 200) throw new Error('Failed to fetch designer workspace: ' + JSON.stringify(wsRes.data));
    const ws = wsRes.data;

    console.log('  API /api/designer/workspace payload:', {
      organizationName: ws.organization?.name,
      applicationName: ws.application?.app_name,
      applicationStatus: ws.application?.status,
      pagesCount: ws.pages?.count,
      tablesCount: ws.schema?.tableCount,
      apisCount: ws.apis?.endpointCount
    });

    // Cross-check against PostgreSQL database directly
    const dbOrg = await pool.query('SELECT name FROM organizations WHERE id = $1', [orgId]);
    const dbApp = await pool.query('SELECT id, app_name, status FROM applications WHERE organization_id = $1 AND archived = false', [orgId]);
    const dbPages = await pool.query('SELECT COUNT(*) FROM application_pages WHERE application_id = $1', [dbApp.rows[0].id]);
    const dbSchema = await pool.query('SELECT schema_data FROM database_schemas WHERE application_id = $1', [dbApp.rows[0].id]);
    const dbApis = await pool.query('SELECT api_data FROM apis WHERE application_id = $1', [dbApp.rows[0].id]);

    const expectedOrgName = dbOrg.rows[0].name;
    const expectedAppName = dbApp.rows[0].app_name;
    const expectedAppStatus = dbApp.rows[0].status;
    const expectedPagesCount = parseInt(dbPages.rows[0].count, 10);
    const expectedTablesCount = dbSchema.rows[0]?.schema_data?.tables?.length || 0;
    const expectedApisCount = dbApis.rows[0]?.api_data?.endpoints?.length || 0;

    console.log(`  Live PostgreSQL Check:
    - Org Name: "${expectedOrgName}" (API: "${ws.organization?.name}")
    - App Name: "${expectedAppName}" (API: "${ws.application?.app_name}")
    - App Status: "${expectedAppStatus}" (API: "${ws.application?.status}")
    - Pages Count: ${expectedPagesCount} (API: ${ws.pages?.count})
    - Tables Count: ${expectedTablesCount} (API: ${ws.schema?.tableCount})
    - APIs Count: ${expectedApisCount} (API: ${ws.apis?.endpointCount})`);

    if (
      ws.organization?.name === expectedOrgName &&
      ws.application?.app_name === expectedAppName &&
      ws.application?.status === expectedAppStatus &&
      ws.pages?.count === expectedPagesCount &&
      ws.schema?.tableCount === expectedTablesCount &&
      ws.apis?.endpointCount === expectedApisCount
    ) {
      console.log('  ✓ TASK 2 PASSED: Designer Dashboard displays real dynamically calculated database metrics!');
      results['Designer Dashboard'] = 'PASS';
    } else {
      throw new Error('Designer dashboard data mismatch with PostgreSQL!');
    }

    const currentApp = dbApp.rows[0];

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 3 — MY APPLICATION & PERMITTED EDITING
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 3] Verifying My Application & Permitted Editing...');
    // 1. View assigned applications
    const appsListRes = await request('GET', '/api/designer/applications', null, designerHeaders);
    if (appsListRes.status !== 200 || appsListRes.data.length === 0) {
      throw new Error('Failed to list applications for designer');
    }
    console.log(`  Designer applications count: ${appsListRes.data.length}, App: "${appsListRes.data[0].app_name}"`);

    // 2. View application details
    const appDetailRes = await request('GET', `/api/designer/applications/${currentApp.id}`, null, designerHeaders);
    if (appDetailRes.status !== 200 || appDetailRes.data.id !== currentApp.id) {
      throw new Error('Failed to get application details');
    }

    // 3. Edit permitted info (app_description, status)
    console.log('  Editing application description via PUT /api/designer/applications/:id...');
    const updateAppRes = await request('PUT', `/api/designer/applications/${currentApp.id}`, {
      app_name: currentApp.app_name,
      app_description: 'Designer verified description ' + Date.now(),
      status: 'draft'
    }, designerHeaders);
    if (updateAppRes.status !== 200) throw new Error('Designer failed to update app permitted info');

    // 4. Verify persistence in PostgreSQL
    const checkDbApp = await pool.query('SELECT app_description FROM applications WHERE id = $1', [currentApp.id]);
    if (!checkDbApp.rows[0].app_description.startsWith('Designer verified description')) {
      throw new Error('Application update not persisted to PostgreSQL');
    }
    console.log('  ✓ Permitted application update persisted to PostgreSQL');

    // 5. Verify Designer CANNOT change organization ownership
    console.log('  Testing Business Rule: Designer cannot change organization ownership...');
    const attemptOrgHijack = await request('PUT', `/api/designer/applications/${currentApp.id}`, {
      organization_id: 9, // Attempt to transfer app to Org 9
      app_name: currentApp.app_name
    }, designerHeaders);
    const verifyOwnership = await pool.query('SELECT organization_id FROM applications WHERE id = $1', [currentApp.id]);
    if (verifyOwnership.rows[0].organization_id !== orgId) {
      throw new Error('SECURITY VIOLATION: Designer was able to alter organization_id!');
    }
    console.log(`  ✓ Organization ownership preserved in DB (Org ID: ${verifyOwnership.rows[0].organization_id})`);

    results['Application Context'] = 'PASS';
    results['Application Management'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 4 & 5 — APPLICATION DESIGNER, MODULE CRUD, PAGE CRUD, REORDERING
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 4 & 5] Verifying Application Designer (Pages & Modules CRUD)...');
    
    // --- MODULE CRUD ---
    console.log('  1. Testing Module CRUD...');
    // Create test module: "Student Management"
    const addModuleRes = await request('POST', `/api/designer/applications/${currentApp.id}/modules`, {
      name: 'Student Management',
      module_id: 'student_management',
      description: 'Module for managing students, courses and grades'
    }, designerHeaders);
    console.log('  Add module status:', addModuleRes.status, addModuleRes.data?.message);
    if (addModuleRes.status !== 201) throw new Error('Failed to create module');

    // Verify module stored in PostgreSQL modules and application_modules tables
    const checkModuleInDb = await pool.query('SELECT * FROM modules WHERE id = $1', ['student_management']);
    const checkAppModuleInDb = await pool.query('SELECT * FROM application_modules WHERE application_id = $1 AND module_id = $2', [currentApp.id, 'student_management']);
    if (checkModuleInDb.rows.length === 0 || checkAppModuleInDb.rows.length === 0) {
      throw new Error('Module "Student Management" not persisted in PostgreSQL');
    }
    console.log('  ✓ Module "Student Management" verified in PostgreSQL tables (modules & application_modules)');

    // List modules
    const listModulesRes = await request('GET', `/api/designer/applications/${currentApp.id}/modules`, null, designerHeaders);
    const hasStudentModule = listModulesRes.data.some(m => m.module_id === 'student_management');
    if (!hasStudentModule) throw new Error('Created module not returned in module list');
    console.log(`  ✓ Verified ${listModulesRes.data.length} modules associated with application in PostgreSQL`);

    // --- PAGE CRUD ---
    console.log('  2. Testing Page CRUD...');
    // Create page: "Student List"
    const cleanSlug = `student-list-${Date.now().toString().slice(-4)}`;
    console.log(`  Creating page "Student List" (slug: ${cleanSlug})...`);
    const createPageRes = await request('POST', `/api/designer/applications/${currentApp.id}/pages`, {
      name: 'Student List',
      slug: cleanSlug,
      title: 'Student Directory',
      description: 'Comprehensive directory of registered students',
      layout: { columns: 12, spacing: 'normal' },
      components: [
        { id: 'heading_1', type: 'heading', props: { text: 'Enrolled Students' } },
        { id: 'table_1', type: 'table', tableConfig: { tableName: 'students' } }
      ]
    }, designerHeaders);

    console.log('  Create page status:', createPageRes.status);
    if (createPageRes.status !== 201) throw new Error('Failed to create page: ' + JSON.stringify(createPageRes.data));
    const createdPage = createPageRes.data;
    console.log(`  ✓ Created page ID: ${createdPage.id}, Name: "${createdPage.name}", Slug: "${createdPage.slug}"`);

    // Verify page in PostgreSQL
    const checkPageInDb = await pool.query('SELECT * FROM application_pages WHERE id = $1', [createdPage.id]);
    if (checkPageInDb.rows.length === 0 || checkPageInDb.rows[0].name !== 'Student List') {
      throw new Error('Created page not found in PostgreSQL');
    }
    console.log('  ✓ Page verified in PostgreSQL application_pages table');

    // Edit page
    console.log('  Editing page title and description...');
    const editPageRes = await request('PUT', `/api/designer/applications/${currentApp.id}/pages/${createdPage.id}`, {
      name: 'Student List',
      slug: cleanSlug,
      title: 'Active Students Directory',
      description: 'Updated description for student list'
    }, designerHeaders);
    if (editPageRes.status !== 200 || editPageRes.data.title !== 'Active Students Directory') {
      throw new Error('Failed to edit page');
    }
    console.log('  ✓ Page edited and confirmed');

    // Page reordering test
    console.log('  Testing Page Reordering...');
    const reorderRes = await request('PUT', `/api/designer/applications/${currentApp.id}/pages/${createdPage.id}`, {
      order_index: 0
    }, designerHeaders);
    if (reorderRes.status !== 200) throw new Error('Failed to update page order_index');
    const dbOrderCheck = await pool.query('SELECT order_index FROM application_pages WHERE id = $1', [createdPage.id]);
    if (dbOrderCheck.rows[0].order_index !== 0) throw new Error('Page order_index not updated in DB');
    console.log('  ✓ Page reordering verified in PostgreSQL');

    results['Module CRUD'] = 'PASS';
    results['Page CRUD'] = 'PASS';
    results['Module Persistence'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 6 — DATABASE SCHEMA INTEGRATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 6] Verifying Database Schema Integration...');
    const schemaRes = await request('GET', `/api/designer/applications/${currentApp.id}/schema`, null, designerHeaders);
    if (schemaRes.status !== 200) throw new Error('Failed to load schema for designer');
    console.log(`  Current schema has ${schemaRes.data.tables?.length || 0} tables`);

    // Designer updates schema
    const updatedSchemaData = {
      tables: [
        ...(schemaRes.data.tables || []),
        {
          id: 'tbl_grades',
          name: 'grades',
          columns: [
            { id: 'g1', name: 'grade_id', type: 'integer', primaryKey: true },
            { id: 'g2', name: 'student_id', type: 'integer', primaryKey: false },
            { id: 'g3', name: 'score', type: 'varchar', primaryKey: false }
          ]
        }
      ]
    };

    console.log('  Designer adding table "grades" to application schema...');
    const saveSchemaRes = await request('PUT', `/api/designer/applications/${currentApp.id}/schema`, {
      schema_data: updatedSchemaData
    }, designerHeaders);
    if (saveSchemaRes.status !== 200) throw new Error('Designer failed to update schema');

    // Verify in PostgreSQL
    const dbSchemaAfter = await pool.query('SELECT schema_data FROM database_schemas WHERE application_id = $1', [currentApp.id]);
    const hasGrades = dbSchemaAfter.rows[0].schema_data.tables.some(t => t.name === 'grades');
    if (!hasGrades) throw new Error('Table "grades" not persisted in database_schemas');
    console.log('  ✓ Schema change successfully persisted in PostgreSQL database_schemas');

    results['Database Schema Integration'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 7 — REST API INTEGRATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 7] Verifying REST API Integration...');
    const apisRes = await request('GET', `/api/designer/applications/${currentApp.id}/apis`, null, designerHeaders);
    if (apisRes.status !== 200) throw new Error('Failed to load APIs for designer');
    console.log(`  Current APIs have ${apisRes.data.endpoints?.length || 0} endpoints`);

    // Designer updates APIs
    const updatedApisData = {
      endpoints: [
        ...(apisRes.data.endpoints || []),
        { id: 'ep_grades', method: 'GET', path: '/api/grades', description: 'Retrieve student grades' }
      ]
    };

    console.log('  Designer adding endpoint "/api/grades" to application APIs...');
    const saveApisRes = await request('PUT', `/api/designer/applications/${currentApp.id}/apis`, {
      api_data: updatedApisData
    }, designerHeaders);
    if (saveApisRes.status !== 200) throw new Error('Designer failed to update APIs');

    // Verify in PostgreSQL
    const dbApisAfter = await pool.query('SELECT api_data FROM apis WHERE application_id = $1', [currentApp.id]);
    const hasGradesApi = dbApisAfter.rows[0].api_data.endpoints.some(e => e.path === '/api/grades');
    if (!hasGradesApi) throw new Error('Endpoint "/api/grades" not persisted in apis table');
    console.log('  ✓ REST API change successfully persisted in PostgreSQL apis table');

    results['REST API Integration'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 8 — APPLICATION PREVIEW
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 8] Verifying Application Preview...');
    const builderRes = await request('GET', `/api/designer/applications/${currentApp.id}/builder`, null, designerHeaders);
    if (builderRes.status !== 200) throw new Error('Failed to fetch full builder state for preview');
    const builderData = builderRes.data;

    console.log(`  Builder state loaded:
    - Pages: ${builderData.pages?.length}
    - Modules: ${builderData.modules?.length}
    - Brand Name: "${builderData.navigation?.settings?.brandName}"`);

    // Confirm Student Management module and Student List page appear in application structure
    const hasStudentModuleInBuilder = builderData.modules?.some(m => m.module_id === 'student_management' || m.name === 'Student Management');
    const hasStudentPageInBuilder = builderData.pages?.some(p => p.name === 'Student List');

    if (!hasStudentModuleInBuilder) {
      throw new Error('Module "Student Management" not found in builder/preview structure');
    }
    if (!hasStudentPageInBuilder) {
      throw new Error('Page "Student List" not found in builder/preview structure');
    }
    console.log('  ✓ "Student Management" module and "Student List" page verified in application preview structure!');
    results['Application Preview'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 9 — AUTHORIZATION & CROSS-ORGANIZATION SECURITY
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 9] Testing Authorization & Cross-Organization Security Boundaries...');

    // 1. Org 9 setup (create temporary app in Org 9 to test cross-tenant isolation)
    console.log('  Setting up Org 9 test application...');
    const org9Login = await request('POST', '/api/login', { email: 'xyz123@gmail.com', password: 'xyz@123' });
    const org9User = org9Login.data.user;
    const org9Headers = {
      'X-Org-Id': String(org9User.organizationId),
      'X-User-Id': String(org9User.id),
      'X-User-Email': org9User.email,
      'X-User-Role': org9User.role
    };

    const org9CreateApp = await request('POST', '/api/org/applications', {
      app_name: 'Org 9 Target Application',
      industry: 'Retail'
    }, org9Headers);
    const org9AppId = org9CreateApp.data.application.id;
    console.log(`  Created Org 9 Application ID: ${org9AppId}`);

    // 2. Designer from Org 7 attempts cross-organization access to Org 9 app
    console.log(`  Testing: Org 7 Designer (${designer.email}) attempting to access Org 9 Application (${org9AppId})...`);
    const crossGetApp = await request('GET', `/api/designer/applications/${org9AppId}`, null, designerHeaders);
    const crossPutApp = await request('PUT', `/api/designer/applications/${org9AppId}`, { app_name: 'Hacked' }, designerHeaders);
    const crossGetSchema = await request('GET', `/api/designer/applications/${org9AppId}/schema`, null, designerHeaders);
    const crossPutSchema = await request('PUT', `/api/designer/applications/${org9AppId}/schema`, { schema_data: {} }, designerHeaders);
    const crossGetApis = await request('GET', `/api/designer/applications/${org9AppId}/apis`, null, designerHeaders);
    const crossPutApis = await request('PUT', `/api/designer/applications/${org9AppId}/apis`, { api_data: {} }, designerHeaders);
    const crossGetPages = await request('GET', `/api/designer/applications/${org9AppId}/pages`, null, designerHeaders);
    const crossPostPage = await request('POST', `/api/designer/applications/${org9AppId}/pages`, { name: 'Hacked Page' }, designerHeaders);
    const crossGetBuilder = await request('GET', `/api/designer/applications/${org9AppId}/builder`, null, designerHeaders);

    console.log(`  Cross-organization attempt results:
    - GET App: HTTP ${crossGetApp.status} (Expected 403)
    - PUT App: HTTP ${crossPutApp.status} (Expected 403)
    - GET Schema: HTTP ${crossGetSchema.status} (Expected 403)
    - PUT Schema: HTTP ${crossPutSchema.status} (Expected 403)
    - GET APIs: HTTP ${crossGetApis.status} (Expected 403)
    - PUT APIs: HTTP ${crossPutApis.status} (Expected 403)
    - GET Pages: HTTP ${crossGetPages.status} (Expected 403)
    - POST Page: HTTP ${crossPostPage.status} (Expected 403)
    - GET Builder: HTTP ${crossGetBuilder.status} (Expected 403)`);

    if (
      crossGetApp.status !== 403 ||
      crossPutApp.status !== 403 ||
      crossGetSchema.status !== 403 ||
      crossPutSchema.status !== 403 ||
      crossGetApis.status !== 403 ||
      crossPutApis.status !== 403 ||
      crossGetPages.status !== 403 ||
      crossPostPage.status !== 403 ||
      crossGetBuilder.status !== 403
    ) {
      throw new Error('SECURITY BREACH: Designer was able to access another organization application!');
    }
    console.log('  ✓ ALL cross-organization operations strictly rejected with 403 Forbidden!');

    // 3. Designer attempts to access System Admin functions
    console.log('  Testing Designer access to System Admin endpoints...');
    const desAccessSysStats = await request('GET', '/api/sysadmin/stats', null, designerHeaders);
    const desAccessSysUsers = await request('GET', '/api/sysadmin/users', null, designerHeaders);
    const desAccessOrgDetail = await request('GET', '/api/organizations/1', null, designerHeaders);
    console.log(`  Designer accessing sysadmin routes: stats=${desAccessSysStats.status}, users=${desAccessSysUsers.status}, orgDetail=${desAccessOrgDetail.status}`);
    if (desAccessSysStats.status !== 403 || desAccessSysUsers.status !== 403 || desAccessOrgDetail.status !== 403) {
      throw new Error('SECURITY BREACH: Designer was not blocked with 403 from System Admin endpoints!');
    }
    console.log('  ✓ Designer strictly blocked from all System Admin functions with 403 Forbidden');

    // 4. Designer attempts to access Org Admin management functions
    console.log('  Testing Designer access to Org Admin management endpoints...');
    const desCreateUser = await request('POST', '/api/org/users', { name: 'Fail', email: 'fail@fail.com' }, designerHeaders);
    const desUpdateOrgProfile = await request('PUT', '/api/org/profile', { name: 'Fail' }, designerHeaders);
    console.log(`  Designer accessing org admin routes: createUser=${desCreateUser.status}, updateProfile=${desUpdateOrgProfile.status}`);
    if (desCreateUser.status === 200 || desUpdateOrgProfile.status === 200) {
      throw new Error('SECURITY BREACH: Designer accessed Org Admin functions!');
    }
    console.log('  ✓ Designer blocked from Org Admin functions');

    // Cleanup Org 9 test app
    await request('DELETE', `/api/org/applications/${org9AppId}`, null, org9Headers);
    console.log('  ✓ Cleaned up Org 9 test application');

    results['Cross-Organization Security'] = 'PASS';
    results['Authorization'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 10 & 11 — DATABASE PERSISTENCE, REFRESH & ERROR HANDLING
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 10 & 11] Verifying Refresh Persistence & Error Handling...');
    
    // Simulate refresh by querying PostgreSQL directly on all created entities
    const persistPage = await pool.query('SELECT name, title, description FROM application_pages WHERE id = $1', [createdPage.id]);
    const persistModule = await pool.query('SELECT module_id FROM application_modules WHERE application_id = $1 AND module_id = $2', [currentApp.id, 'student_management']);
    const persistSchema = await pool.query('SELECT schema_data FROM database_schemas WHERE application_id = $1', [currentApp.id]);
    const persistApis = await pool.query('SELECT api_data FROM apis WHERE application_id = $1', [currentApp.id]);

    console.log('  Persistence check diagnostics:', {
      pageMatch: persistPage.rows.length === 1 && persistPage.rows[0].name === 'Student List',
      moduleMatch: persistModule.rows.length >= 1,
      schemaTables: persistSchema.rows[0]?.schema_data?.tables?.map(t => t.name),
      apiEndpoints: persistApis.rows[0]?.api_data?.endpoints?.map(e => e.path)
    });

    if (
      persistPage.rows.length === 1 &&
      persistPage.rows[0].name === 'Student List' &&
      persistModule.rows.length >= 1 &&
      persistSchema.rows[0]?.schema_data?.tables?.some(t => t.name === 'grades') &&
      persistApis.rows[0]?.api_data?.endpoints?.some(e => e.path === '/api/grades')
    ) {
      console.log('  ✓ Verified 100% data persistence in PostgreSQL across pages, modules, schemas, and APIs');
      results['Refresh Persistence'] = 'PASS';
      results['PostgreSQL Integration'] = 'PASS';
    } else {
      throw new Error(`Database persistence verification failed in PostgreSQL. Page=${persistPage.rows.length}, Module=${persistModule.rows.length}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CLEANUP OF TEST ARTIFACTS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[CLEANUP] Cleaning up test artifacts...');
    // Delete test page created during test
    await request('DELETE', `/api/designer/applications/${currentApp.id}/pages/${createdPage.id}`, null, designerHeaders);
    // Delete test module
    await request('DELETE', `/api/designer/applications/${currentApp.id}/modules/student_management`, null, designerHeaders);
    // Revert schema and apis to initial tables/endpoints
    const cleanTables = (schemaRes.data.tables || []).filter(t => t.name !== 'grades');
    await request('PUT', `/api/designer/applications/${currentApp.id}/schema`, { schema_data: { tables: cleanTables } }, designerHeaders);
    const cleanApis = (apisRes.data.endpoints || []).filter(e => e.path !== '/api/grades');
    await request('PUT', `/api/designer/applications/${currentApp.id}/apis`, { api_data: { endpoints: cleanApis } }, designerHeaders);
    console.log('  ✓ Cleaned up test page, test module, test schema tables, and test API endpoints');

    // ──────────────────────────────────────────────────────────────────────────
    // FINAL REPORT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n===============================================================');
    console.log('TASK 13 — FINAL DESIGNER MODULE VERIFICATION REPORT');
    console.log('===============================================================\n');

    const checklist = [
      'Designer Login',
      'Designer Dashboard',
      'Application Context',
      'Application Management',
      'Module CRUD',
      'Page CRUD',
      'Module Persistence',
      'Database Schema Integration',
      'REST API Integration',
      'Application Preview',
      'Cross-Organization Security',
      'Authentication',
      'Authorization',
      'Refresh Persistence',
      'PostgreSQL Integration'
    ];

    let allPassed = true;
    for (const item of checklist) {
      const status = results[item] || 'FAIL';
      console.log(`  ${item.padEnd(28)} : [${status}]`);
      if (status !== 'PASS') allPassed = false;
    }

    console.log('\n===============================================================');
    if (allPassed) {
      console.log('  FINAL RESULT: ALL 15 VERIFICATION CRITERIA PASSED! ✓');
    } else {
      console.log('  FINAL RESULT: SOME TESTS FAILED!');
      process.exitCode = 1;
    }
    console.log('===============================================================\n');

  } catch (err) {
    console.error('\n❌ DESIGNER WORKFLOW TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDesignerVerification();
