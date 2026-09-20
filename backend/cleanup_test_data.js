import { pool } from './src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function cleanupTestData() {
  console.log('=== FUSIONX MYSQL TEST DATA CLEANUP ===');
  try {
    // 1. Delete transient test problems (cascade deletes assignments, inspections, work reports, work orders, completions, supports, feedback, ai_analysis, audit_events)
    const [problemResult] = await pool.query(
      `DELETE FROM problems 
       WHERE id NOT IN ('101', '102', '103', '104', '105');`
    );
    console.log(`[CLEANUP] Deleted ${problemResult.affectedRows} non-baseline problem records (and cascaded child records).`);

    // 2. Delete dynamic test citizen users created during signup/auth persistence tests
    const [userResult] = await pool.query(
      `DELETE FROM users 
       WHERE email LIKE 'citizen.test.%' 
          OR email LIKE 'test.%' 
          OR id LIKE 'test-%';`
    );
    console.log(`[CLEANUP] Deleted ${userResult.affectedRows} dynamic test users.`);

    // 3. Delete non-baseline notifications
    const [notifResult] = await pool.query(
      `DELETE FROM notifications 
       WHERE problem_id IS NOT NULL 
         AND problem_id NOT IN ('101', '102', '103', '104', '105');`
    );
    console.log(`[CLEANUP] Deleted ${notifResult.affectedRows} transient test notifications.`);

    // 4. Ensure problem 101 is at baseline ASSIGNED state
    await pool.query(
      `UPDATE problems 
       SET internal_status = 'OFFICER_ASSIGNED', status = 'ASSIGNED', updated_at = NOW(3) 
       WHERE id = '101';`
    );
    await pool.query(
      `INSERT INTO problem_assignments (problem_id, officer_id, assigned_at, assigned_by, assignment_status, remarks)
       VALUES ('101', 'OFF-001', NOW(3), 'admin-1', 'ASSIGNED', 'P1 school-zone pothole — inspect today')
       ON DUPLICATE KEY UPDATE officer_id = 'OFF-001', assignment_status = 'ASSIGNED';`
    );
    console.log('[CLEANUP] Reset problem #101 baseline state.');

    // 5. Query and report remaining counts in all tables
    const tables = [
      'users',
      'problems',
      'problem_assignments',
      'problem_inspections',
      'problem_work_reports',
      'problem_work_orders',
      'problem_completions',
      'problem_ai_analysis',
      'problem_supports',
      'resolution_feedback',
      'audit_events',
      'notifications',
    ];

    console.log('\n--- Clean Database State ---');
    for (const table of tables) {
      const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table};`);
      console.log(`  ${table.padEnd(25)}: ${rows[0].count} rows`);
    }

    console.log('\nCleanup completed successfully.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    await pool.end();
    process.exit(1);
  }
}

cleanupTestData();
