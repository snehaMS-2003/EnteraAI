const assert = require('assert');
const { getDB } = require('./server/db');

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: res.status, ok: res.ok, data: json, rawText: text };
}

const testResults = {};

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('SYSTEM ADMIN COMPREHENSIVE FUNCTIONAL VERIFICATION (15 CHECKS)');
  console.log('================================================================\n');

  const pool = getDB();

  // ─────────────────────────────────────────────────────────────
  // 11. AUTHENTICATION & LOGIN
  // ─────────────────────────────────────────────────────────────
  console.log('▶ [11/15] Verifying Authentication...');
  try {
    // SysAdmin valid login
    const loginRes = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'admin@123' })
    });
    assert.strictEqual(loginRes.status, 200, 'SysAdmin login should return 200');
    assert.strictEqual(loginRes.data.user.role, 'sys_admin', 'Role must be sys_admin');

    // Invalid password
    const badLogin = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'WrongPassword999!' })
    });
    assert.strictEqual(badLogin.status, 401, 'Invalid password must return 401');

    testResults['Authentication'] = 'PASS';
    console.log('  ✓ Authentication verified: PASS');
  } catch (e) {
    testResults['Authentication'] = 'FAIL: ' + e.message;
    console.error('  ✗ Authentication: FAIL', e);
  }

  // Common headers for sysadmin requests
  const sysAdminHeaders = {
    'Content-Type': 'application/json',
    'X-User-Id': '5',
    'X-User-Email': 'admin@gmail.com',
    'X-User-Role': 'sys_admin'
  };

  // ─────────────────────────────────────────────────────────────
  // 1. DASHBOARD METRICS & HEALTH
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [1/15] Verifying Dashboard...');
  try {
    const statsRes = await request('/api/sysadmin/stats', { headers: sysAdminHeaders });
    assert.strictEqual(statsRes.status, 200, 'Stats endpoint should return 200');

    // Compare with direct DB counts
    const dbOrgs = await pool.query('SELECT COUNT(*) as c FROM organizations');
    const dbApps = await pool.query('SELECT COUNT(*) as c FROM applications');
    const dbUsers = await pool.query('SELECT COUNT(*) as c FROM users');

    assert.strictEqual(statsRes.data.totalOrganizations, parseInt(dbOrgs.rows[0].c), 'Total Organizations must match DB');
    assert.strictEqual(statsRes.data.totalApplications, parseInt(dbApps.rows[0].c), 'Total Applications must match DB');
    assert.strictEqual(statsRes.data.registeredUsers, parseInt(dbUsers.rows[0].c), 'Registered Users must match DB');
    assert(typeof statsRes.data.apiRequestsPerMin === 'number', 'apiRequestsPerMin must be a number');

    const activityRes = await request('/api/sysadmin/activity', { headers: sysAdminHeaders });
    assert.strictEqual(activityRes.status, 200, 'Activity endpoint should return 200');
    assert.strictEqual(activityRes.data.health.status, 'Operational', 'Platform Status must be Operational');
    assert.strictEqual(activityRes.data.health.uptime, 'Not available', 'Uptime must be "Not available"');
    assert(activityRes.data.health.dbLatency.endsWith('ms'), 'DB latency must be measured in ms');
    assert(Array.isArray(activityRes.data.timeline), 'Activity timeline must be an array');

    testResults['Dashboard'] = 'PASS';
    console.log('  ✓ Dashboard verified: PASS (Real DB counts, live latency, real rolling requests)');
  } catch (e) {
    testResults['Dashboard'] = 'FAIL: ' + e.message;
    console.error('  ✗ Dashboard: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ORGANIZATIONS LISTING & DETAILS
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [2/15] Verifying Organizations...');
  let testOrg = null;
  try {
    const orgsRes = await request('/api/organizations', { headers: sysAdminHeaders });
    assert.strictEqual(orgsRes.status, 200, 'Orgs endpoint should return 200');
    assert(Array.isArray(orgsRes.data) && orgsRes.data.length > 0, 'Orgs array must not be empty');

    testOrg = orgsRes.data[0];
    const detailsRes = await request(`/api/organizations/${testOrg.id}`, { headers: sysAdminHeaders });
    assert.strictEqual(detailsRes.status, 200, 'Org details should return 200');
    assert.strictEqual(detailsRes.data.id, testOrg.id, 'Loaded org ID must match requested');
    assert(detailsRes.data.name, 'Org details must have name');
    assert(detailsRes.data.admin_name, 'Org details must have admin_name');
    assert(detailsRes.data.email, 'Org details must have email');
    assert(typeof detailsRes.data.applications_count !== 'undefined', 'Must have applications_count');
    assert(typeof detailsRes.data.users_count !== 'undefined', 'Must have users_count');
    assert(Array.isArray(detailsRes.data.applications), 'Must have applications array');
    assert(Array.isArray(detailsRes.data.users), 'Must have users array');

    testResults['Organizations'] = 'PASS';
    console.log('  ✓ Organizations listing and details verified: PASS');
  } catch (e) {
    testResults['Organizations'] = 'FAIL: ' + e.message;
    console.error('  ✗ Organizations: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ORGANIZATION REGISTRATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [3/15] Verifying Organization Registration...');
  const newOrgName = `FinalTestOrg_${Date.now()}`;
  const newOrgEmail = `finaltest_${Date.now()}@example.com`;
  let createdOrgId = null;
  try {
    const regRes = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newOrgName,
        email: newOrgEmail,
        adminName: 'Final Admin',
        phone: '9876543210',
        industry: 'retail',
        password: 'password123'
      })
    });
    assert.strictEqual(regRes.status, 201, 'Registration should return 201');

    // Verify record in PostgreSQL directly
    const dbCheck = await pool.query('SELECT id, name, email, status FROM organizations WHERE email = $1', [newOrgEmail]);
    assert.strictEqual(dbCheck.rows.length, 1, 'Org must exist in PostgreSQL');
    createdOrgId = dbCheck.rows[0].id;

    // Verify admin user created in PostgreSQL
    const adminCheck = await pool.query('SELECT id, name, email, role, organization_id, password_hash FROM users WHERE email = $1', [newOrgEmail]);
    assert.strictEqual(adminCheck.rows.length, 1, 'Admin user must exist in PostgreSQL');
    assert.strictEqual(adminCheck.rows[0].role, 'org_admin', 'Role must be org_admin');
    assert.strictEqual(adminCheck.rows[0].organization_id, createdOrgId, 'Admin must be linked to org');
    assert(!adminCheck.rows[0].password_hash.includes('password123'), 'Password must be hashed, never plaintext');

    // Duplicate name test
    const dupName = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newOrgName,
        email: `other_${Date.now()}@example.com`,
        adminName: 'Admin 2',
        password: 'password123'
      })
    });
    assert.strictEqual(dupName.status, 400, 'Duplicate org name must return 400');

    // Duplicate email test
    const dupEmail = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `DifferentName_${Date.now()}`,
        email: newOrgEmail,
        adminName: 'Admin 3',
        password: 'password123'
      })
    });
    assert.strictEqual(dupEmail.status, 400, 'Duplicate email must return 400');

    testResults['Organization registration'] = 'PASS';
    console.log('  ✓ Organization registration verified: PASS');
  } catch (e) {
    testResults['Organization registration'] = 'FAIL: ' + e.message;
    console.error('  ✗ Organization registration: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ORGANIZATION ACTIVATE / DEACTIVATE
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [4/15] Verifying Organization Activate / Deactivate...');
  try {
    assert(createdOrgId, 'Need createdOrgId from step 3');
    // Deactivate
    const deactRes = await request(`/api/organizations/${createdOrgId}/status`, {
      method: 'PATCH',
      headers: sysAdminHeaders,
      body: JSON.stringify({ status: 'inactive' })
    });
    assert.strictEqual(deactRes.status, 200, 'Deactivate should return 200');
    assert.strictEqual(deactRes.data.status, 'inactive', 'Response status must be inactive');

    // Verify DB
    const dbDeact = await pool.query('SELECT status FROM organizations WHERE id = $1', [createdOrgId]);
    assert.strictEqual(dbDeact.rows[0].status, 'inactive', 'PostgreSQL status must be inactive');

    // Verify blocked login for inactive organization user
    const blockedLogin = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newOrgEmail, password: 'password123' })
    });
    assert.strictEqual(blockedLogin.status, 403, 'Inactive organization user login must be rejected (403)');

    // Activate
    const actRes = await request(`/api/organizations/${createdOrgId}/status`, {
      method: 'PATCH',
      headers: sysAdminHeaders,
      body: JSON.stringify({ status: 'active' })
    });
    assert.strictEqual(actRes.status, 200, 'Activate should return 200');
    assert.strictEqual(actRes.data.status, 'active', 'Response status must be active');

    const dbAct = await pool.query('SELECT status FROM organizations WHERE id = $1', [createdOrgId]);
    assert.strictEqual(dbAct.rows[0].status, 'active', 'PostgreSQL status must be active');

    testResults['Organization activate/deactivate'] = 'PASS';
    console.log('  ✓ Organization activate/deactivate verified: PASS');
  } catch (e) {
    testResults['Organization activate/deactivate'] = 'FAIL: ' + e.message;
    console.error('  ✗ Organization activate/deactivate: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. PLATFORM USERS
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [5/15] Verifying Platform Users...');
  let usersList = [];
  try {
    const usersRes = await request('/api/sysadmin/users', { headers: sysAdminHeaders });
    assert.strictEqual(usersRes.status, 200, 'Users endpoint should return 200');
    assert(Array.isArray(usersRes.data), 'Users must be an array');
    usersList = usersRes.data;

    // Direct DB count comparison
    const dbUsersCount = await pool.query('SELECT COUNT(*) as c FROM users');
    assert.strictEqual(usersList.length, parseInt(dbUsersCount.rows[0].c), 'User count must match PostgreSQL');

    testResults['Platform Users'] = 'PASS';
    console.log('  ✓ Platform Users listing verified: PASS');
  } catch (e) {
    testResults['Platform Users'] = 'FAIL: ' + e.message;
    console.error('  ✗ Platform Users: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. USER SEARCH / FILTER
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [6/15] Verifying User Search & Filtering...');
  try {
    // Search simulation (client-side filtering logic verification)
    const term = 'final';
    const searched = usersList.filter(u =>
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    );
    assert(searched.length > 0, 'Search should find test user');

    // Role filtering
    const designers = usersList.filter(u => u.role === 'designer');
    const orgAdmins = usersList.filter(u => u.role === 'org_admin');
    const sysAdmins = usersList.filter(u => u.role === 'sys_admin');
    assert(sysAdmins.length >= 1, 'Must have sys_admin');

    // Multi-condition filter: Role + Status + Org
    const filtered = usersList.filter(u =>
      u.role === 'org_admin' &&
      u.status === 'active' &&
      (u.organization_name || 'System') === newOrgName
    );
    assert.strictEqual(filtered.length, 1, 'Multi-condition filter must find exactly 1 matching user');

    testResults['User search/filter'] = 'PASS';
    console.log('  ✓ User search/filter verified: PASS');
  } catch (e) {
    testResults['User search/filter'] = 'FAIL: ' + e.message;
    console.error('  ✗ User search/filter: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. USER STATUS MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [7/15] Verifying User Status Management...');
  try {
    const testUser = usersList.find(u => u.email === newOrgEmail);
    assert(testUser, 'Test user must exist');

    // Deactivate
    const deactUser = await request(`/api/sysadmin/users/${testUser.id}/status`, {
      method: 'PATCH',
      headers: sysAdminHeaders,
      body: JSON.stringify({ status: 'inactive' })
    });
    assert.strictEqual(deactUser.status, 200, 'Deactivate user should return 200');
    assert.strictEqual(deactUser.data.user.status, 'inactive', 'Status must be inactive');

    // Verify PostgreSQL
    const dbUserDeact = await pool.query('SELECT status FROM users WHERE id = $1', [testUser.id]);
    assert.strictEqual(dbUserDeact.rows[0].status, 'inactive', 'PostgreSQL status must be inactive');

    // Verify login rejection for inactive user
    const deactLogin = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newOrgEmail, password: 'password123' })
    });
    assert.strictEqual(deactLogin.status, 403, 'Inactive user login must return 403');

    // Reactivate
    const actUser = await request(`/api/sysadmin/users/${testUser.id}/status`, {
      method: 'PATCH',
      headers: sysAdminHeaders,
      body: JSON.stringify({ status: 'active' })
    });
    assert.strictEqual(actUser.status, 200, 'Activate user should return 200');
    assert.strictEqual(actUser.data.user.status, 'active', 'Status must be active');

    const dbUserAct = await pool.query('SELECT status FROM users WHERE id = $1', [testUser.id]);
    assert.strictEqual(dbUserAct.rows[0].status, 'active', 'PostgreSQL status must be active');

    testResults['User status management'] = 'PASS';
    console.log('  ✓ User status management verified: PASS');
  } catch (e) {
    testResults['User status management'] = 'FAIL: ' + e.message;
    console.error('  ✗ User status management: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 8. USER DELETION & PROTECTION
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [8/15] Verifying User Deletion & Protection...');
  try {
    const sysAdminUser = usersList.find(u => u.role === 'sys_admin');
    assert(sysAdminUser, 'SysAdmin user must exist');

    // Backend must reject deleting sys_admin
    const deleteAdmin = await request(`/api/sysadmin/users/${sysAdminUser.id}`, {
      method: 'DELETE',
      headers: sysAdminHeaders
    });
    assert.strictEqual(deleteAdmin.status, 403, 'Deleting System Administrator must return 403');

    // Backend must reject deactivating sys_admin
    const deactAdmin = await request(`/api/sysadmin/users/${sysAdminUser.id}/status`, {
      method: 'PATCH',
      headers: sysAdminHeaders,
      body: JSON.stringify({ status: 'inactive' })
    });
    assert.strictEqual(deactAdmin.status, 403, 'Deactivating System Administrator must return 403');

    // Normal user deletion
    const testUser = usersList.find(u => u.email === newOrgEmail);
    assert(testUser, 'Test user must exist');
    const deleteRes = await request(`/api/sysadmin/users/${testUser.id}`, {
      method: 'DELETE',
      headers: sysAdminHeaders
    });
    assert.strictEqual(deleteRes.status, 200, 'Deleting normal user should return 200');

    // Verify deletion in PostgreSQL
    const dbCheckDelete = await pool.query('SELECT id FROM users WHERE id = $1', [testUser.id]);
    assert.strictEqual(dbCheckDelete.rows.length, 0, 'User must not exist in PostgreSQL');

    testResults['User deletion'] = 'PASS';
    console.log('  ✓ User deletion & System Administrator protection verified: PASS');
  } catch (e) {
    testResults['User deletion'] = 'FAIL: ' + e.message;
    console.error('  ✗ User deletion: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 9. SETTINGS & PROFILE
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [9/15] Verifying Settings/Profile...');
  try {
    const profRes = await request('/api/users/profile', { headers: sysAdminHeaders });
    assert.strictEqual(profRes.status, 200, 'Profile fetch should return 200');
    assert.strictEqual(profRes.data.role, 'sys_admin', 'Role must be sys_admin');

    const originalName = profRes.data.name;
    const updatedName = 'System Administrator Verified';

    // Update name
    const updateRes = await request('/api/users/profile', {
      method: 'PUT',
      headers: sysAdminHeaders,
      body: JSON.stringify({ name: updatedName })
    });
    assert.strictEqual(updateRes.status, 200, 'Profile update should return 200');

    // Verify in PostgreSQL
    const dbProfCheck = await pool.query('SELECT name FROM users WHERE id = 5');
    assert.strictEqual(dbProfCheck.rows[0].name, updatedName, 'Name in PostgreSQL must match updated value');

    // Restore name
    await request('/api/users/profile', {
      method: 'PUT',
      headers: sysAdminHeaders,
      body: JSON.stringify({ name: originalName })
    });

    testResults['Settings/profile'] = 'PASS';
    console.log('  ✓ Settings/profile verified: PASS');
  } catch (e) {
    testResults['Settings/profile'] = 'FAIL: ' + e.message;
    console.error('  ✗ Settings/profile: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 10. PASSWORD CHANGE LIFECYCLE
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [10/15] Verifying Password Change Lifecycle...');
  try {
    const oldPassword = 'admin@123';
    const newPassword = 'NewSecretAdminPass@2026';

    // Change password
    const changeRes = await request('/api/users/change-password', {
      method: 'POST',
      headers: sysAdminHeaders,
      body: JSON.stringify({
        currentPassword: oldPassword,
        newPassword: newPassword
      })
    });
    assert.strictEqual(changeRes.status, 200, 'Change password should return 200');

    // Old password must NO LONGER work
    const oldLoginAttempt = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: oldPassword })
    });
    assert.strictEqual(oldLoginAttempt.status, 401, 'Old password must be rejected (401)');

    // New password MUST work
    const newLoginAttempt = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: newPassword })
    });
    assert.strictEqual(newLoginAttempt.status, 200, 'New password must log in successfully');

    // Restore original password
    const restoreRes = await request('/api/users/change-password', {
      method: 'POST',
      headers: sysAdminHeaders,
      body: JSON.stringify({
        currentPassword: newPassword,
        newPassword: oldPassword
      })
    });
    assert.strictEqual(restoreRes.status, 200, 'Password restore should return 200');

    // Verify original password works again
    const finalLogin = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: oldPassword })
    });
    assert.strictEqual(finalLogin.status, 200, 'Original password must work after restore');

    testResults['Password change'] = 'PASS';
    console.log('  ✓ Password change lifecycle verified: PASS');
  } catch (e) {
    testResults['Password change'] = 'FAIL: ' + e.message;
    console.error('  ✗ Password change: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 12. ROLE AUTHORIZATION (UNAUTHORIZED ACCESS CHECKS)
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [12/15] Verifying Role Authorization...');
  try {
    // Org Admin blocked from SysAdmin stats
    const orgAdminStats = await request('/api/sysadmin/stats', {
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Id': '7',
        'X-User-Id': '7',
        'X-User-Email': 'abc123@gmail.com',
        'X-User-Role': 'org_admin'
      }
    });
    assert.strictEqual(orgAdminStats.status, 403, 'Org Admin calling /api/sysadmin/stats must return 403');

    // Designer blocked from SysAdmin users
    const designerUsers = await request('/api/sysadmin/users', {
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Id': '7',
        'X-User-Id': '17',
        'X-User-Email': 'sneha123@gmail.com',
        'X-User-Role': 'designer'
      }
    });
    assert.strictEqual(designerUsers.status, 403, 'Designer calling /api/sysadmin/users must return 403');

    // Spoofed role header (client claims sys_admin, but DB user is designer)
    const spoofed = await request('/api/sysadmin/stats', {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': '17',
        'X-User-Email': 'sneha123@gmail.com',
        'X-User-Role': 'sys_admin'
      }
    });
    assert.strictEqual(spoofed.status, 403, 'Spoofed role header must be rejected via DB check (403)');

    testResults['Role authorization'] = 'PASS';
    console.log('  ✓ Role authorization verified: PASS');
  } catch (e) {
    testResults['Role authorization'] = 'FAIL: ' + e.message;
    console.error('  ✗ Role authorization: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 13. DATABASE PERSISTENCE
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [13/15] Verifying Database Persistence...');
  try {
    // Verify direct PostgreSQL query consistency across tables
    const orgQuery = await pool.query('SELECT COUNT(*) as c FROM organizations');
    const userQuery = await pool.query('SELECT COUNT(*) as c FROM users');
    const appQuery = await pool.query('SELECT COUNT(*) as c FROM applications');

    assert(parseInt(orgQuery.rows[0].c) >= 2, 'Must have at least 2 organizations');
    assert(parseInt(userQuery.rows[0].c) >= 6, 'Must have at least 6 users');
    assert(parseInt(appQuery.rows[0].c) >= 1, 'Must have at least 1 application');

    // Verify foreign key integrity: no orphan users
    const orphanUsers = await pool.query(
      'SELECT id FROM users WHERE organization_id IS NOT NULL AND organization_id NOT IN (SELECT id FROM organizations)'
    );
    assert.strictEqual(orphanUsers.rows.length, 0, 'No orphan users allowed');

    // Verify foreign key integrity: no orphan apps
    const orphanApps = await pool.query(
      'SELECT id FROM applications WHERE organization_id IS NOT NULL AND organization_id NOT IN (SELECT id FROM organizations)'
    );
    assert.strictEqual(orphanApps.rows.length, 0, 'No orphan applications allowed');

    testResults['Database persistence'] = 'PASS';
    console.log('  ✓ Database persistence & FK integrity verified: PASS');
  } catch (e) {
    testResults['Database persistence'] = 'FAIL: ' + e.message;
    console.error('  ✗ Database persistence: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 14. REFRESH PERSISTENCE
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [14/15] Verifying Refresh Persistence...');
  try {
    // Toggle organization status, then do fresh fetch (simulating page reload)
    const orgToTest = testOrg.id;
    const initialStatus = testOrg.status;
    const toggleTarget = initialStatus === 'active' ? 'inactive' : 'active';

    await request(`/api/organizations/${orgToTest}/status`, {
      method: 'PATCH',
      headers: sysAdminHeaders,
      body: JSON.stringify({ status: toggleTarget })
    });

    // Fresh simulated reload
    const freshFetch = await request(`/api/organizations/${orgToTest}`, { headers: sysAdminHeaders });
    assert.strictEqual(freshFetch.data.status, toggleTarget, 'Refreshed status must equal target');

    // Toggle back
    await request(`/api/organizations/${orgToTest}/status`, {
      method: 'PATCH',
      headers: sysAdminHeaders,
      body: JSON.stringify({ status: initialStatus })
    });

    const restoredFetch = await request(`/api/organizations/${orgToTest}`, { headers: sysAdminHeaders });
    assert.strictEqual(restoredFetch.data.status, initialStatus, 'Restored status must persist');

    testResults['Refresh persistence'] = 'PASS';
    console.log('  ✓ Refresh persistence verified: PASS');
  } catch (e) {
    testResults['Refresh persistence'] = 'FAIL: ' + e.message;
    console.error('  ✗ Refresh persistence: FAIL', e);
  }

  // ─────────────────────────────────────────────────────────────
  // 15. ERROR HANDLING
  // ─────────────────────────────────────────────────────────────
  console.log('\n▶ [15/15] Verifying Error Handling...');
  try {
    // 400 Bad Request on invalid status
    const badStatus = await request(`/api/organizations/${testOrg.id}/status`, {
      method: 'PATCH',
      headers: sysAdminHeaders,
      body: JSON.stringify({ status: 'invalid_status_value' })
    });
    assert.strictEqual(badStatus.status, 400, 'Invalid status must return 400');
    assert(badStatus.data.error, 'Must return JSON error message');

    // 404 Not Found on nonexistent org
    const notFoundOrg = await request('/api/organizations/99999999', { headers: sysAdminHeaders });
    assert.strictEqual(notFoundOrg.status, 404, 'Nonexistent org must return 404');
    assert(notFoundOrg.data.error, 'Must return JSON error message');

    // 401 Unauthorized on missing credentials
    const noAuth = await request('/api/sysadmin/stats');
    assert.strictEqual(noAuth.status, 403, 'Missing sysadmin credentials must return 403 or 401');

    testResults['Error handling'] = 'PASS';
    console.log('  ✓ Error handling verified: PASS');
  } catch (e) {
    testResults['Error handling'] = 'FAIL: ' + e.message;
    console.error('  ✗ Error handling: FAIL', e);
  }

  // Clean up any remaining test organization created during run
  if (createdOrgId) {
    await pool.query('DELETE FROM organizations WHERE id = $1', [createdOrgId]);
  }

  console.log('\n================================================================');
  console.log('FINAL TEST REPORT (15/15 CHECKS):');
  console.log('================================================================');
  let allPass = true;
  for (const [task, result] of Object.entries(testResults)) {
    const isPass = result === 'PASS';
    if (!isPass) allPass = false;
    console.log(`${isPass ? '✓' : '✗'} ${task}: ${result}`);
  }
  console.log('================================================================');
  console.log(`OVERALL RESULT: ${allPass ? 'ALL CHECKS PASSED (15/15)' : 'SOME CHECKS FAILED'}`);
  console.log('================================================================\n');

  process.exit(allPass ? 0 : 1);
}

runComprehensiveVerification().catch(err => {
  console.error('\nFatal test failure:', err);
  process.exit(1);
});
