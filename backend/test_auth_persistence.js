import bcrypt from 'bcryptjs';
import { pool } from './src/config/database.js';

const BASE_URL = 'http://localhost:3001';

async function testAuthPersistence() {
  console.log('====================================================');
  console.log('MYSQL-3B: AUTHENTICATION PERSISTENCE VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  const testEmail = `citizen.test.${Date.now()}@civicresolve.ai`;
  const testPassword = 'Password@2026Secure!';
  const testName = 'Priya Sundaram';

  try {
    // -----------------------------------------------------------
    // TEST A: New citizen signup creates exactly one row in users
    // -----------------------------------------------------------
    console.log('[TEST A] Creating new citizen via POST /api/auth/signup...');
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        role: 'CITIZEN',
      }),
    });

    const signupData = await signupRes.json();
    console.log('  HTTP Status:', signupRes.status);
    console.log('  Response:', JSON.stringify(signupData, null, 2));

    if (signupRes.status !== 201 || !signupData.success) {
      throw new Error(`Signup failed with status ${signupRes.status}`);
    }
    if (signupData.user.role !== 'CITIZEN') {
      throw new Error(`Expected role CITIZEN, got ${signupData.user.role}`);
    }
    if (signupData.user.password || signupData.user.password_hash || signupData.password_hash) {
      throw new Error('Security violation: password or hash exposed in response!');
    }

    const [rowsA] = await pool.query('SELECT * FROM users WHERE email = ?;', [testEmail]);
    if (rowsA.length !== 1) {
      throw new Error(`Expected exactly 1 row in users table for ${testEmail}, found ${rowsA.length}`);
    }
    console.log('  >>> [PASS] TEST A: Exactly one row created for new citizen.\n');
    passedTests++;

    // -----------------------------------------------------------
    // TEST B: Password is stored as a hash, never plaintext
    // -----------------------------------------------------------
    console.log('[TEST B] Verifying password hashing in MySQL...');
    const dbUser = rowsA[0];
    console.log(`  Database ID: ${dbUser.id}`);
    console.log(`  Stored Hash: ${dbUser.password_hash}`);

    if (dbUser.password_hash === testPassword) {
      throw new Error('FATAL SECURITY FLAW: Plaintext password stored in database!');
    }
    if (!dbUser.password_hash.startsWith('$2')) {
      throw new Error(`Hash does not start with bcrypt signature ($2): ${dbUser.password_hash}`);
    }
    const hashValid = await bcrypt.compare(testPassword, dbUser.password_hash);
    if (!hashValid) {
      throw new Error('bcrypt.compare failed against stored password_hash!');
    }
    console.log('  >>> [PASS] TEST B: Password stored as bcrypt hash; plaintext never persisted.\n');
    passedTests++;

    // -----------------------------------------------------------
    // TEST C: Login with correct password succeeds
    // -----------------------------------------------------------
    console.log('[TEST C] Logging in with correct credentials...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginData = await loginRes.json();
    console.log('  HTTP Status:', loginRes.status);
    console.log('  Response:', JSON.stringify(loginData, null, 2));

    if (loginRes.status !== 200 || !loginData.success) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    if (loginData.user.id !== dbUser.id || loginData.user.email !== testEmail) {
      throw new Error('Returned user details do not match signed up citizen!');
    }
    if (loginData.user.password || loginData.user.password_hash || loginData.password_hash) {
      throw new Error('Security violation: password or hash exposed in login response!');
    }
    console.log('  >>> [PASS] TEST C: Login with correct credentials succeeded.\n');
    passedTests++;

    // -----------------------------------------------------------
    // TEST D: Login with wrong password fails
    // -----------------------------------------------------------
    console.log('[TEST D] Logging in with wrong password...');
    const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'CompletelyWrongPassword123!',
      }),
    });

    const wrongLoginData = await wrongLoginRes.json();
    console.log('  HTTP Status:', wrongLoginRes.status, '(Expected: 401)');
    console.log('  Response:', JSON.stringify(wrongLoginData));

    if (wrongLoginRes.status !== 401 || wrongLoginData.success !== false) {
      throw new Error(`Expected 401 Unauthorized, got ${wrongLoginRes.status}`);
    }
    console.log('  >>> [PASS] TEST D: Login with wrong password rejected.\n');
    passedTests++;

    // -----------------------------------------------------------
    // TEST E: Duplicate email signup fails
    // -----------------------------------------------------------
    console.log('[TEST E] Attempting signup with duplicate email...');
    const dupSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Imposter Citizen',
        email: testEmail,
        password: 'AnotherPassword123!',
        role: 'CITIZEN',
      }),
    });

    const dupSignupData = await dupSignupRes.json();
    console.log('  HTTP Status:', dupSignupRes.status, '(Expected: 409)');
    console.log('  Response:', JSON.stringify(dupSignupData));

    if (dupSignupRes.status !== 409 || dupSignupData.success !== false) {
      throw new Error(`Expected 409 Conflict, got ${dupSignupRes.status}`);
    }
    console.log('  >>> [PASS] TEST E: Duplicate email registration rejected.\n');
    passedTests++;

    // -----------------------------------------------------------
    // TEST F: Public ADMIN signup is rejected
    // -----------------------------------------------------------
    console.log('[TEST F] Attempting public ADMIN signup...');
    const adminSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: 'hacker.admin@civicresolve.ai',
        password: 'AdminPassword123!',
        role: 'ADMIN',
      }),
    });

    const adminSignupData = await adminSignupRes.json();
    console.log('  HTTP Status:', adminSignupRes.status, '(Expected: 403)');
    console.log('  Response:', JSON.stringify(adminSignupData));

    if (adminSignupRes.status !== 403 || adminSignupData.success !== false) {
      throw new Error(`Expected 403 Forbidden for ADMIN signup, got ${adminSignupRes.status}`);
    }
    console.log('  >>> [PASS] TEST F: Public ADMIN registration rejected.\n');
    passedTests++;

    // -----------------------------------------------------------
    // TEST G: Public CIVIC_OFFICER signup is rejected
    // -----------------------------------------------------------
    console.log('[TEST G] Attempting public CIVIC_OFFICER signup...');
    const officerSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fake Officer',
        email: 'fake.officer@civicresolve.ai',
        password: 'OfficerPassword123!',
        role: 'CIVIC_OFFICER',
      }),
    });

    const officerSignupData = await officerSignupRes.json();
    console.log('  HTTP Status:', officerSignupRes.status, '(Expected: 403)');
    console.log('  Response:', JSON.stringify(officerSignupData));

    if (officerSignupRes.status !== 403 || officerSignupData.success !== false) {
      throw new Error(`Expected 403 Forbidden for CIVIC_OFFICER signup, got ${officerSignupRes.status}`);
    }
    console.log('  >>> [PASS] TEST G: Public CIVIC_OFFICER registration rejected.\n');
    passedTests++;

    // -----------------------------------------------------------
    // TEST H: Existing seeded users remain intact & functional
    // -----------------------------------------------------------
    console.log('[TEST H] Verifying seeded demo users remain intact...');
    const [seededUsers] = await pool.query(
      `SELECT id, role, name, email, password_hash, dashboard 
       FROM users 
       WHERE id IN ('citizen-101', 'admin-1', 'OFF-001', 'admin-master', 'OFF-002') 
       ORDER BY role, id;`
    );

    if (seededUsers.length !== 5) {
      throw new Error(`Expected 5 primary seeded users, found ${seededUsers.length}`);
    }

    for (const u of seededUsers) {
      console.log(`  • [${u.role.padEnd(13)}] ${u.id.padEnd(14)} | ${u.email.padEnd(28)} | Hash: "${u.password_hash}"`);
    }

    // Verify demo login works for seeded demo users
    const demoLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@civicresolve.ai',
        password: 'any_demo_password',
      }),
    });
    const demoLoginData = await demoLoginRes.json();
    if (demoLoginRes.status !== 200 || !demoLoginData.success) {
      throw new Error(`Demo login failed for seeded user: ${demoLoginRes.status}`);
    }
    console.log('  Demo login check passed for citizen@civicresolve.ai (id: citizen-101)');
    console.log('  >>> [PASS] TEST H: Seeded users preserved intact with backward-compatible login.\n');
    passedTests++;

    // -----------------------------------------------------------
    // TEST 20: SELECT Verification of Rows in MySQL users table
    // -----------------------------------------------------------
    console.log('[TEST 20] Final SELECT Verification of users Table:');
    const [allUsers] = await pool.query(
      `SELECT id, role, name, email, LEFT(password_hash, 12) AS hash_prefix, dashboard, created_at 
       FROM users 
       ORDER BY created_at DESC, id;`
    );
    console.table(allUsers);
    console.log(`  Total user records in database: ${allUsers.length}\n`);

    console.log('====================================================');
    console.log(`ALL ${passedTests} / 8 AUTHENTICATION PERSISTENCE TESTS PASSED!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testAuthPersistence();
