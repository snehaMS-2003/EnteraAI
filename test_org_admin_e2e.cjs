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

async function runE2ETests() {
  console.log('=== STARTING ORGANIZATION ADMIN E2E TESTS ===\n');
  const pool = getDB();

  try {
    // 1. LOGIN
    console.log('1. Testing Login as Org Admin (abc123@gmail.com)...');
    const loginRes = await request('POST', '/api/login', {
      email: 'abc123@gmail.com',
      password: 'admin@123'
    });
    console.log('   Login Status:', loginRes.status);
    if (loginRes.status !== 200 || !loginRes.data.user) {
      throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
    }
    const user = loginRes.data.user;
    const orgId = user.organizationId;
    console.log(`   Logged in as: ${user.name} (${user.email}), Org ID: ${orgId}, Role: ${user.role}`);

    const authHeaders = {
      'X-Org-Id': String(orgId),
      'X-User-Id': String(user.id),
      'X-User-Email': user.email,
      'X-User-Role': user.role
    };

    // 2. DASHBOARD METRICS & PROFILE
    console.log('\n2. Testing Org Admin Dashboard stats & profile...');
    const statsRes = await request('GET', '/api/orgadmin/stats', null, authHeaders);
    console.log('   Stats Status:', statsRes.status, statsRes.data);
    if (statsRes.status !== 200) throw new Error('Stats fetch failed');

    const profileRes = await request('GET', '/api/org/profile', null, authHeaders);
    console.log('   Profile Status:', profileRes.status, 'Org Name:', profileRes.data.name);
    if (profileRes.status !== 200) throw new Error('Profile fetch failed');

    const appsRes = await request('GET', '/api/org/applications', null, authHeaders);
    console.log('   Applications Status:', appsRes.status, 'Apps Count:', appsRes.data.length);
    if (appsRes.status !== 200) throw new Error('Apps fetch failed');
    const existingApp = appsRes.data[0];
    console.log('   Current App:', existingApp?.app_name, 'Status:', existingApp?.status);

    // 3. ENFORCE ONE ORG = ONE APP RULE
    console.log('\n3. Testing Business Rule: ONE ORGANIZATION = ONE APPLICATION...');
    const duplicateAppRes = await request('POST', '/api/org/applications', {
      app_name: 'Second Application Attempt',
      industry: 'education'
    }, authHeaders);
    console.log('   POST /api/org/applications 2nd app status:', duplicateAppRes.status, duplicateAppRes.data?.error || '');
    if (duplicateAppRes.status !== 409) {
      throw new Error('Expected 409 Conflict for duplicate application, got: ' + duplicateAppRes.status);
    }
    console.log('   ✓ Backend correctly rejected duplicate application with 409!');

    const directDuplicateRes = await request('POST', '/api/applications', {
      app_name: 'Direct Duplicate Attempt',
      organization_id: orgId
    }, authHeaders);
    console.log('   POST /api/applications 2nd app status:', directDuplicateRes.status, directDuplicateRes.data?.error || '');
    if (directDuplicateRes.status !== 409) {
      throw new Error('Expected 409 Conflict for direct duplicate application, got: ' + directDuplicateRes.status);
    }
    console.log('   ✓ Generic endpoint correctly rejected duplicate application with 409!');

    // 4. ORG USERS CRUD & ACTIVATION/DEACTIVATION
    console.log('\n4. Testing Organization Users Management...');
    const testUserEmail = `testuser_${Date.now()}@example.com`;
    console.log(`   Adding user: ${testUserEmail}...`);
    const addUserRes = await request('POST', '/api/org/users', {
      name: 'E2E Test User',
      email: testUserEmail,
      role: 'designer',
      password: 'password123',
      applications: [existingApp.id]
    }, authHeaders);
    console.log('   Add User Status:', addUserRes.status, addUserRes.data);
    if (addUserRes.status !== 201) throw new Error('Add user failed');
    const createdUserId = addUserRes.data.id;

    // Verify user in PostgreSQL
    const dbUserCheck = await pool.query('SELECT id, name, email, status, organization_id FROM users WHERE id = $1', [createdUserId]);
    console.log('   DB Record created:', dbUserCheck.rows[0]);
    if (dbUserCheck.rows[0].organization_id !== orgId) throw new Error('User org mismatch');

    // Edit user
    console.log('   Editing user...');
    const editUserRes = await request('PATCH', `/api/org/users/${createdUserId}`, {
      name: 'E2E Test User Updated',
      role: 'designer'
    }, authHeaders);
    console.log('   Edit User Status:', editUserRes.status, editUserRes.data.name);
    if (editUserRes.status !== 200 || editUserRes.data.name !== 'E2E Test User Updated') throw new Error('Edit user failed');

    // Deactivate user
    console.log('   Deactivating user...');
    const deactRes = await request('POST', `/api/org/users/${createdUserId}/deactivate`, null, authHeaders);
    console.log('   Deactivate Status:', deactRes.status, deactRes.data.message);
    if (deactRes.status !== 200) throw new Error('Deactivate failed');

    const dbDeactCheck = await pool.query('SELECT status FROM users WHERE id = $1', [createdUserId]);
    console.log('   DB Status after deactivation:', dbDeactCheck.rows[0].status);
    if (dbDeactCheck.rows[0].status !== 'inactive') throw new Error('DB status not inactive');

    // Reactivate user
    console.log('   Reactivating user...');
    const actRes = await request('POST', `/api/org/users/${createdUserId}/activate`, null, authHeaders);
    console.log('   Activate Status:', actRes.status, actRes.data.message);
    if (actRes.status !== 200) throw new Error('Activate failed');

    const dbActCheck = await pool.query('SELECT status FROM users WHERE id = $1', [createdUserId]);
    console.log('   DB Status after reactivation:', dbActCheck.rows[0].status);
    if (dbActCheck.rows[0].status !== 'active') throw new Error('DB status not active');

    // Delete test user
    console.log('   Deleting user...');
    const delRes = await request('DELETE', `/api/org/users/${createdUserId}`, null, authHeaders);
    console.log('   Delete Status:', delRes.status, delRes.data.message);
    if (delRes.status !== 200) throw new Error('Delete user failed');

    const dbDelCheck = await pool.query('SELECT id FROM users WHERE id = $1', [createdUserId]);
    if (dbDelCheck.rows.length !== 0) throw new Error('User still exists in DB');
    console.log('   ✓ User successfully deleted from DB');

    // 5. DATABASE SCHEMAS
    console.log('\n5. Testing Database Schemas Management...');
    const currentSchemaRes = await request('GET', `/api/org/applications/${existingApp.id}/schema`, null, authHeaders);
    console.log('   Current Schema Status:', currentSchemaRes.status, 'Tables:', currentSchemaRes.data?.tables?.length || 0);

    const updatedSchema = {
      tables: [
        {
          id: 't_students',
          name: 'students',
          columns: [
            { id: 'c_id', name: 'stud_id', type: 'varchar', primaryKey: true },
            { id: 'c_name', name: 'stud_name', type: 'text', primaryKey: false },
            { id: 'c_email', name: 'email', type: 'varchar', primaryKey: false }
          ]
        },
        {
          id: 't_courses',
          name: 'courses',
          columns: [
            { id: 'c_cid', name: 'course_id', type: 'varchar', primaryKey: true },
            { id: 'c_cname', name: 'course_name', type: 'varchar', primaryKey: false }
          ]
        }
      ]
    };

    const saveSchemaRes = await request('PUT', `/api/org/applications/${existingApp.id}/schema`, {
      schema_data: updatedSchema
    }, authHeaders);
    console.log('   Save Schema Status:', saveSchemaRes.status, saveSchemaRes.data.message);
    if (saveSchemaRes.status !== 200) throw new Error('Save schema failed');

    // Verify persisted in PostgreSQL
    const dbSchemaCheck = await pool.query('SELECT schema_data FROM database_schemas WHERE application_id = $1', [existingApp.id]);
    console.log('   DB Schema tables count:', dbSchemaCheck.rows[0].schema_data.tables.length);
    if (dbSchemaCheck.rows[0].schema_data.tables.length !== 2) throw new Error('Schema not persisted in PostgreSQL');
    console.log('   ✓ Schema successfully persisted in PostgreSQL');

    // 6. REST APIS
    console.log('\n6. Testing REST APIs Management...');
    const currentApisRes = await request('GET', `/api/org/applications/${existingApp.id}/apis`, null, authHeaders);
    console.log('   Current APIs Status:', currentApisRes.status, 'Endpoints:', currentApisRes.data?.endpoints?.length || 0);

    const updatedApis = {
      endpoints: [
        { id: 'api_1', method: 'GET', path: '/api/students', description: 'Get All Students' },
        { id: 'api_2', method: 'POST', path: '/api/students', description: 'Create Student' },
        { id: 'api_3', method: 'GET', path: '/api/courses', description: 'List Courses' }
      ]
    };

    const saveApisRes = await request('PUT', `/api/org/applications/${existingApp.id}/apis`, {
      api_data: updatedApis
    }, authHeaders);
    console.log('   Save APIs Status:', saveApisRes.status, saveApisRes.data.message);
    if (saveApisRes.status !== 200) throw new Error('Save APIs failed');

    // Verify persisted in PostgreSQL
    const dbApiCheck = await pool.query('SELECT api_data FROM apis WHERE application_id = $1', [existingApp.id]);
    console.log('   DB APIs endpoints count:', dbApiCheck.rows[0].api_data.endpoints.length);
    if (dbApiCheck.rows[0].api_data.endpoints.length !== 3) throw new Error('APIs not persisted in PostgreSQL');
    console.log('   ✓ APIs successfully persisted in PostgreSQL');

    // 7. ORGANIZATION PROFILE
    console.log('\n7. Testing Organization Profile Update...');
    const updateProfileRes = await request('PUT', '/api/org/profile', {
      name: 'TechCorp Solutions Updated',
      admin_name: 'RAVI K',
      phone: '+1 555-0199',
      industry: 'education',
      address: '456 Innovation Blvd, Tech Hub',
      city: 'Tech City',
      website: 'https://techcorp.example.com'
    }, authHeaders);
    console.log('   Update Profile Status:', updateProfileRes.status, updateProfileRes.data.message);
    if (updateProfileRes.status !== 200) throw new Error('Update profile failed');

    // Verify persisted in PostgreSQL
    const dbProfileCheck = await pool.query('SELECT name, address, website FROM organizations WHERE id = $1', [orgId]);
    console.log('   DB Profile in PostgreSQL:', dbProfileCheck.rows[0]);
    if (dbProfileCheck.rows[0].name !== 'TechCorp Solutions Updated') throw new Error('Profile not persisted in DB');
    console.log('   ✓ Profile successfully persisted in PostgreSQL');

    // Restore name back to clean state
    await request('PUT', '/api/org/profile', {
      name: 'TechCorp Solutions',
      admin_name: 'RAVI K',
      phone: '+1 555-0199',
      industry: 'education',
      address: '123 Innovation Way, Tech City',
      website: 'https://techcorp.example.com'
    }, authHeaders);

    console.log('\n=============================================');
    console.log('ALL ORGANIZATION ADMIN E2E TESTS PASSED SUCCESSFULLY! ✓');
    console.log('=============================================');
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runE2ETests();
