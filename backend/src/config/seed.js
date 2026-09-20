import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function runSeedMigration() {
  console.log('====================================================');
  console.log('MYSQL-4: SEED DATA & AUTHENTICATION MIGRATION');
  console.log('====================================================\n');

  let connection;
  try {
    const connectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'student',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fusionx',
      multipleStatements: true,
    };

    connection = await mysql.createConnection(connectionConfig);

    const sqlPath = path.resolve(__dirname, 'seed.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // 1. Pass 1 execution
    console.log('[1] Executing seed.sql (Pass 1)...');
    await connection.query(sqlContent);

    // Ensure all seeded demo users have a valid bcrypt password hash
    const demoPassword = process.env.DEMO_USER_PASSWORD || 'any_demo_password';
    const demoHash = await bcrypt.hash(demoPassword, 10);
    await connection.query(
      `UPDATE users 
       SET password_hash = ? 
       WHERE (password_hash = '' OR password_hash IS NULL) 
         AND id IN ('citizen-101', 'admin-1', 'OFF-001', 'admin-master', 'OFF-002', 'citizen-alpha', 'citizen-anonymous', 'citizen_2', 'citizen_3', 'citizen_4', 'citizen_5', 'citizen_6', 'citizen_8');`,
      [demoHash]
    );
    console.log('  >>> [PASS] Pass 1 completed successfully with bcrypt demo credentials.\n');

    // 2. Count records after Pass 1
    console.log('[2] Verifying Seeded Table Counts after Pass 1:');
    const [uCount1] = await connection.query('SELECT COUNT(*) as c FROM users;');
    const [pCount1] = await connection.query('SELECT COUNT(*) as c FROM problems;');
    const [aCount1] = await connection.query('SELECT COUNT(*) as c FROM problem_assignments;');
    const [iCount1] = await connection.query('SELECT COUNT(*) as c FROM problem_inspections;');
    const [cCount1] = await connection.query('SELECT COUNT(*) as c FROM problem_completions;');
    const [aiCount1] = await connection.query('SELECT COUNT(*) as c FROM problem_ai_analysis;');
    const [sCount1] = await connection.query('SELECT COUNT(*) as c FROM problem_supports;');
    const [eCount1] = await connection.query('SELECT COUNT(*) as c FROM audit_events;');

    console.log(`  Users: ${uCount1[0].c}`);
    console.log(`  Problems: ${pCount1[0].c}`);
    console.log(`  Assignments: ${aCount1[0].c}`);
    console.log(`  Inspections: ${iCount1[0].c}`);
    console.log(`  Completions: ${cCount1[0].c}`);
    console.log(`  AI Analysis: ${aiCount1[0].c}`);
    console.log(`  Supports: ${sCount1[0].c}`);
    console.log(`  Audit Events: ${eCount1[0].c}\n`);

    // 3. Idempotency Test: Run Pass 2
    console.log('[3] Testing Idempotency (Running Pass 2)...');
    await connection.query(sqlContent);
    await connection.query(
      `UPDATE users 
       SET password_hash = ? 
       WHERE (password_hash = '' OR password_hash IS NULL) 
         AND id IN ('citizen-101', 'admin-1', 'OFF-001', 'admin-master', 'OFF-002', 'citizen-alpha', 'citizen-anonymous', 'citizen_2', 'citizen_3', 'citizen_4', 'citizen_5', 'citizen_6', 'citizen_8');`,
      [demoHash]
    );
    console.log('  >>> [PASS] Pass 2 executed without errors.\n');

    // 4. Verify counts did not double or change
    console.log('[4] Verifying Table Counts after Pass 2 (Idempotency Check)...');
    const [uCount2] = await connection.query('SELECT COUNT(*) as c FROM users;');
    const [pCount2] = await connection.query('SELECT COUNT(*) as c FROM problems;');
    const [aCount2] = await connection.query('SELECT COUNT(*) as c FROM problem_assignments;');
    const [iCount2] = await connection.query('SELECT COUNT(*) as c FROM problem_inspections;');
    const [cCount2] = await connection.query('SELECT COUNT(*) as c FROM problem_completions;');
    const [aiCount2] = await connection.query('SELECT COUNT(*) as c FROM problem_ai_analysis;');
    const [sCount2] = await connection.query('SELECT COUNT(*) as c FROM problem_supports;');
    const [eCount2] = await connection.query('SELECT COUNT(*) as c FROM audit_events;');

    if (
      uCount1[0].c !== uCount2[0].c ||
      pCount1[0].c !== pCount2[0].c ||
      aCount1[0].c !== aCount2[0].c ||
      iCount1[0].c !== iCount2[0].c ||
      cCount1[0].c !== cCount2[0].c ||
      aiCount1[0].c !== aiCount2[0].c ||
      sCount1[0].c !== sCount2[0].c ||
      eCount1[0].c !== eCount2[0].c
    ) {
      throw new Error(`Idempotency check failed: counts changed between Pass 1 and Pass 2!`);
    }
    console.log(`  Users count unchanged: ${uCount2[0].c} == ${uCount1[0].c}`);
    console.log(`  Problems count unchanged: ${pCount2[0].c} == ${pCount1[0].c}`);
    console.log(`  Assignments count unchanged: ${aCount2[0].c} == ${aCount1[0].c}`);
    console.log(`  Inspections count unchanged: ${iCount2[0].c} == ${iCount1[0].c}`);
    console.log(`  Completions count unchanged: ${cCount2[0].c} == ${cCount1[0].c}`);
    console.log(`  AI Analysis count unchanged: ${aiCount2[0].c} == ${aiCount1[0].c}`);
    console.log(`  Supports count unchanged: ${sCount2[0].c} == ${sCount1[0].c}`);
    console.log(`  Audit Events count unchanged: ${eCount2[0].c} == ${eCount1[0].c}`);
    console.log('  >>> [PASS] Idempotent seed execution verified.\n');

    // 5. Inspect DEMO_USERS in users table
    console.log('[5] Checking Seeded DEMO_USERS:');
    const [demoUsers] = await connection.query(
      `SELECT id, role, name, email, dashboard FROM users WHERE id IN ('citizen-101', 'admin-1', 'OFF-001') ORDER BY role;`
    );
    for (const du of demoUsers) {
      console.log(`  • [${du.role}] ${du.id}: "${du.name}" (${du.email}) -> ${du.dashboard}`);
    }
    if (demoUsers.length !== 3) {
      throw new Error(`Expected 3 DEMO_USERS, found ${demoUsers.length}`);
    }
    console.log('  >>> [PASS] All DEMO_USERS verified.\n');

    // 6. Inspect All Seeded Users
    console.log('[6] All Seeded Users:');
    const [allUsers] = await connection.query(
      `SELECT id, role, name, email, dashboard FROM users ORDER BY role, id;`
    );
    for (const u of allUsers) {
      console.log(`  • [${u.role.padEnd(13)}] ${u.id.padEnd(18)} | ${u.name.padEnd(20)} | ${u.email.padEnd(30)} | ${u.dashboard}`);
    }
    console.log(`  Total Users: ${allUsers.length}\n`);

    console.log('====================================================');
    console.log('MYSQL-3A SEED MIGRATION COMPLETED SUCCESSFULLY');
    console.log('====================================================');
  } catch (error) {
    console.error('Seed migration error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeedMigration();
}

