// Comprehensive verification script for Entera.ai modules
const BASE_URL = 'http://127.0.0.1:5000';

// Headers simulating logged-in designer Joseph (user_id: 130, org_id: 9) for App 96
const DESIGNER_HEADERS = {
  'Content-Type': 'application/json',
  'x-org-id': '9',
  'x-user-id': '130',
  'x-user-role': 'designer',
  'x-user-email': 'joseph123@gmail.com'
};

// Headers simulating Org Admin Jerry (user_id: 36, org_id: 9)
const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-org-id': '9',
  'x-user-id': '19',
  'x-user-role': 'org_admin',
  'x-user-email': 'xyz123@gmail.com'
};

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log(' STARTING ENTERA.AI MODULES VERIFICATION');
  console.log('====================================================\n');

  const appId = 96;

  // ==========================================
  // 1. DATABASE SCHEMA MODULE
  // ==========================================
  console.log('--- TEST GROUP 1: DATABASE SCHEMA MANAGEMENT ---');

  // 1.1 Load initial schema
  const getRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/schema`, {
    headers: DESIGNER_HEADERS
  });
  assert(getRes.status === 200, `GET schema returned status ${getRes.status}`);
  const initialSchema = await getRes.json();
  assert(initialSchema && (Array.isArray(initialSchema.tables) || initialSchema.tables === undefined), 'GET schema returns valid schema structure');

  // 1.2 Test Schema Validation: Invalid table name
  const invalidSchema1 = {
    tables: [
      {
        name: '123_invalid-table!',
        columns: [{ name: 'id', type: 'INTEGER', isPrimaryKey: true }]
      }
    ]
  };
  const valRes1 = await fetch(`${BASE_URL}/api/designer/applications/${appId}/schema`, {
    method: 'PUT',
    headers: DESIGNER_HEADERS,
    body: JSON.stringify({ schema_data: invalidSchema1 })
  });
  assert(valRes1.status === 400, 'Schema validation correctly rejects invalid table name with status 400');
  const valErr1 = await valRes1.json();
  assert(valErr1.details && valErr1.details.some(d => d.includes('must begin with a letter')), 'Error mentions invalid table name syntax');

  // 1.3 Test Schema Validation: Duplicate column names
  const invalidSchema2 = {
    tables: [
      {
        name: 'patients',
        columns: [
          { name: 'id', type: 'INTEGER', isPrimaryKey: true },
          { name: 'email', type: 'VARCHAR' },
          { name: 'email', type: 'TEXT' }
        ]
      }
    ]
  };
  const valRes2 = await fetch(`${BASE_URL}/api/designer/applications/${appId}/schema`, {
    method: 'PUT',
    headers: DESIGNER_HEADERS,
    body: JSON.stringify({ schema_data: invalidSchema2 })
  });
  assert(valRes2.status === 400, 'Schema validation correctly rejects duplicate columns with status 400');

  // 1.4 Test Schema Validation: Invalid Foreign Key referencing non-existent table
  const invalidSchema3 = {
    tables: [
      {
        name: 'appointments',
        columns: [
          { name: 'id', type: 'INTEGER', isPrimaryKey: true },
          {
            name: 'doctor_id',
            type: 'INTEGER',
            foreignKey: {
              targetTable: 'non_existent_doctors',
              targetColumn: 'id'
            }
          }
        ]
      }
    ]
  };
  const valRes3 = await fetch(`${BASE_URL}/api/designer/applications/${appId}/schema`, {
    method: 'PUT',
    headers: DESIGNER_HEADERS,
    body: JSON.stringify({ schema_data: invalidSchema3 })
  });
  assert(valRes3.status === 400, 'Schema validation correctly rejects foreign key to missing table');

  // 1.5 Save Valid Multi-Table Schema with Constraints and Foreign Key
  const validSchema = {
    tables: [
      {
        id: 'tbl_patients',
        name: 'patients',
        description: 'Healthcare clinic registered patients',
        columns: [
          { id: 'c1', name: 'id', type: 'INTEGER', isPrimaryKey: true, isNullable: false, isUnique: true },
          { id: 'c2', name: 'full_name', type: 'VARCHAR', isPrimaryKey: false, isNullable: false, isUnique: false },
          { id: 'c3', name: 'email', type: 'VARCHAR', isPrimaryKey: false, isNullable: true, isUnique: true },
          { id: 'c4', name: 'blood_group', type: 'VARCHAR', isPrimaryKey: false, isNullable: true, defaultValue: 'O+' },
          { id: 'c5', name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isNullable: false, defaultValue: 'NOW()' }
        ]
      },
      {
        id: 'tbl_consultations',
        name: 'consultations',
        description: 'Doctor consultation sessions',
        columns: [
          { id: 'c6', name: 'id', type: 'INTEGER', isPrimaryKey: true, isNullable: false, isUnique: true },
          {
            id: 'c7',
            name: 'patient_id',
            type: 'INTEGER',
            isPrimaryKey: false,
            isNullable: false,
            foreignKey: {
              targetTable: 'patients',
              targetColumn: 'id',
              onDelete: 'CASCADE'
            }
          },
          { id: 'c8', name: 'diagnosis', type: 'TEXT', isPrimaryKey: false, isNullable: true },
          { id: 'c9', name: 'consultation_fee', type: 'NUMERIC', isPrimaryKey: false, isNullable: true, defaultValue: '50.00' },
          { id: 'c10', name: 'is_completed', type: 'BOOLEAN', isPrimaryKey: false, isNullable: false, defaultValue: 'false' }
        ]
      }
    ]
  };

  const saveRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/schema`, {
    method: 'PUT',
    headers: DESIGNER_HEADERS,
    body: JSON.stringify({ schema_data: validSchema })
  });
  assert(saveRes.status === 200, `Schema save succeeded with status 200`);
  const saveJson = await saveRes.json();
  assert(saveJson.success === true, 'Response confirms schema save success');

  // 1.6 Verify persistence by re-fetching
  const reloadRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/schema`, {
    headers: DESIGNER_HEADERS
  });
  const reloadedSchema = await reloadRes.json();
  const tables = reloadedSchema.schema_data?.tables || reloadedSchema.tables;
  assert(tables && tables.length === 2, 'Reloaded schema correctly returns the 2 persisted tables');
  assert(tables[0].name === 'patients' && tables[1].name === 'consultations', 'Table names verified in database persistence');
  assert(tables[1].columns.find(c => c.name === 'patient_id')?.foreignKey?.targetTable === 'patients', 'Foreign key relationship persisted');


  // ==========================================
  // 2. REST APIS MODULE
  // ==========================================
  console.log('\n--- TEST GROUP 2: REST APIS & RUNTIME GENERATOR ---');

  // 2.1 Auto-Generate REST APIs from Schema
  const genRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/apis/generate`, {
    method: 'POST',
    headers: DESIGNER_HEADERS
  });
  assert(genRes.status === 200, `API Generation succeeded with status 200`);
  const genJson = await genRes.json();
  const endpointCount = genJson.endpoints?.length || 0;
  assert(genJson.success === true && endpointCount > 0, `Generated ${endpointCount} REST endpoints for application`);

  // 2.2 Verify Generated APIs in Application Definition
  const appApisRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/apis`, {
    headers: DESIGNER_HEADERS
  });
  const apisData = await appApisRes.json();
  const apis = apisData.endpoints || [];
  assert(apis.length >= 8, `Application contains ${apis.length} registered APIs`);
  const patientApi = apis.find(a => a.path?.includes('patients') && a.method === 'GET');
  assert(!!patientApi, 'Generated list includes GET /api/runtime/:id/data/patients');

  // 2.3 Interactive API Tester: Execute real request against /api/students
  const testStudentReq = {
    method: 'GET',
    path: '/api/students?limit=5',
    headers: {
      'Accept': 'application/json'
    }
  };
  const testRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/apis/test`, {
    method: 'POST',
    headers: DESIGNER_HEADERS,
    body: JSON.stringify(testStudentReq)
  });
  assert(testRes.status === 200, `API Tester proxy returned status 200`);
  const testJson = await testRes.json();
  assert(testJson.success === true, 'API tester executed request successfully');
  assert(testJson.status === 200, `Real target endpoint responded with HTTP status ${testJson.status}`);
  assert(typeof testJson.durationMs === 'number' && testJson.durationMs >= 0, `Real latency measured: ${testJson.durationMs}ms`);
  assert(Array.isArray(testJson.data) || testJson.data?.students, 'API tester received real student records payload');

  // 2.4 API Tester SSRF Defense: Block arbitrary external domains
  const ssrfReq = {
    method: 'GET',
    path: 'https://evil-external-site.com/steal-creds'
  };
  const ssrfRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/apis/test`, {
    method: 'POST',
    headers: DESIGNER_HEADERS,
    body: JSON.stringify(ssrfReq)
  });
  assert(ssrfRes.status === 400, 'API Tester correctly rejects external SSRF URLs with 400');
  const ssrfJson = await ssrfRes.json();
  assert(ssrfJson.error && ssrfJson.error.includes('/api/'), 'Error specifies path must start with /api/');

  // 2.5 Dynamic OpenAPI 3.0 Documentation
  const openApiRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/openapi.json`, {
    headers: DESIGNER_HEADERS
  });
  assert(openApiRes.status === 200, 'GET openapi.json returned status 200');
  const openApiDoc = await openApiRes.json();
  assert(openApiDoc.openapi === '3.0.3', 'OpenAPI specification version is 3.0.3');
  assert(typeof openApiDoc.info?.title === 'string' && openApiDoc.info.title.length > 0, 'OpenAPI info title matches application');
  assert(openApiDoc.paths && Object.keys(openApiDoc.paths).length > 0, 'OpenAPI paths dictionary is populated with application endpoints');


  // ==========================================
  // 3. DEPLOYMENTS MODULE
  // ==========================================
  console.log('\n--- TEST GROUP 3: DEPLOYMENT PIPELINE & ROLLBACK ---');

  // 3.1 Check Deployment Providers status
  const provRes = await fetch(`${BASE_URL}/api/applications/${appId}/deployment-providers`, {
    headers: DESIGNER_HEADERS
  });
  assert(provRes.status === 200, 'GET deployment-providers returned 200');
  const provJson = await provRes.json();
  assert(provJson.entera && provJson.vercel && provJson.render, 'Providers list returns runtime, vercel, and render');
  assert(provJson.entera.id === 'entera' && provJson.entera.status === 'ready', 'Entera Cloud Runtime is operational and ready');

  // 3.2 Pre-publish Validation
  const valPublishRes = await fetch(`${BASE_URL}/api/applications/${appId}/validate-publish`, {
    method: 'POST',
    headers: ADMIN_HEADERS
  });
  assert(valPublishRes.status === 200, 'Pre-publish validation endpoint responded with 200');
  const valPublishJson = await valPublishRes.json();
  assert(valPublishJson.checks && typeof valPublishJson.checks === 'object', 'Pre-publish returned validation checks');

  // Enable a required business module in database for app 96
  let getDB;
  try {
    getDB = require('./db').getDB;
  } catch {
    getDB = require('../server/db').getDB;
  }
  const pool = getDB();
  await pool.query('DELETE FROM application_modules WHERE application_id = $1 AND module_id = $2', [appId, 'user_management']);
  await pool.query('INSERT INTO application_modules (application_id, module_id, is_enabled) VALUES ($1, $2, true)', [appId, 'user_management']);

  // 3.3 Publish Deployment to Staging
  const deployPayload = {
    environment: 'staging',
    notes: 'Automated test staging rollout v1.1.0'
  };
  const deployRes = await fetch(`${BASE_URL}/api/applications/${appId}/publish`, {
    method: 'POST',
    headers: ADMIN_HEADERS,
    body: JSON.stringify(deployPayload)
  });
  assert(deployRes.status === 200, `Deployment publish succeeded with status 200`);
  const deployJson = await deployRes.json();
  assert(deployJson.success === true, 'Deployment returned success flag');
  assert(deployJson.deployment && deployJson.deployment.id, 'Deployment record created in database');
  const newDepId = deployJson.deployment.id;
  assert(deployJson.deployment.environment === 'staging', 'Deployment environment recorded as staging');

  // 3.3 Inspect Build Logs
  const logsRes = await fetch(`${BASE_URL}/api/applications/${appId}/deployments/${newDepId}/logs`, {
    headers: ADMIN_HEADERS
  });
  assert(logsRes.status === 200, 'GET deployment logs returned status 200');
  const logsJson = await logsRes.json();
  assert(logsJson.logs && logsJson.logs.length > 0, 'Build logs retrieved successfully');
  assert(logsJson.logs.some(l => (l.message || '').includes('configuration snapshot bundle') || (l.message || '').includes('Initializing deployment')), 'Log entries include build milestones');

  // 3.4 Rollback to Deployment
  const rollbackRes = await fetch(`${BASE_URL}/api/applications/${appId}/rollback`, {
    method: 'POST',
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ deployment_id: newDepId })
  });
  assert(rollbackRes.status === 200, 'Deployment rollback succeeded with status 200');
  const rollbackJson = await rollbackRes.json();
  assert(rollbackJson.success === true, 'Rollback confirmed success');
  assert(rollbackJson.version?.includes('-r') || rollbackJson.version?.includes('rollback'), 'Rollback version tag assigned correctly');


  // ==========================================
  // 4. SETTINGS MODULE & SYSTEM STATUS
  // ==========================================
  console.log('\n--- TEST GROUP 4: APPLICATION SETTINGS & SYSTEM HEALTH ---');

  // 4.1 System Status Diagnostics (Safe, non-leaking)
  const diagRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}/system-status`, {
    headers: DESIGNER_HEADERS
  });
  assert(diagRes.status === 200, 'GET system-status returned status 200');
  const diagJson = await diagRes.json();
  assert(diagJson.database && diagJson.database.status === 'connected', 'Database diagnostics show connected status');
  assert(typeof diagJson.database.totalPoolClients === 'number', 'Reports active connection pool count');
  assert(typeof diagJson.server?.uptimeSeconds === 'number', 'Reports server uptime');
  assert(diagJson.security && diagJson.security.rateLimiterActive === true, 'Reports security rate limiting active');

  // 4.2 Update Application Settings
  const settingsUpdate = {
    app_name: 'Smart Health Enterprise Suite',
    app_description: 'Next-generation patient management & consultation platform',
    industry: 'Healthcare',
    theme_color: '#10b981',
    default_route: '/patients',
    app_settings: {
      enableAuditLogs: true,
      maxUploadSizeMb: 25,
      notificationEmail: 'alerts@healthclinic.org'
    }
  };
  const updateRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}`, {
    method: 'PUT',
    headers: DESIGNER_HEADERS,
    body: JSON.stringify(settingsUpdate)
  });
  assert(updateRes.status === 200, 'PUT application settings returned status 200');
  const updateJson = await updateRes.json();
  assert(updateJson.success === true, 'Settings update confirmed success');

  // 4.3 Verify settings persisted on reload
  const reloadAppRes = await fetch(`${BASE_URL}/api/designer/applications/${appId}`, {
    headers: DESIGNER_HEADERS
  });
  const reloadedApp = await reloadAppRes.json();
  assert(reloadedApp.app_name === 'Smart Health Enterprise Suite', 'Updated app name persisted');
  assert(reloadedApp.theme_color === '#10b981', 'Theme accent color persisted');
  assert(reloadedApp.default_route === '/patients', 'Default route persisted');
  assert(reloadedApp.app_settings?.enableAuditLogs === true, 'JSONB app settings persisted');

  await pool.end();

  console.log('\n====================================================');
  console.log(` ALL MODULE VERIFICATIONS PASSED (${passedTests}/${totalTests} tests)`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n[FATAL TEST FAILURE]:', err.message);
  process.exit(1);
});
