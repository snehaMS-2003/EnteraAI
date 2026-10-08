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

async function runDesignerE2ETests() {
  console.log('=== STARTING DESIGNER & APPLICATION BUILDER E2E TESTS ===\n');
  const pool = getDB();
  await pool.query(`
    UPDATE database_schemas SET schema_data = $1 WHERE application_id = 5
  `, [JSON.stringify({
    tables: [
      {
        id: 'tbl_students',
        name: 'students',
        columns: [
          { id: 'c1', name: 'stud_id', type: 'varchar', primaryKey: true },
          { id: 'c2', name: 'stud_name', type: 'varchar', primaryKey: false },
          { id: 'c3', name: 'email', type: 'varchar', primaryKey: false },
          { id: 'c4', name: 'phone', type: 'varchar', primaryKey: false },
          { id: 'c5', name: 'course', type: 'varchar', primaryKey: false },
          { id: 'c6', name: 'status', type: 'varchar', primaryKey: false }
        ]
      },
      {
        id: 'tbl_courses',
        name: 'courses',
        columns: [
          { id: 'c10', name: 'course_code', type: 'varchar', primaryKey: true },
          { id: 'c11', name: 'course_name', type: 'varchar', primaryKey: false },
          { id: 'c12', name: 'credits', type: 'integer', primaryKey: false }
        ]
      }
    ]
  })]);

  try {
    // 1. DESIGNER LOGIN AND ACCESS
    console.log('1. Testing Designer Login (sneha123@gmail.com)...');
    const loginRes = await request('POST', '/api/login', {
      email: 'sneha123@gmail.com',
      password: 'password123'
    });
    console.log('   Login Status:', loginRes.status);
    if (loginRes.status !== 200 || !loginRes.data.user) {
      throw new Error('Designer login failed: ' + JSON.stringify(loginRes.data));
    }
    const user = loginRes.data.user;
    console.log(`   Logged in as: ${user.name} (${user.email}), Role: ${user.role}, Org ID: ${user.organizationId}`);
    if (user.role !== 'designer') throw new Error('Role must be designer');
    if (user.organizationId !== 7) throw new Error('Designer organization must be 7');

    const authHeaders = {
      'x-org-id': String(user.organizationId),
      'x-user-id': String(user.id),
      'x-user-email': user.email,
      'x-user-role': user.role
    };

    // 2. SECURITY ROOT CAUSE TESTS
    console.log('\n2. Security Tests:');
    console.log('   2a. Testing Cross-Organization Application Access Prevention...');
    // Try to access App 5 as a user from another org (Som in org 9)
    const crossOrgRes = await request('GET', '/api/designer/applications/5/builder', null, {
      'x-org-id': '9',
      'x-user-id': '19',
      'x-user-email': 'xyz123@gmail.com',
      'x-user-role': 'org_admin'
    });
    console.log('       Cross-org access response:', crossOrgRes.status, crossOrgRes.data.error || crossOrgRes.data);
    if (crossOrgRes.status !== 403) throw new Error('Cross-org access must be forbidden with 403');
    console.log('       [PASS] Cross-organization access correctly blocked.');

    console.log('   2b. Testing Client Org-ID Spoofing Prevention...');
    // Designer sends spoofed x-org-id: 999 - backend must enforce user's real DB organization_id (7)
    const spoofRes = await request('GET', '/api/designer/workspace', null, {
      'x-org-id': '999',
      'x-user-id': String(user.id),
      'x-user-email': user.email,
      'x-user-role': user.role
    });
    console.log('       Spoofed x-org-id workspace org:', spoofRes.data.organization?.id, spoofRes.data.organization?.name);
    if (spoofRes.data.organization?.id !== 7) throw new Error('Backend must bind to real user org from DB, not client header');
    console.log('       [PASS] Backend securely enforced database org_id.');

    console.log('   2c. Testing System Admin-only access rejection...');
    const sysAdminEndpointRes = await request('GET', '/api/organizations/1', null, authHeaders);
    console.log('       Designer accessing sysadmin endpoint:', sysAdminEndpointRes.status);
    if (sysAdminEndpointRes.status !== 403 && sysAdminEndpointRes.status !== 404) {
      throw new Error('Designer must not access sysadmin endpoints');
    }
    console.log('       [PASS] SysAdmin endpoint access prevented.');

    // 3. DESIGNER DASHBOARD / WORKSPACE
    console.log('\n3. Testing Designer Workspace API (/api/designer/workspace)...');
    const wsRes = await request('GET', '/api/designer/workspace', null, authHeaders);
    console.log('   Workspace Status:', wsRes.status);
    if (wsRes.status !== 200) throw new Error('Workspace failed: ' + JSON.stringify(wsRes.data));
    const ws = wsRes.data;
    console.log(`   Organization: ${ws.organization.name} (#${ws.organization.id})`);
    console.log(`   Application: ${ws.application.app_name} (#${ws.application.id}, status: ${ws.application.status})`);
    console.log(`   Database Schema: ${ws.schema.tableCount} tables (${ws.schema.tables.map(t=>t.name).join(', ')})`);
    console.log(`   REST APIs: ${ws.apis.endpointCount} endpoints (${ws.apis.endpoints.map(e=>e.method + ' ' + e.path).join(', ')})`);
    if (!ws.application || ws.application.id !== 5) throw new Error('Expected application 5');
    if (!ws.schema.hasSchema || ws.schema.tableCount < 2) throw new Error('Expected schema with tables');
    if (!ws.apis.hasApis || ws.apis.endpointCount < 3) throw new Error('Expected REST APIs');
    console.log('   [PASS] Designer Workspace loaded with real backend/database data.');

    // 4. DESIGNER APPLICATIONS LIST
    console.log('\n4. Testing GET /api/designer/applications...');
    const appsRes = await request('GET', '/api/designer/applications', null, authHeaders);
    console.log('   Apps Status:', appsRes.status, 'Count:', appsRes.data.length);
    if (appsRes.status !== 200 || appsRes.data.length === 0) throw new Error('Applications list failed');
    console.log(`   Found application: "${appsRes.data[0].app_name}" (ID: ${appsRes.data[0].id})`);
    console.log('   [PASS] Applications list returned organization application.');

    // 5. APPLICATION BUILDER INITIALIZATION
    console.log('\n5. Testing GET /api/designer/applications/5/builder...');
    const builderRes = await request('GET', '/api/designer/applications/5/builder', null, authHeaders);
    console.log('   Builder Status:', builderRes.status);
    if (builderRes.status !== 200) throw new Error('Builder data failed: ' + JSON.stringify(builderRes.data));
    console.log(`   Application: ${builderRes.data.application.app_name}`);
    console.log(`   Pages count: ${builderRes.data.pages.length}`);
    console.log(`   Schema tables: ${builderRes.data.schema.tables.map(t=>t.name).join(', ')}`);
    console.log(`   REST APIs: ${builderRes.data.apis.endpoints.map(e=>e.path).join(', ')}`);
    console.log('   [PASS] Builder initialization successful.');

    // 6. PAGE MANAGEMENT: CREATE PAGE
    console.log('\n6. Testing Page Management: Create Page...');
    // Ensure clean slate if page from prior run exists
    const existingRegPage = builderRes.data.pages.find(p => p.slug === 'students-registration');
    if (existingRegPage) {
      await request('DELETE', `/api/designer/applications/5/pages/${existingRegPage.id}`, null, authHeaders);
    }

    const createPageRes = await request('POST', '/api/designer/applications/5/pages', {
      name: 'Students Registration',
      slug: 'students-registration',
      title: 'Student Registration Portal',
      description: 'Enter new student records and course enrollments'
    }, authHeaders);
    console.log('   Create Page Status:', createPageRes.status);
    if (createPageRes.status !== 201) {
      throw new Error('Create page failed: ' + JSON.stringify(createPageRes.data));
    }
    const regPage = createPageRes.data;
    console.log(`   Page Created: "${regPage.name}" (Slug: ${regPage.slug}, ID: ${regPage.id})`);
    console.log('   [PASS] Page created in PostgreSQL.');

    // 7. COMPONENT CONFIGURATION & DATABASE / API BINDING
    console.log('\n7. Testing Component Configuration & Bindings on Screen...');
    const componentsToSave = [
      {
        id: 'comp_reg_heading',
        type: 'heading',
        name: 'reg_title',
        text: 'New Student Admission & Registration',
        level: 'h2',
        colSpan: 12
      },
      {
        id: 'comp_student_form',
        type: 'form',
        name: 'student_registration_form',
        label: 'Student Information Form',
        submitLabel: 'Register Student Now',
        colSpan: 12,
        apiBinding: { endpoint: 'POST /api/students', method: 'POST' }
      },
      {
        id: 'comp_input_stud_id',
        type: 'input',
        name: 'stud_id_field',
        label: 'Student ID',
        placeholder: 'e.g. STU-2026-001',
        required: true,
        colSpan: 6,
        dataBinding: { table: 'students', column: 'stud_id' }
      },
      {
        id: 'comp_input_name',
        type: 'input',
        name: 'stud_name_field',
        label: 'Full Name',
        placeholder: 'Enter full name',
        required: true,
        colSpan: 6,
        dataBinding: { table: 'students', column: 'stud_name' }
      },
      {
        id: 'comp_input_email',
        type: 'input',
        name: 'email_field',
        label: 'Email Address',
        placeholder: 'student@university.edu',
        inputType: 'email',
        required: true,
        colSpan: 6,
        dataBinding: { table: 'students', column: 'email' }
      },
      {
        id: 'comp_select_course',
        type: 'select',
        name: 'course_field',
        label: 'Course Selection',
        placeholder: '-- Select Course --',
        colSpan: 6,
        dataBinding: { table: 'courses', column: 'course_name' },
        selectOptions: [
          { label: 'Computer Science', value: 'CS101' },
          { label: 'Data Science', value: 'DS201' }
        ]
      },
      {
        id: 'comp_enroll_date',
        type: 'date',
        name: 'enroll_date_field',
        label: 'Admission Date',
        required: true,
        colSpan: 6
      },
      {
        id: 'comp_terms_check',
        type: 'checkbox',
        name: 'agree_terms_field',
        label: 'I confirm all student records are accurate',
        required: true,
        colSpan: 6
      },
      {
        id: 'comp_submit_btn',
        type: 'button',
        name: 'submit_student_btn',
        label: 'Submit Registration',
        colSpan: 6,
        styling: { variant: 'primary' },
        buttonConfig: { actionType: 'api', apiEndpoint: 'POST /api/students' }
      },
      {
        id: 'comp_students_table',
        type: 'table',
        name: 'students_list_table',
        label: 'Registered Students List',
        colSpan: 12,
        tableConfig: {
          tableName: 'students',
          columns: ['stud_id', 'stud_name', 'email'],
          apiEndpoint: 'GET /api/students'
        }
      }
    ];

    // 8. BASIC VALIDATION TESTS
    console.log('\n8. Testing Configuration Validation:');
    console.log('   8a. Testing duplicate component identifier detection...');
    const duplicateComponents = [
      ...componentsToSave,
      { id: 'comp_dup_1', type: 'input', name: 'stud_id_field', label: 'Duplicate Field' }
    ];
    const dupTestRes = await request('POST', '/api/designer/applications/5/builder/validate', {
      pages: [{ name: 'Test Page', slug: 'test-page', components: duplicateComponents }]
    }, authHeaders);
    console.log('       Duplicate check valid:', dupTestRes.data.valid, 'Errors:', dupTestRes.data.errors);
    if (dupTestRes.data.valid !== false) throw new Error('Duplicate ID should fail validation');
    console.log('       [PASS] Duplicate component identifier caught.');

    console.log('   8b. Testing non-existent database table/column reference...');
    const invalidDbComponents = [
      { id: 'comp_bad_db', type: 'input', name: 'fake_field', dataBinding: { table: 'non_existent_table', column: 'fake_col' } }
    ];
    const badDbRes = await request('POST', '/api/designer/applications/5/builder/validate', {
      pages: [{ name: 'Test Page', slug: 'test-page-2', components: invalidDbComponents }]
    }, authHeaders);
    console.log('       Invalid DB reference valid:', badDbRes.data.valid, 'Errors:', badDbRes.data.errors);
    if (badDbRes.data.valid !== false) throw new Error('Invalid DB reference should fail validation');
    console.log('       [PASS] Invalid database reference caught.');

    console.log('   8c. Testing non-existent REST API reference...');
    const invalidApiComponents = [
      { id: 'comp_bad_api', type: 'button', name: 'fake_btn', buttonConfig: { actionType: 'api', apiEndpoint: 'DELETE /api/nonexistent' } }
    ];
    const badApiRes = await request('POST', '/api/designer/applications/5/builder/validate', {
      pages: [{ name: 'Test Page', slug: 'test-page-3', components: invalidApiComponents }]
    }, authHeaders);
    console.log('       Invalid API reference valid:', badApiRes.data.valid, 'Errors:', badApiRes.data.errors);
    if (badApiRes.data.valid !== false) throw new Error('Invalid API reference should fail validation');
    console.log('       [PASS] Invalid API reference caught.');

    // 9. SAVE BUILDER CONFIGURATION TO POSTGRESQL
    console.log('\n9. Testing Builder Configuration Atomic Save to PostgreSQL...');
    // Prepare pages payload with Dashboard and Students Registration
    const pagesToSave = [
      {
        id: builderRes.data.pages[0]?.id,
        name: 'Dashboard',
        slug: 'dashboard',
        title: 'Application Dashboard',
        components: [
          {
            id: 'comp_dash_metric',
            type: 'metric',
            name: 'total_students_metric',
            label: 'Total Registered Students',
            value: '42',
            subtitle: '+8 this week',
            colSpan: 6
          },
          {
            id: 'comp_dash_table',
            type: 'table',
            name: 'recent_students_table',
            label: 'Recent Registrations',
            colSpan: 12,
            tableConfig: {
              tableName: 'students',
              columns: ['stud_id', 'stud_name', 'email'],
              apiEndpoint: 'GET /api/students'
            }
          }
        ],
        is_home: true
      },
      {
        id: regPage.id,
        name: 'Students Registration',
        slug: 'students-registration',
        title: 'Student Registration Portal',
        components: componentsToSave,
        is_home: false
      }
    ];

    const saveRes = await request('PUT', '/api/designer/applications/5/builder/save', {
      pages: pagesToSave,
      navigation: {
        nav_items: [
          { id: 'nav_dash', label: 'Dashboard', pageSlug: 'dashboard' },
          { id: 'nav_reg', label: 'Student Registration', pageSlug: 'students-registration' }
        ],
        settings: {
          brandName: 'Student Management System',
          style: 'sidebar',
          theme: 'dark'
        }
      }
    }, authHeaders);

    console.log('   Save Status:', saveRes.status);
    if (saveRes.status !== 200) throw new Error('Save configuration failed: ' + JSON.stringify(saveRes.data));
    console.log(`   Save Message: "${saveRes.data.message}"`);
    console.log(`   Saved Pages: ${saveRes.data.pages.length}`);
    console.log('   [PASS] Saved full configuration to PostgreSQL.');

    // 10. BROWSER REFRESH SIMULATION: VERIFY CONFIGURATION PERSISTS
    console.log('\n10. Testing Browser Refresh Simulation (Full Reload from DB)...');
    const reloadRes = await request('GET', '/api/designer/applications/5/builder', null, authHeaders);
    console.log('   Reload Status:', reloadRes.status);
    if (reloadRes.status !== 200) throw new Error('Reload failed: ' + JSON.stringify(reloadRes.data));
    const reloadedPages = reloadRes.data.pages;
    console.log(`   Reloaded pages count: ${reloadedPages.length}`);
    const regPageReloaded = reloadedPages.find(p => p.slug === 'students-registration');
    if (!regPageReloaded) throw new Error('Could not find students-registration page after reload');
    console.log(`   Found page: "${regPageReloaded.name}" with ${regPageReloaded.components.length} components.`);

    // Direct PostgreSQL Verification
    console.log('\n11. Direct PostgreSQL Database Record Verification:');
    const dbCheck = await pool.query(
      'SELECT id, application_id, name, slug, jsonb_array_length(components) as comp_count FROM application_pages WHERE application_id = 5 ORDER BY order_index ASC'
    );
    console.log('   PostgreSQL application_pages rows:');
    dbCheck.rows.forEach(r => console.log(`   - ID ${r.id}: "${r.name}" (slug: ${r.slug}, components: ${r.comp_count})`));
    if (dbCheck.rows.length < 2) throw new Error('Expected at least 2 pages in application_pages table');

    const navCheck = await pool.query('SELECT * FROM application_navigation WHERE application_id = 5');
    console.log(`   PostgreSQL application_navigation: ${navCheck.rows.length} record found.`);
    if (navCheck.rows.length === 0) throw new Error('Expected navigation record');
    console.log('   [PASS] PostgreSQL records verified directly.');

    console.log('\n=== ALL DESIGNER & APPLICATION BUILDER TESTS COMPLETED SUCCESSFULLY! ===\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    process.exit(1);
  }
}

runDesignerE2ETests();
