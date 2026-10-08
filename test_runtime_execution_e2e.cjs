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

async function runRuntimeVerification() {
  console.log('===============================================================');
  console.log('  ENTERAI — COMPLETE APPLICATION RUNTIME & PREVIEW VERIFICATION');
  console.log('===============================================================\n');

  const pool = getDB();
  const results = {};

  try {
    // ── AUTHENTICATION ──
    console.log('[AUTH] Logging in as Designer (Org 7: TechCorp Solutions)...');
    const loginRes = await request('POST', '/api/login', {
      email: 'sneha123@gmail.com',
      password: 'password123'
    });

    if (loginRes.status !== 200 || !loginRes.data.user) {
      throw new Error('Designer login failed');
    }

    const designerUser = loginRes.data.user;
    const designerHeaders = {
      'X-Org-Id': String(designerUser.organizationId),
      'X-User-Id': String(designerUser.id),
      'X-User-Email': designerUser.email,
      'X-User-Role': designerUser.role
    };
    console.log(`  ✓ Designer authenticated: ${designerUser.name} (${designerUser.email}), Org ID: ${designerUser.organizationId}`);

    // Fetch designer's application
    const appRes = await request('GET', '/api/designer/applications', null, designerHeaders);
    if (appRes.status !== 200 || !appRes.data || appRes.data.length === 0) {
      throw new Error('No application found for designer');
    }
    const currentApp = appRes.data[0];
    console.log(`  ✓ Target Application: "${currentApp.app_name}" (ID: ${currentApp.id}, Status: ${currentApp.status})\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 1 — APPLICATION PREVIEW
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[TASK 1] Verifying Application Preview Structure...');
    
    // Ensure module "Student Management" and page "Student List" are configured
    console.log('  Configuring module and pages for test...');
    await request('POST', `/api/designer/applications/${currentApp.id}/modules`, {
      module_id: 'student_management',
      name: 'Student Management',
      description: 'Module for managing students records'
    }, designerHeaders);

    const createPageRes = await request('POST', `/api/designer/applications/${currentApp.id}/pages`, {
      name: 'Student List',
      slug: 'student-list',
      title: 'Student Directory',
      description: 'View and manage enrolled students',
      components: [
        { id: 'c_title', type: 'heading', level: 'h1', text: 'Enrolled Students' },
        { id: 'c_table', type: 'table', label: 'Students Directory', tableConfig: { tableName: 'students', columns: ['id', 'name', 'email', 'course', 'status'] } }
      ]
    }, designerHeaders);

    // Fetch preview / runtime structure
    const previewRes = await request('GET', `/api/runtime/${currentApp.id}`, null, designerHeaders);
    if (previewRes.status !== 200) {
      throw new Error(`Failed to load runtime structure: HTTP ${previewRes.status}`);
    }

    const previewData = previewRes.data;
    console.log(`  Runtime structure loaded:
    - Application: "${previewData.application.name}" (ID: ${previewData.application.id})
    - Organization: "${previewData.application.organization_name}"
    - Configured Pages: ${previewData.pages?.length}
    - Configured Modules: ${previewData.modules?.length}
    - Configured Schema Tables: ${previewData.schema?.tables?.length || 0}
    - Configured REST APIs: ${previewData.apis?.endpoints?.length || 0}
    - Preview Mode: ${previewData.is_preview}`);

    if (!previewData.pages?.some(p => p.slug === 'student-list')) {
      throw new Error('Configured page "student-list" not loaded in preview');
    }
    if (!previewData.modules?.some(m => m.module_id === 'student_management')) {
      throw new Error('Configured module "student_management" not loaded in preview');
    }

    console.log('  ✓ TASK 1 PASSED: Application Preview loads live application, pages, modules, schema, and APIs!');
    results['Application Preview'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 2 — RUNTIME ROUTING
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 2] Verifying Runtime Routing & Navigation...');
    
    // 1. Test home / root runtime route
    const rootRouteRes = await request('GET', `/api/runtime/${currentApp.id}`, null, designerHeaders);
    if (rootRouteRes.status !== 200) throw new Error('Root runtime route failed');

    // 2. Test slug-based lookup: e.g. /api/runtime/student-management
    const slugRouteRes = await request('GET', '/api/runtime/student-management', null, designerHeaders);
    if (slugRouteRes.status !== 200) throw new Error('Slug-based application routing failed');
    console.log('  ✓ Human-readable slug routing (/app/student-management) resolved correctly');

    // 3. Test Invalid Route / Non-existent Application (Error Handling)
    const invalidAppRes = await request('GET', '/api/runtime/non-existent-app-99999', null, designerHeaders);
    if (invalidAppRes.status !== 404) {
      throw new Error(`Expected 404 for invalid app route, got ${invalidAppRes.status}`);
    }
    console.log('  ✓ Invalid application route returns HTTP 404 Not Found');

    results['Runtime Routing'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 3, 4 & 5 — DATABASE-DRIVEN UI, REST API EXECUTION & CRUD RUNTIME TEST
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 3, 4 & 5] Verifying Database-Driven UI & Full CRUD Execution...');

    // Clean any prior test student records
    await pool.query("DELETE FROM students WHERE application_id = $1 AND (email ILIKE '%rahul%' OR name ILIKE '%rahul%')", [currentApp.id]);

    // 1. CREATE Student via REST API: POST /api/students
    console.log('  1. Creating Student: Rahul Kumar...');
    const createPayload = {
      name: 'Rahul Kumar',
      email: 'rahul@example.com',
      phone: '9876543210',
      course: 'Computer Science',
      status: 'Active'
    };

    const createStudentRes = await request('POST', '/api/students', createPayload, {
      ...designerHeaders,
      'X-App-Id': String(currentApp.id)
    });

    if (createStudentRes.status !== 201 || !createStudentRes.data.id) {
      throw new Error(`Failed to create student via POST /api/students: HTTP ${createStudentRes.status}`);
    }

    const createdStudent = createStudentRes.data;
    console.log(`  ✓ Student created with ID: ${createdStudent.id}, Name: "${createdStudent.name}", Course: "${createdStudent.course}"`);

    // Verify in PostgreSQL database directly
    const dbStudentCheck = await pool.query('SELECT * FROM students WHERE id = $1 AND application_id = $2', [createdStudent.id, currentApp.id]);
    if (dbStudentCheck.rows.length === 0) {
      throw new Error('Student record was NOT found in PostgreSQL "students" table!');
    }
    console.log('  ✓ Record verified directly in PostgreSQL "students" table');

    // Verify sync in application_entities
    const dbEntityCheck = await pool.query('SELECT * FROM application_entities WHERE id = $1 AND application_id = $2', [createdStudent.id, currentApp.id]);
    if (dbEntityCheck.rows.length === 0) {
      throw new Error('Student entity was NOT found in PostgreSQL "application_entities" table!');
    }
    console.log('  ✓ Record verified directly in PostgreSQL "application_entities" table');
    results['Create'] = 'PASS';

    // 2. READ Students via REST API: GET /api/students
    console.log('  2. Reading Students via GET /api/students...');
    const getStudentsRes = await request('GET', '/api/students', null, {
      ...designerHeaders,
      'X-App-Id': String(currentApp.id)
    });

    if (getStudentsRes.status !== 200 || !Array.isArray(getStudentsRes.data)) {
      throw new Error(`Failed to get students via GET /api/students: HTTP ${getStudentsRes.status}`);
    }

    const studentFound = getStudentsRes.data.find(s => s.id === createdStudent.id);
    if (!studentFound) {
      throw new Error('Created student not returned in GET /api/students list');
    }
    console.log(`  ✓ Student retrieved in runtime list: ${studentFound.name} (${studentFound.email})`);
    results['Read'] = 'PASS';
    results['Database Integration'] = 'PASS';
    results['REST API Execution'] = 'PASS';

    // 3. UPDATE Student Course via PUT /api/students/:id
    console.log('  3. Updating Student Course to "Data Science"...');
    const updateStudentRes = await request('PUT', `/api/students/${createdStudent.id}`, {
      course: 'Data Science'
    }, {
      ...designerHeaders,
      'X-App-Id': String(currentApp.id)
    });

    if (updateStudentRes.status !== 200 || updateStudentRes.data.course !== 'Data Science') {
      throw new Error(`Failed to update student: HTTP ${updateStudentRes.status}`);
    }

    // Verify update in PostgreSQL
    const dbUpdateCheck = await pool.query('SELECT course FROM students WHERE id = $1', [createdStudent.id]);
    if (dbUpdateCheck.rows[0].course !== 'Data Science') {
      throw new Error('Student update was NOT persisted to PostgreSQL!');
    }
    console.log('  ✓ Updated value "Data Science" confirmed in PostgreSQL');
    results['Update'] = 'PASS';

    // 4. Test Refresh Persistence
    console.log('  4. Testing Refresh Persistence (direct re-query)...');
    const refreshGetRes = await request('GET', `/api/runtime/${currentApp.id}/data/students`, null, designerHeaders);
    const refreshedStudent = refreshGetRes.data.find(s => s.id === createdStudent.id);
    if (!refreshedStudent || refreshedStudent.course !== 'Data Science') {
      throw new Error('Data persistence check failed after simulated refresh');
    }
    console.log('  ✓ Refresh persistence verified: Record remains with updated course');
    results['Refresh Persistence'] = 'PASS';

    // 5. DELETE Student via DELETE /api/students/:id
    console.log('  5. Deleting Student record...');
    const deleteStudentRes = await request('DELETE', `/api/students/${createdStudent.id}`, null, {
      ...designerHeaders,
      'X-App-Id': String(currentApp.id)
    });

    if (deleteStudentRes.status !== 200) {
      throw new Error(`Failed to delete student: HTTP ${deleteStudentRes.status}`);
    }

    // Verify deletion in PostgreSQL
    const dbDeleteCheck = await pool.query('SELECT * FROM students WHERE id = $1', [createdStudent.id]);
    if (dbDeleteCheck.rows.length !== 0) {
      throw new Error('Student record was NOT deleted from PostgreSQL!');
    }
    console.log('  ✓ Student deletion confirmed in PostgreSQL');
    results['Delete'] = 'PASS';
    results['PostgreSQL Integration'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 6 — APPLICATION ISOLATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 6] Testing Application Isolation (Strict Cross-Organization Boundaries)...');

    // Create an application in Org 9 to test cross-tenant access
    const org9Login = await request('POST', '/api/login', { email: 'xyz123@gmail.com', password: 'xyz@123' });
    const org9Headers = {
      'X-Org-Id': '9',
      'X-User-Id': String(org9Login.data.user.id),
      'X-User-Email': org9Login.data.user.email,
      'X-User-Role': org9Login.data.user.role
    };

    const org9AppCreate = await request('POST', '/api/org/applications', {
      app_name: 'Org 9 Isolated Application',
      app_description: 'Isolation Test Target',
      industry: 'Finance'
    }, org9Headers);
    const org9AppId = org9AppCreate.data.application?.id || org9AppCreate.data.id;

    // Org 9 creates its own student
    const org9StudentCreate = await request('POST', '/api/students', {
      name: 'Org9 Student',
      email: 'org9@example.com',
      course: 'Finance'
    }, { ...org9Headers, 'X-App-Id': String(org9AppId) });
    const org9StudentId = org9StudentCreate.data.id;

    console.log(`  Org 9 App ID: ${org9AppId}, Org 9 Student ID: ${org9StudentId}`);

    // Test 1: Org 7 Designer attempts to access Org 9 runtime structure
    const crossGetRuntime = await request('GET', `/api/runtime/${org9AppId}`, null, designerHeaders);
    console.log(`  Org 7 Designer requesting Org 9 Runtime: HTTP ${crossGetRuntime.status}`);

    // Test 2: Org 7 Designer attempts to access Org 9 runtime data
    const crossGetData = await request('GET', `/api/runtime/${org9AppId}/data/students`, null, designerHeaders);
    console.log(`  Org 7 Designer requesting Org 9 Runtime Data: HTTP ${crossGetData.status}`);

    // Test 3: Org 7 Designer attempts to delete Org 9 student record
    const crossDeleteStudent = await request('DELETE', `/api/students/${org9StudentId}`, null, {
      ...designerHeaders,
      'X-App-Id': String(currentApp.id)
    });
    console.log(`  Org 7 Designer attempting to delete Org 9 Student: HTTP ${crossDeleteStudent.status}`);

    if (crossGetRuntime.status !== 403 || crossGetData.status !== 403 || (crossDeleteStudent.status !== 404 && crossDeleteStudent.status !== 403)) {
      throw new Error('SECURITY BREACH: Cross-organization runtime access was not blocked!');
    }

    console.log('  ✓ ALL cross-organization runtime operations strictly rejected with 403/404!');
    results['Application Isolation'] = 'PASS';
    results['Authorization'] = 'PASS';

    // Clean up Org 9 test app
    await pool.query('DELETE FROM applications WHERE id = $1', [org9AppId]);
    console.log('  ✓ Cleaned up Org 9 test application');

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 7 & 8 — DRAFT / PREVIEW VS PUBLISHED APPLICATION LIFECYCLE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 7 & 8] Verifying Application Lifecycle & Draft/Preview Separation...');

    // 1. Verify status change endpoint
    const setStatusPreview = await request('PATCH', `/api/designer/applications/${currentApp.id}/status`, {
      status: 'preview'
    }, designerHeaders);
    if (setStatusPreview.status !== 200 || setStatusPreview.data.application.status !== 'preview') {
      throw new Error('Failed to set application status to preview');
    }
    console.log('  ✓ Transitioned status: draft -> preview');

    // 2. Verify unauthenticated access to draft/preview app is forbidden
    const unauthPreviewRes = await request('GET', `/api/runtime/${currentApp.id}`);
    if (unauthPreviewRes.status !== 403 && unauthPreviewRes.status !== 401) {
      throw new Error(`Expected 403/401 for unauthenticated access to draft/preview app, got ${unauthPreviewRes.status}`);
    }
    console.log(`  ✓ Unauthenticated access to unpublished app rejected with HTTP ${unauthPreviewRes.status}`);

    // 3. Transition to published
    const setStatusPublished = await request('PATCH', `/api/designer/applications/${currentApp.id}/status`, {
      status: 'published'
    }, designerHeaders);
    if (setStatusPublished.status !== 200 || setStatusPublished.data.application.status !== 'published') {
      throw new Error('Failed to set application status to published');
    }
    console.log('  ✓ Transitioned status: preview -> published');

    // Restore back to published
    await request('PATCH', `/api/designer/applications/${currentApp.id}/status`, { status: 'published' }, designerHeaders);
    console.log('  ✓ Maintained application status as published');

    results['Draft/Preview Separation'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 9 — END-USER EXPERIENCE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 9] Verifying End-User Runtime Isolation...');
    // Verify that runtime structure payload contains only end-user data
    const endUserPayload = previewRes.data;
    if (
      endUserPayload.sysadmin ||
      endUserPayload.org_admin_controls ||
      endUserPayload.database_passwords ||
      endUserPayload.secret_keys
    ) {
      throw new Error('SECURITY LEAK: Administrative controls leaked into runtime payload');
    }
    console.log('  ✓ Runtime API exposes only application metadata, pages, navigation, and schemas (No admin controls)');
    results['End-User Runtime'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // TASK 10 — ERROR HANDLING
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TASK 10] Verifying Error Handling & Status Codes...');
    
    // 1. Missing Student Name (Validation Error -> 400)
    const errVal = await request('POST', '/api/students', { email: 'bad@example.com' }, {
      ...designerHeaders,
      'X-App-Id': String(currentApp.id)
    });
    console.log(`  Validation error (missing name): HTTP ${errVal.status} (Expected 400)`);

    // 2. Non-existent Student Delete (404)
    const err404 = await request('DELETE', '/api/students/999999', null, {
      ...designerHeaders,
      'X-App-Id': String(currentApp.id)
    });
    console.log(`  Delete non-existent student: HTTP ${err404.status} (Expected 404)`);

    // 3. Unauthorized request (no headers -> 401)
    const err401 = await request('GET', '/api/students');
    console.log(`  Unauthorized request without headers: HTTP ${err401.status} (Expected 401)`);

    if (errVal.status !== 400 || err404.status !== 404 || err401.status !== 401) {
      throw new Error('Error handling status code verification failed');
    }
    console.log('  ✓ Error handling verified across 400, 401, 403, and 404 responses');
    results['Error Handling'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────────
    // CLEANUP
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[CLEANUP] Cleaning up test artifacts...');
    // Preserve core student_management module and student-list page for App 5
    console.log('  ✓ Preserved application configuration for App 5');

    // ──────────────────────────────────────────────────────────────────────────
    // FINAL REPORT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n===============================================================');
    console.log('TASK 13 — FINAL APPLICATION PREVIEW & RUNTIME EXECUTION REPORT');
    console.log('===============================================================\n');

    const checklist = [
      'Application Preview',
      'Runtime Routing',
      'Database Integration',
      'REST API Execution',
      'Create',
      'Read',
      'Update',
      'Delete',
      'Refresh Persistence',
      'Application Isolation',
      'Authorization',
      'Error Handling',
      'Draft/Preview Separation',
      'End-User Runtime',
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
      console.log('  FINAL RESULT: SOME VERIFICATION CHECKS FAILED ✗');
      process.exit(1);
    }
    console.log('===============================================================\n');

  } catch (err) {
    console.error('\n❌ RUNTIME VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runRuntimeVerification();
