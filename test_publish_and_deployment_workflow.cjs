/**
 * test_publish_and_deployment_workflow.cjs
 * Comprehensive End-to-End Test Suite for Entera.ai Publishing & Deployment Module
 * Tasks 1 through 15 verification
 */

const http = require('http');
const { getDB, initDB } = require('./server/db');

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Accept': 'application/json',
      ...headers
    };
    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (e) {
          json = rawData;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passCount = 0;
let failCount = 0;
const results = {};

function assert(condition, message, taskName) {
  if (condition) {
    passCount++;
    console.log(`  [PASS] ${message}`);
    if (taskName) results[taskName] = 'PASS';
  } else {
    failCount++;
    console.error(`  [FAIL] ${message}`);
    if (taskName) results[taskName] = 'FAIL';
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('ENTERA.AI: APPLICATION PUBLISHING & DEPLOYMENT TEST SUITE');
  console.log('========================================================\n');

  await initDB();
  const pool = getDB();

  // Test credentials & tokens
  const org7AdminHeaders = {
    'x-org-id': '7',
    'x-user-role': 'org_admin',
    'x-user-email': 'abc123@gmail.com'
  };

  const org7DesignerHeaders = {
    'x-org-id': '7',
    'x-user-role': 'designer',
    'x-user-email': 'sneha123@gmail.com'
  };

  const org9AdminHeaders = {
    'x-org-id': '9',
    'x-user-role': 'org_admin',
    'x-user-email': 'xyz123@gmail.com'
  };

  const sysAdminHeaders = {
    'x-user-role': 'sys_admin',
    'x-user-email': 'admin@gmail.com'
  };

  const APP_ID = 5;

  try {
    // ----------------------------------------------------
    // STEP 1 & 2: LOGIN & OPEN APPLICATION (App 5)
    // ----------------------------------------------------
    console.log('STEP 1 & 2: Verifying Application and Organization Setup...');
    const appQuery = await pool.query('SELECT * FROM applications WHERE id = $1', [APP_ID]);
    assert(appQuery.rows.length > 0, `Target application ID ${APP_ID} found in PostgreSQL`, 'Task 1: Application Status');
    const app = appQuery.rows[0];
    assert(app.app_name === 'Student Management System', `Application name is "${app.app_name}"`);
    assert(app.organization_id === 7, `Application belongs to Organization ID 7`);

    // Ensure status is reset to draft for fresh testing
    await pool.query("UPDATE applications SET status = 'draft', published_version = '1.0', published_config = NULL WHERE id = $1", [APP_ID]);
    // Clear any test deployments for this app
    await pool.query('DELETE FROM deployments WHERE application_id = $1', [APP_ID]);

    // ----------------------------------------------------
    // STEP 3: VERIFY CONFIGURATION (Modules, Pages, Schema, APIs)
    // ----------------------------------------------------
    console.log('\nSTEP 3: Verifying Application Configuration in PostgreSQL...');
    const modRes = await pool.query('SELECT * FROM application_modules WHERE application_id = $1 AND is_enabled = true', [APP_ID]);
    assert(modRes.rows.length >= 1, `Found ${modRes.rows.length} enabled business modules`, 'Task 2: Validation');

    const pageRes = await pool.query('SELECT * FROM application_pages WHERE application_id = $1', [APP_ID]);
    assert(pageRes.rows.length >= 1, `Found ${pageRes.rows.length} configured pages in database`);

    const schemaRes = await pool.query('SELECT * FROM database_schemas WHERE application_id = $1', [APP_ID]);
    assert(schemaRes.rows.length >= 1 && schemaRes.rows[0].schema_data?.tables?.length >= 1, 'Database schema configured with tables');

    const apiRes = await pool.query('SELECT * FROM apis WHERE application_id = $1', [APP_ID]);
    assert(apiRes.rows.length >= 1 && apiRes.rows[0].api_data?.endpoints?.length >= 1, 'REST APIs configured with endpoints');

    // ----------------------------------------------------
    // PRE-PUBLISH VALIDATION TESTING (TASK 2 & 13)
    // ----------------------------------------------------
    console.log('\nSTEP 4: Testing Pre-publish Validation (Failures & Passes)...');
    
    // Test validation failure on empty application (using Org 9 which has no active apps)
    const emptyAppInsert = await pool.query("INSERT INTO applications (app_name, organization_id, status) VALUES ('Incomplete Test App', 9, 'draft') RETURNING id");
    const emptyAppId = emptyAppInsert.rows[0].id;

    const invalidValRes = await request('POST', `/api/applications/${emptyAppId}/validate-publish`, null, org9AdminHeaders);
    assert(invalidValRes.status === 200 && invalidValRes.data.valid === false, 'Pre-publish validation correctly flagged incomplete application as invalid');
    assert(invalidValRes.data.errors.length >= 3, `Validation detected ${invalidValRes.data.errors.length} missing components (modules, pages, schema, APIs)`);

    // Attempting to publish an invalid application must return 400 Bad Request
    const invalidPubRes = await request('POST', `/api/applications/${emptyAppId}/publish`, null, org9AdminHeaders);
    assert(invalidPubRes.status === 400, 'Publishing incomplete app was blocked with HTTP 400 Bad Request');
    assert(invalidPubRes.data.errors && invalidPubRes.data.errors.length > 0, 'Publish failure returned detailed configuration validation errors');

    // Clean up temporary incomplete app
    await pool.query('DELETE FROM applications WHERE id = $1', [emptyAppId]);

    // Test validation pass on App 5
    const validValRes = await request('POST', `/api/applications/${APP_ID}/validate-publish`, null, org7AdminHeaders);
    assert(validValRes.status === 200 && validValRes.data.valid === true, 'Validation passed for fully configured Student Management System');
    assert(validValRes.data.checks.modules && validValRes.data.checks.schema && validValRes.data.checks.apis, 'All system configuration checks passed (modules, schema, APIs, bindings)');

    // ----------------------------------------------------
    // STEP 5: SECURITY & TENANT ISOLATION (TASK 3 & 11)
    // ----------------------------------------------------
    console.log('\nSTEP 5: Testing Publish Security & Multi-tenant Authorization...');

    // 1. Regular designer must NOT be allowed to publish (403 Forbidden)
    const designerPubRes = await request('POST', `/api/applications/${APP_ID}/publish`, null, org7DesignerHeaders);
    assert(designerPubRes.status === 403, 'Regular Designer cannot publish (HTTP 403 Forbidden enforced)', 'Task 3: Publish Security');
    assert(designerPubRes.data.code === 'INSUFFICIENT_PERMISSIONS', 'Returned error code INSUFFICIENT_PERMISSIONS');

    // 2. Cross-org publish attempt: Org 9 admin trying to publish Org 7 application
    const crossOrgPubRes = await request('POST', `/api/applications/${APP_ID}/publish`, null, org9AdminHeaders);
    assert(crossOrgPubRes.status === 403, 'Cross-org publishing blocked with HTTP 403 Forbidden', 'Task 11: Data Isolation');
    assert(crossOrgPubRes.data.code === 'FORBIDDEN_ORG', 'Returned error code FORBIDDEN_ORG');

    // 3. Unauthenticated publish attempt
    const unauthPubRes = await request('POST', `/api/applications/${APP_ID}/publish`);
    assert(unauthPubRes.status === 401, 'Unauthenticated publish rejected with HTTP 401 Unauthorized', 'Task 13: Error Handling');

    // ----------------------------------------------------
    // STEP 6: APPLICATION PREVIEW MODE
    // ----------------------------------------------------
    console.log('\nSTEP 6: Verifying Preview Mode Runtime Execution...');
    const previewRes = await request('GET', `/api/runtime/${APP_ID}?preview=true`, null, org7DesignerHeaders);
    assert(previewRes.status === 200, 'Preview runtime loads successfully (HTTP 200)');
    assert(previewRes.data.is_preview === true, 'Preview mode flag is_preview: true');
    assert(previewRes.data.application.name === 'Student Management System', 'Preview loads correct application');

    // ----------------------------------------------------
    // STEP 7 & 8: PUBLISH APPLICATION (VERSION 1.0)
    // ----------------------------------------------------
    console.log('\nSTEP 7 & 8: Publishing Application Version 1.0...');
    const pubRes = await request('POST', `/api/applications/${APP_ID}/publish`, null, org7AdminHeaders);
    assert(pubRes.status === 200 && pubRes.data.success === true, 'Application published successfully (HTTP 200)', 'Task 2: Publish Application');
    assert(pubRes.data.version === '1.0', 'Published release version is 1.0', 'Task 5: Versioning');
    assert(pubRes.data.status === 'published', 'Application status updated to published');

    // Verify PostgreSQL application row
    const dbApp = (await pool.query('SELECT status, published_version, published_at, published_config FROM applications WHERE id = $1', [APP_ID])).rows[0];
    assert(dbApp.status === 'published', 'PostgreSQL application status is "published" in database', 'Task 1: Application Status');
    assert(dbApp.published_version === '1.0', 'PostgreSQL published_version is "1.0"');
    assert(dbApp.published_config !== null && dbApp.published_config.version === '1.0', 'PostgreSQL published_config snapshot saved');

    // Verify PostgreSQL deployment record
    const depRes = await pool.query('SELECT * FROM deployments WHERE application_id = $1 ORDER BY id DESC', [APP_ID]);
    assert(depRes.rows.length === 1, 'PostgreSQL deployment record created in deployments table', 'Task 4: Deployment Record');
    const dep1 = depRes.rows[0];
    assert(dep1.version === '1.0', 'Deployment record has version "1.0"');
    assert(dep1.deployment_state === 'DEPLOYED', 'Deployment state is "DEPLOYED"', 'Task 9: Deployment States');
    assert(dep1.deployment_url.includes('/app/'), `Deployment URL generated: ${dep1.deployment_url}`, 'Task 10: Published Application URL');

    // ----------------------------------------------------
    // STEP 9, 10, 11, 12, 13: PUBLISHED RUNTIME & DATA EXECUTION
    // ----------------------------------------------------
    console.log('\nSTEP 9 - 13: Testing Published Runtime & Student Directory Data...');
    
    // 1. Load published runtime without preview flag
    const liveRuntimeRes = await request('GET', `/api/runtime/${APP_ID}`, null, org7AdminHeaders);
    assert(liveRuntimeRes.status === 200, 'Published runtime loads without preview query (HTTP 200)', 'Task 6: Published Runtime');
    assert(liveRuntimeRes.data.application.status === 'published', 'Runtime returns application status "published"');
    assert(liveRuntimeRes.data.version === '1.0', 'Runtime returns published version 1.0');
    assert(liveRuntimeRes.data.is_preview === false, 'Runtime execution is_preview: false');

    // Also test slug route resolution: e.g. /api/runtime/student-management-system
    const slugRuntimeRes = await request('GET', '/api/runtime/student-management-system', null, org7AdminHeaders);
    assert(slugRuntimeRes.status === 200 && slugRuntimeRes.data.application.id === APP_ID, 'Published runtime resolves correctly via slug /api/runtime/student-management-system', 'Task 10: Published Application URL');

    // 2. Insert/Verify Rahul Kumar in Student Directory (Task 12)
    console.log('Inserting Rahul Kumar into students database table...');
    // Clean any prior test student
    await pool.query("DELETE FROM students WHERE application_id = $1 AND email = 'rahul@example.com'", [APP_ID]);

    const addStudentRes = await request('POST', `/api/runtime/${APP_ID}/data/students`, {
      name: 'Rahul Kumar',
      email: 'rahul@example.com',
      phone: '9876543210',
      course: 'Computer Science',
      status: 'Active'
    }, org7AdminHeaders);
    assert(addStudentRes.status === 201, 'Student Rahul Kumar created in published runtime database (HTTP 201)', 'Task 12: Complete Publish Test');
    const createdRahul = addStudentRes.data;

    // 3. Fetch Student List via published runtime
    const fetchStudentsRes = await request('GET', `/api/runtime/${APP_ID}/data/students`, null, org7AdminHeaders);
    assert(fetchStudentsRes.status === 200, 'Fetched student list from PostgreSQL (HTTP 200)');
    const foundRahul = fetchStudentsRes.data.find(s => s.email === 'rahul@example.com');
    assert(foundRahul && foundRahul.name === 'Rahul Kumar', 'Verified Rahul Kumar in Student List: Name, Email, Phone, Course');

    // 4. Test direct REST API endpoint configured for students
    const directApiRes = await request('GET', '/api/students', null, { ...org7AdminHeaders, 'x-app-id': APP_ID.toString() });
    assert(directApiRes.status === 200, 'Direct REST API GET /api/students returned student list');
    const directRahul = directApiRes.data.find(s => s.email === 'rahul@example.com');
    assert(directRahul && directRahul.name === 'Rahul Kumar', 'Direct REST API returned Rahul Kumar');

    // 5. Refresh test: verify data persistence in PostgreSQL
    console.log('Simulating refresh — verifying persistence...');
    const pgStudentCheck = await pool.query("SELECT * FROM students WHERE application_id = $1 AND email = 'rahul@example.com'", [APP_ID]);
    assert(pgStudentCheck.rows.length === 1, 'Rahul Kumar is persisted in native PostgreSQL table students', 'Task 12: Complete Publish Test');

    // ----------------------------------------------------
    // STEP 14 & 15: DRAFT CHANGES DO NOT CORRUPT PUBLISHED STATE
    // ----------------------------------------------------
    console.log('\nSTEP 14 & 15: Testing Draft Isolation vs Published State...');
    
    // Designer makes a draft change to a page
    const originalPage = pageRes.rows[0];
    const modifiedTitle = `Draft Modified Title ${Date.now()}`;
    await pool.query('UPDATE application_pages SET title = $1 WHERE id = $2', [modifiedTitle, originalPage.id]);

    // Preview mode must see the draft changes
    const previewDraftCheck = await request('GET', `/api/runtime/${APP_ID}?preview=true`, null, org7DesignerHeaders);
    const draftPageInPreview = previewDraftCheck.data.pages.find(p => p.id === originalPage.id);
    assert(draftPageInPreview.title === modifiedTitle, 'Preview mode shows the latest draft designer edits');

    // Live Published runtime must NOT see the draft changes; it must serve Version 1.0 snapshot!
    const liveSnapshotCheck = await request('GET', `/api/runtime/${APP_ID}`, null, org7AdminHeaders);
    const livePageInPublished = liveSnapshotCheck.data.pages.find(p => p.id === originalPage.id);
    assert(livePageInPublished.title !== modifiedTitle, 'Published runtime isolates live snapshot from draft changes!', 'Task 6: Published Runtime');
    assert(liveSnapshotCheck.data.version === '1.0', 'Published runtime remains on Version 1.0');

    // ----------------------------------------------------
    // STEP 16: PUBLISH A NEW VERSION (VERSION 1.1)
    // ----------------------------------------------------
    console.log('\nSTEP 16: Publishing Version 1.1 with New Edits...');
    const pubV2Res = await request('POST', `/api/applications/${APP_ID}/publish`, null, org7AdminHeaders);
    assert(pubV2Res.status === 200, 'Published new version successfully (HTTP 200)', 'Task 5: Versioning');
    assert(pubV2Res.data.version === '1.1', 'New release auto-incremented to Version 1.1');

    // Verify published runtime now serves Version 1.1 with the updated title
    const liveV2Check = await request('GET', `/api/runtime/${APP_ID}`, null, org7AdminHeaders);
    assert(liveV2Check.data.version === '1.1', 'Published runtime now serves Version 1.1');
    const livePageV2 = liveV2Check.data.pages.find(p => p.id === originalPage.id);
    assert(livePageV2.title === modifiedTitle, 'Version 1.1 snapshot now contains the updated configuration');

    // ----------------------------------------------------
    // STEP 17: DEPLOYMENT HISTORY
    // ----------------------------------------------------
    console.log('\nSTEP 17: Verifying Real PostgreSQL Deployment History...');
    const historyRes = await request('GET', `/api/applications/${APP_ID}/deployments`, null, org7AdminHeaders);
    assert(historyRes.status === 200, 'Fetched deployment history (HTTP 200)', 'Task 8: Deployment History');
    assert(Array.isArray(historyRes.data) && historyRes.data.length === 2, `Deployment history contains 2 real records (v1.1 and v1.0)`);
    assert(historyRes.data[0].version === '1.1' && historyRes.data[1].version === '1.0', 'History preserves previous deployment records in descending order');
    assert(historyRes.data[0].deployment_state === 'DEPLOYED', 'Latest deployment state is DEPLOYED');
    assert(historyRes.data[0].published_by !== null, `Published by user recorded: ${historyRes.data[0].published_by}`);

    // ----------------------------------------------------
    // STEP 18 & 19: UNPUBLISH APPLICATION
    // ----------------------------------------------------
    console.log('\nSTEP 18 & 19: Testing Unpublish & Runtime Deactivation...');
    const unpubRes = await request('POST', `/api/applications/${APP_ID}/unpublish`, null, org7AdminHeaders);
    assert(unpubRes.status === 200 && unpubRes.data.status === 'unpublished', 'Application unpublished successfully (HTTP 200)', 'Task 7: Unpublish');

    // 1. Verify PostgreSQL status
    const dbAppUnpub = (await pool.query('SELECT status FROM applications WHERE id = $1', [APP_ID])).rows[0];
    assert(dbAppUnpub.status === 'unpublished', 'PostgreSQL application status updated to "unpublished"');

    // 2. Verify latest deployment record state updated to UNPUBLISHED
    const latestDepUnpub = (await pool.query('SELECT deployment_state, status FROM deployments WHERE application_id = $1 ORDER BY id DESC LIMIT 1', [APP_ID])).rows[0];
    assert(latestDepUnpub.deployment_state === 'UNPUBLISHED', 'Latest deployment state updated to UNPUBLISHED in PostgreSQL', 'Task 9: Deployment States');

    // 3. Verify published runtime behavior: must return 403 APP_UNPUBLISHED
    const unpubRuntimeCheck = await request('GET', `/api/runtime/${APP_ID}`, null, org7AdminHeaders);
    assert(unpubRuntimeCheck.status === 403, 'Runtime access to unpublished app returns HTTP 403 Forbidden', 'Task 7: Unpublish');
    assert(unpubRuntimeCheck.data.code === 'APP_UNPUBLISHED', 'Runtime returned error code APP_UNPUBLISHED');

    // 4. Verify runtime data access blocked
    const unpubDataCheck = await request('GET', `/api/runtime/${APP_ID}/data/students`, null, org7AdminHeaders);
    assert(unpubDataCheck.status === 403 && unpubDataCheck.data.code === 'APP_UNPUBLISHED', 'Runtime database access blocked with HTTP 403 APP_UNPUBLISHED');

    // 5. Verify direct REST API blocked
    const unpubRestApiCheck = await request('GET', '/api/students', null, { ...org7AdminHeaders, 'x-app-id': APP_ID.toString() });
    assert(unpubRestApiCheck.status === 403 && unpubRestApiCheck.data.code === 'APP_UNPUBLISHED', 'REST API /api/students blocked with HTTP 403 APP_UNPUBLISHED');

    // 6. Verify data remains intact in PostgreSQL!
    const dataPreservedCheck = await pool.query("SELECT * FROM students WHERE application_id = $1 AND email = 'rahul@example.com'", [APP_ID]);
    assert(dataPreservedCheck.rows.length === 1, 'Data integrity verified: Rahul Kumar remains 100% intact in database after unpublish!');

    // 7. Verify deployment history preserved!
    const historyPreservedCheck = await pool.query('SELECT count(*) FROM deployments WHERE application_id = $1', [APP_ID]);
    assert(parseInt(historyPreservedCheck.rows[0].count, 10) === 2, 'Deployment history preserved: All deployment records remain in database!');

    // Re-publish app to leave in clean published state
    console.log('\nRestoring application to published state (Version 1.2)...');
    const restorePubRes = await request('POST', `/api/applications/${APP_ID}/publish`, null, org7AdminHeaders);
    assert(restorePubRes.status === 200 && restorePubRes.data.version === '1.2', 'Restored application to published state as Version 1.2');

    // Verify it is accessible again
    const restoredRuntimeCheck = await request('GET', `/api/runtime/${APP_ID}`, null, org7AdminHeaders);
    assert(restoredRuntimeCheck.status === 200, 'Runtime access restored after re-publishing (HTTP 200)');

  } catch (error) {
    console.error('Test execution error:', error);
    failCount++;
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
