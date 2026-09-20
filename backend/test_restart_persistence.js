/**
 * MYSQL-3C: Process Restart Persistence Verification Test
 *
 * Verifies that all civic problem data, child records, audit events,
 * and notifications survive a complete backend process termination and restart.
 */

import { pool } from './src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function api(path, { method = 'GET', role = 'ADMIN', userId = 'admin-master', body = null } = {}) {
  const headers = {
    'x-user-role': role,
    'x-user-id': userId,
  };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: res.status, data: await res.json() };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}\n`);
    throw new Error(message);
  }
}

async function verifyAfterRestart(problemId) {
  console.log(`\n====================================================`);
  console.log(`VERIFYING PROBLEM #${problemId} ON RESTORTED BACKEND SERVER`);
  console.log(`====================================================\n`);

  // 1. Verify backend health
  console.log('[STEP 1] Verifying restarted backend health...');
  const healthRes = await api('/api/health');
  assert(healthRes.status === 200, `Health check failed: ${healthRes.status}`);
  console.log('  ✔ Restarted backend online and healthy.\n');

  // 2. Fetch problem via API
  console.log(`[STEP 2] Fetching problem #${problemId} via GET /api/problems/:id...`);
  const probRes = await api(`/api/problems/${problemId}`, { role: 'ADMIN', userId: 'admin-master' });
  assert(probRes.status === 200, `Failed to retrieve problem after restart: ${probRes.status}`);
  const prob = probRes.data.problem;
  assert(prob && String(prob.id) === String(problemId), 'Problem ID mismatch after restart');
  console.log(`  ✔ Problem #${prob.id} retrieved successfully!`);
  console.log(`    Title: "${prob.title}"`);
  console.log(`    Category: ${prob.category}`);
  console.log(`    Status: ${prob.status}`);
  console.log(`    Internal Status: ${prob.internal_status}`);

  // 3. Verify child records survived restart
  console.log('\n[STEP 3] Verifying all child records survived process restart...');

  // Assignment
  assert(prob.assignment && prob.assignment.officer_id === 'OFF-001', 'Assignment did not survive restart!');
  console.log(`  ✔ Assignment: Officer ${prob.assignment.officer_id} (Status: ${prob.assignment.assignment_status})`);

  // Inspection
  assert(prob.inspection && prob.inspection.severity === 5, 'Inspection did not survive restart!');
  console.log(`  ✔ Inspection: Severity ${prob.inspection.severity}/5, Inspected by ${prob.inspection.inspected_by}`);

  // Work report
  assert(prob.work_report && prob.work_report.workers_required === 4, 'Work report did not survive restart!');
  console.log(`  ✔ Work Report: ${prob.work_report.workers_required} workers, ${prob.work_report.estimated_hours} hours`);

  // Work order
  assert(prob.work_order && prob.work_order.workers_allocated === 4, 'Work order did not survive restart!');
  console.log(`  ✔ Work Order: ${prob.work_order.workers_allocated} workers allocated`);

  // Completion
  assert(prob.completion_verification && prob.completion_verification.completed === true, 'Completion verification did not survive restart!');
  console.log(`  ✔ Completion Verification: Verified by ${prob.completion_verification.verified_by}`);

  // Supports
  assert(Array.isArray(prob.supports) && prob.supports.length >= 1, 'Supports did not survive restart!');
  console.log(`  ✔ Supports: ${prob.supports.length} citizen supporter(s) intact`);

  // Resolution feedback
  assert(Array.isArray(prob.resolution_feedback) && prob.resolution_feedback.length >= 1, 'Resolution feedback did not survive restart!');
  console.log(`  ✔ Resolution Feedback: ${prob.resolution_feedback.length} feedback record(s) intact`);

  // AI analysis
  assert(prob.priority_analysis && prob.priority_analysis.priority_score !== null, 'AI analysis did not survive restart!');
  console.log(`  ✔ AI Analysis: Priority Score ${prob.priority_analysis.priority_score}/100 (${prob.priority_analysis.priority_level})`);

  // 4. Verify audit events trail survived restart
  console.log('\n[STEP 4] Verifying audit trail after restart (GET /api/admin/problems/:id/audit)...');
  const auditRes = await api(`/api/admin/problems/${problemId}/audit`, { role: 'ADMIN', userId: 'admin-master' });
  assert(auditRes.status === 200, `Failed to retrieve audit events: ${auditRes.status}`);
  const events = auditRes.data.events;
  assert(Array.isArray(events) && events.length >= 6, `Expected >= 6 audit events, found ${events ? events.length : 0}`);
  console.log(`  ✔ Audit Trail: All ${events.length} lifecycle events intact after process restart!`);

  // 5. Verify notifications survived restart
  console.log('\n[STEP 5] Verifying notifications after restart (GET /api/notifications)...');
  const notifRes = await api('/api/notifications', { role: 'CITIZEN', userId: 'citizen-101' });
  assert(notifRes.status === 200, `Failed to retrieve notifications: ${notifRes.status}`);
  assert(notifRes.data.count >= 1, 'No notifications found after restart');
  console.log(`  ✔ Notifications: ${notifRes.data.count} notifications available for citizen after restart.`);

  console.log('\n====================================================');
  console.log('RESTART PERSISTENCE VERIFICATION PASSED!');
  console.log('MySQL is the 100% authoritative persistent store.');
  console.log('====================================================\n');
}

async function main() {
  let targetProblemId = process.argv[2];
  if (!targetProblemId) {
    const [rows] = await pool.query(
      "SELECT id FROM problems WHERE id NOT IN ('101', '102', '103', '104', '105') ORDER BY created_at DESC LIMIT 1;"
    );
    if (rows && rows.length > 0) {
      targetProblemId = rows[0].id;
    } else {
      targetProblemId = '101';
    }
  }

  await verifyAfterRestart(targetProblemId);
  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Restart verification failed:', err);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
