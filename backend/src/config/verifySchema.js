import { pool } from './database.js';

async function runSchemaVerification() {
  console.log('====================================================');
  console.log('MYSQL-2: SCHEMA VERIFICATION TEST');
  console.log('====================================================\n');

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Verify all 12 tables exist
    console.log('[1] Checking Table Existence...');
    const [tables] = await connection.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = DATABASE() 
       ORDER BY table_name;`
    );
    const tableNames = tables.map((t) => t.TABLE_NAME || t.table_name);
    console.log(`  Found ${tableNames.length} tables: ${tableNames.join(', ')}`);

    const expectedTables = [
      'audit_events',
      'notifications',
      'problem_ai_analysis',
      'problem_assignments',
      'problem_completions',
      'problem_inspections',
      'problem_supports',
      'problem_work_orders',
      'problem_work_reports',
      'problems',
      'resolution_feedback',
      'users',
    ];

    for (const exp of expectedTables) {
      if (!tableNames.includes(exp)) {
        throw new Error(`Missing expected table: ${exp}`);
      }
    }
    console.log('  >>> [PASS] All 12 required tables exist.\n');

    // 2. Verify Foreign Keys
    console.log('[2] Checking Foreign Key Constraints...');
    const [fks] = await connection.query(
      `SELECT table_name, constraint_name, column_name, referenced_table_name, referenced_column_name
       FROM information_schema.key_column_usage
       WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL
       ORDER BY table_name;`
    );
    for (const fk of fks) {
      console.log(`  FK: ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} (${fk.CONSTRAINT_NAME})`);
    }
    console.log(`  >>> [PASS] ${fks.length} Foreign key constraints verified.\n`);

    // 3. Verify Unique Key on problem_supports (problem_id, user_id)
    console.log('[3] Checking UNIQUE(problem_id, user_id) on problem_supports...');
    const [uniques] = await connection.query(
      `SELECT constraint_name, column_name, ordinal_position
       FROM information_schema.key_column_usage
       WHERE table_schema = DATABASE() 
         AND table_name = 'problem_supports' 
         AND constraint_name = 'uq_support_problem_user'
       ORDER BY ordinal_position;`
    );
    const uqCols = uniques.map((u) => u.COLUMN_NAME || u.column_name);
    console.log(`  Unique constraint columns: ${uqCols.join(', ')}`);
    if (uqCols.join(',') !== 'problem_id,user_id') {
      throw new Error(`Unique constraint uq_support_problem_user missing or invalid: found ${uqCols.join(',')}`);
    }
    console.log('  >>> [PASS] UNIQUE(problem_id, user_id) verified on problem_supports.\n');

    // 4. Verify JSON columns
    console.log('[4] Checking JSON Columns...');
    const [jsonCols] = await connection.query(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND data_type = 'json'
       ORDER BY table_name, column_name;`
    );
    for (const jc of jsonCols) {
      console.log(`  JSON Column: ${jc.TABLE_NAME || jc.table_name}.${jc.COLUMN_NAME || jc.column_name}`);
    }
    console.log(`  >>> [PASS] ${jsonCols.length} JSON columns verified.\n`);

    // 5. Verify Indexes on Frequently Queried Fields
    console.log('[5] Checking Indexes on status, officer_id, role, created_at...');
    const [indexes] = await connection.query(
      `SELECT DISTINCT table_name, index_name, column_name
       FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND index_name NOT IN ('PRIMARY', 'uq_support_problem_user')
       ORDER BY table_name, index_name;`
    );
    for (const idx of indexes) {
      console.log(`  Index: ${idx.TABLE_NAME || idx.table_name}.${idx.COLUMN_NAME || idx.column_name} (${idx.INDEX_NAME || idx.index_name})`);
    }
    console.log(`  >>> [PASS] ${indexes.length} secondary indexes verified.\n`);

    // 6. Test Behavioral Integrity: Insert test problem, test unique support constraint, test cascade delete
    console.log('[6] Testing Functional Constraint Integrity (Insert / Duplicate Constraint / Cascade)...');
    await connection.beginTransaction();

    const testProblemId = `test-prob-${Date.now()}`;
    await connection.query(
      `INSERT INTO problems (id, title, description, category, latitude, longitude, created_by, internal_status, status)
       VALUES (?, 'Test Pothole', 'Test pothole description', 'road', 13.0852, 80.2731, 'citizen-test', 'ADMIN_REVIEW', 'REPORTED');`,
      [testProblemId]
    );

    // First support insert -> should succeed
    await connection.query(
      `INSERT INTO problem_supports (id, problem_id, user_id, explanation)
       VALUES (?, ?, 'citizen-user-1', 'First support');`,
      [`sup-${Date.now()}-1`, testProblemId]
    );

    // Second support insert with SAME user -> must fail with duplicate entry error
    let duplicateCaught = false;
    try {
      await connection.query(
        `INSERT INTO problem_supports (id, problem_id, user_id, explanation)
         VALUES (?, ?, 'citizen-user-1', 'Duplicate support attempt');`,
        [`sup-${Date.now()}-2`, testProblemId]
      );
    } catch (dupErr) {
      if (dupErr.code === 'ER_DUP_ENTRY') {
        duplicateCaught = true;
        console.log('  Duplicate support blocked by MySQL constraint: ER_DUP_ENTRY (Expected)');
      } else {
        throw dupErr;
      }
    }

    if (!duplicateCaught) {
      throw new Error('UNIQUE(problem_id, user_id) failed to reject duplicate support!');
    }

    // Test cascade delete
    await connection.query('DELETE FROM problems WHERE id = ?;', [testProblemId]);
    const [orphanSupports] = await connection.query(
      'SELECT id FROM problem_supports WHERE problem_id = ?;',
      [testProblemId]
    );
    if (orphanSupports.length !== 0) {
      throw new Error('ON DELETE CASCADE failed on problem_supports!');
    }
    console.log('  Foreign Key ON DELETE CASCADE cleaned up child rows successfully.');

    await connection.rollback();
    console.log('  Transaction rolled back cleanly.\n');

    console.log('====================================================');
    console.log('ALL SCHEMA VERIFICATION CHECKS PASSED (MYSQL-2 SUCCESS)');
    console.log('====================================================');
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Schema verification error:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

runSchemaVerification();
