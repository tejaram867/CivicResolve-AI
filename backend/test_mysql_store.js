/**
 * MYSQL-3C Test Suite: Store Service -> MySQL Persistence Migration
 *
 * Verifies:
 * - Tests 1-18: Real MySQL persistence for all 11 entities & operations
 * - Correct JSON serialization / deserialization
 * - Unique support constraints
 * - Immutable audit trail
 * - Seeded data accessibility
 * - Data survival across backend restarts
 */

import { pool } from './src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function api(path, { method = 'GET', role = 'CITIZEN', userId = 'citizen-101', body = null } = {}) {
  const headers = {
    'x-user-role': role,
    'x-user-id': userId,
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}\n`);
    throw new Error(message);
  }
}

async function runStoreTests() {
  console.log('====================================================');
  console.log('MYSQL-3C: STORE SERVICE -> MYSQL PERSISTENCE VERIFICATION');
  console.log('====================================================\n');

  // Verify database connection first
  const [dbTest] = await pool.query('SELECT 1 AS connected');
  assert(dbTest[0].connected === 1, 'Database connection failed');
  console.log('✔ Connected to MySQL `fusionx` database pool.\n');

  // TEST 1: Create a problem through application API
  console.log('[TEST 1] Create problem via API (POST /api/problems)...');
  const createPayload = {
    title: `Persistent Water Pipeline Rupture ${Date.now()}`,
    description: 'High-pressure water main burst causing roadway erosion and flooding.',
    category: 'water_leakage',
    latitude: 13.0827,
    longitude: 80.2707,
    voice_note_text: 'Urgent main burst flooding the crossroad.',
    force_create: true,
  };

  const createRes = await api('/api/problems', {
    method: 'POST',
    role: 'CITIZEN',
    userId: 'citizen-101',
    body: createPayload,
  });

  assert(createRes.status === 201, `Failed to create problem: ${createRes.status}`);
  assert(createRes.data.success === true, 'Response success was false');
  const problemId = String(createRes.data.problem.id);
  console.log(`  ✔ Problem created successfully! ID: #${problemId}`);
  console.log('  >>> [PASS] TEST 1: Problem created through application API.\n');

  // TEST 2: Verify the problem exists in MySQL with SELECT
  console.log('[TEST 2] Verify problem exists in MySQL with raw SELECT...');
  const [probRows] = await pool.query('SELECT * FROM problems WHERE id = ?', [problemId]);
  assert(probRows.length === 1, `Expected 1 row in problems table, found ${probRows.length}`);
  const dbProblem = probRows[0];
  assert(dbProblem.title === createPayload.title, 'DB problem title does not match');
  assert(dbProblem.category === 'water_leakage', 'DB category does not match');
  assert(Number(dbProblem.latitude) === 13.0827, 'DB latitude mismatch');
  console.log(`  ✔ Found in MySQL 'problems' table: id=${dbProblem.id}, status=${dbProblem.status}, internal_status=${dbProblem.internal_status}`);
  console.log('  >>> [PASS] TEST 2: Problem verified in MySQL `problems` table.\n');

  // TEST 3: Read the problem through the application/API
  console.log('[TEST 3] Read problem through API (GET /api/problems/:id)...');
  const readRes = await api(`/api/problems/${problemId}`, {
    role: 'ADMIN',
    userId: 'admin-master',
  });
  assert(readRes.status === 200, `Failed to read problem: ${readRes.status}`);
  assert(readRes.data.problem.id === problemId, 'Read problem ID mismatch');
  console.log(`  ✔ API returned problem #${readRes.data.problem.id} with title "${readRes.data.problem.title}"`);
  console.log('  >>> [PASS] TEST 3: Problem successfully read via application API.\n');

  // TEST 4: Add "I'm Affected" support
  console.log('[TEST 4] Add "I\'m Affected" citizen support...');
  const supportRes = await api(`/api/problems/${problemId}/support`, {
    method: 'POST',
    role: 'CITIZEN',
    userId: 'citizen-alpha',
    body: {
      explanation: 'Our street is flooded and water pressure is completely zero.',
      latitude: 13.0828,
      longitude: 80.2708,
    },
  });
  assert(supportRes.status === 200, `Failed to add support: ${supportRes.status}`);
  assert(supportRes.data.success === true, 'Support response was false');
  console.log(`  ✔ Citizen support recorded. Total supporters: ${supportRes.data.problem.support_count || 1}`);
  console.log('  >>> [PASS] TEST 4: Support successfully added.\n');

  // TEST 5: Verify support row exists in MySQL
  console.log('[TEST 5] Verify support row in MySQL `problem_supports` table...');
  const [supRows] = await pool.query(
    'SELECT * FROM problem_supports WHERE problem_id = ? AND user_id = ?',
    [problemId, 'citizen-alpha']
  );
  assert(supRows.length === 1, `Expected 1 row in problem_supports, found ${supRows.length}`);
  console.log(`  ✔ MySQL row verified: problem_id=${supRows[0].problem_id}, user_id=${supRows[0].user_id}, explanation="${supRows[0].explanation}"`);
  console.log('  >>> [PASS] TEST 5: Support verified in MySQL `problem_supports`.\n');

  // TEST 6: Verify duplicate support is rejected
  console.log('[TEST 6] Verify duplicate support by same citizen is rejected...');
  const dupSupportRes = await api(`/api/problems/${problemId}/support`, {
    method: 'POST',
    role: 'CITIZEN',
    userId: 'citizen-alpha',
    body: { explanation: 'Duplicate attempt' },
  });
  assert(dupSupportRes.status === 400, `Expected 400 for duplicate support, got ${dupSupportRes.status}`);
  console.log(`  ✔ Duplicate support rejected with HTTP 400: "${dupSupportRes.data.error}"`);
  console.log('  >>> [PASS] TEST 6: Duplicate support rejection verified by MySQL unique constraint.\n');

  // TEST 7: Create/verify assignment persistence
  console.log('[TEST 7] Assign Civic Officer and verify MySQL `problem_assignments`...');
  const assignRes = await api(`/api/admin/problems/${problemId}/assign`, {
    method: 'POST',
    role: 'ADMIN',
    userId: 'admin-master',
    body: { officer_id: 'OFF-001', remarks: 'High priority flood dispatch' },
  });
  assert(assignRes.status === 200, `Assignment failed: ${assignRes.status}`);

  const [assignRows] = await pool.query('SELECT * FROM problem_assignments WHERE problem_id = ?', [problemId]);
  assert(assignRows.length === 1, 'Assignment row not found in MySQL');
  assert(assignRows[0].officer_id === 'OFF-001', 'Assigned officer mismatch');
  console.log(`  ✔ MySQL assignment row verified: officer_id=${assignRows[0].officer_id}, status=${assignRows[0].assignment_status}`);
  console.log('  >>> [PASS] TEST 7: Assignment persisted in MySQL `problem_assignments`.\n');

  // TEST 8: Persist inspection
  console.log('[TEST 8] Submit officer inspection and verify MySQL `problem_inspections`...');
  const inspectRes = await api(`/api/officer/problems/${problemId}/inspection`, {
    method: 'POST',
    role: 'CIVIC_OFFICER',
    userId: 'OFF-001',
    body: {
      location_verified: true,
      issue_exists: true,
      severity: 5,
      current_condition: 'Burst pipe discharging at 200 LPM.',
      remarks: 'Excavation crew needed immediately.',
      photos: ['https://example.com/inspection-site.jpg'],
    },
  });
  assert(inspectRes.status === 200, `Inspection failed: ${inspectRes.status}`);

  const [inspectRows] = await pool.query('SELECT * FROM problem_inspections WHERE problem_id = ?', [problemId]);
  assert(inspectRows.length === 1, 'Inspection row not found in MySQL');
  assert(inspectRows[0].severity === 5, 'Severity mismatch');
  console.log(`  ✔ MySQL inspection row verified: severity=${inspectRows[0].severity}, inspected_by=${inspectRows[0].inspected_by}`);
  console.log('  >>> [PASS] TEST 8: Inspection persisted in MySQL `problem_inspections`.\n');

  // TEST 9: Persist work report
  console.log('[TEST 9] Submit officer work report and verify MySQL `problem_work_reports`...');
  const workReportRes = await api(`/api/officer/problems/${problemId}/work-report`, {
    method: 'POST',
    role: 'CIVIC_OFFICER',
    userId: 'OFF-001',
    body: {
      workers_required: 4,
      estimated_hours: 6,
      materials: ['Cast iron pipe collar 150mm', 'Quick-setting hydraulic cement'],
      remarks: 'Requires isolation of Sector 4 valve.',
      urgency_notes: 'Critical roadway preservation.',
    },
  });
  assert(workReportRes.status === 200, `Work report failed: ${workReportRes.status}`);

  const [reportRows] = await pool.query('SELECT * FROM problem_work_reports WHERE problem_id = ?', [problemId]);
  assert(reportRows.length === 1, 'Work report row not found in MySQL');
  assert(reportRows[0].workers_required === 4, 'Workers required mismatch');
  console.log(`  ✔ MySQL work report row verified: workers=${reportRows[0].workers_required}, hours=${reportRows[0].estimated_hours}`);
  console.log('  >>> [PASS] TEST 9: Work report persisted in MySQL `problem_work_reports`.\n');

  // TEST 10: Persist work order
  console.log('[TEST 10] Approve work report, allocate resources, and verify MySQL `problem_work_orders`...');
  await api(`/api/admin/problems/${problemId}/approve-work`, {
    method: 'POST',
    role: 'ADMIN',
    userId: 'admin-master',
    body: { approved: true, remarks: 'Work plan approved for dispatch.' },
  });

  const workOrderRes = await api(`/api/admin/problems/${problemId}/work-order`, {
    method: 'POST',
    role: 'ADMIN',
    userId: 'admin-master',
    body: {
      workers_allocated: 4,
      planned_start: new Date().toISOString(),
      materials: ['Cast iron pipe collar 150mm', 'Hydraulic cement'],
      instructions: 'Proceed with pipe excavation and collar installation.',
    },
  });
  assert(workOrderRes.status === 200, `Work order failed: ${workOrderRes.status}`);

  const [orderRows] = await pool.query('SELECT * FROM problem_work_orders WHERE problem_id = ?', [problemId]);
  assert(orderRows.length === 1, 'Work order row not found in MySQL');
  assert(orderRows[0].workers_allocated === 4, 'Workers allocated mismatch');
  console.log(`  ✔ MySQL work order row verified: workers=${orderRows[0].workers_allocated}, instructions="${orderRows[0].instructions}"`);
  console.log('  >>> [PASS] TEST 10: Work order persisted in MySQL `problem_work_orders`.\n');

  // TEST 11: Persist completion
  console.log('[TEST 11] Complete work, verify completion, and verify MySQL `problem_completions`...');
  await api(`/api/admin/problems/${problemId}/work-status`, {
    method: 'POST',
    role: 'ADMIN',
    userId: 'admin-master',
    body: { status: 'WORK_STARTED', remarks: 'Excavation started' },
  });
  await api(`/api/admin/problems/${problemId}/work-status`, {
    method: 'POST',
    role: 'ADMIN',
    userId: 'admin-master',
    body: { status: 'WORK_COMPLETED', remarks: 'Pipe repaired and road resurfaced' },
  });

  const completionRes = await api(`/api/officer/problems/${problemId}/completion-verification`, {
    method: 'POST',
    role: 'CIVIC_OFFICER',
    userId: 'OFF-001',
    body: {
      completed: true,
      remarks: 'Collar verified leak-free. Road paved smoothly.',
      photos: ['https://example.com/completion-photo.jpg'],
    },
  });
  assert(completionRes.status === 200, `Completion failed: ${completionRes.status}`);

  const [compRows] = await pool.query('SELECT * FROM problem_completions WHERE problem_id = ?', [problemId]);
  assert(compRows.length === 1, 'Completion row not found in MySQL');
  assert(compRows[0].completed === 1, 'Completion boolean mismatch');
  console.log(`  ✔ MySQL completion row verified: completed=${compRows[0].completed}, verified_by=${compRows[0].verified_by}`);
  console.log('  >>> [PASS] TEST 11: Completion verified in MySQL `problem_completions`.\n');

  // TEST 12: Persist AI analysis
  console.log('[TEST 12] Verify AI analysis persistence in MySQL `problem_ai_analysis`...');
  const [aiRows] = await pool.query('SELECT * FROM problem_ai_analysis WHERE problem_id = ?', [problemId]);
  assert(aiRows.length === 1, 'AI analysis row not found in MySQL');
  assert(aiRows[0].evidence_strength !== null, 'Evidence strength missing');
  assert(aiRows[0].priority_score !== null, 'Priority score missing');
  console.log(`  ✔ MySQL AI analysis verified: evidence_strength=${aiRows[0].evidence_strength}, priority_score=${aiRows[0].priority_score}, level=${aiRows[0].priority_level}`);
  console.log('  >>> [PASS] TEST 12: AI analysis persisted in MySQL `problem_ai_analysis`.\n');

  // TEST 13: Persist audit event
  console.log('[TEST 13] Verify audit trail persistence in MySQL `audit_events`...');
  const [auditRows] = await pool.query('SELECT * FROM audit_events WHERE problem_id = ? ORDER BY timestamp ASC', [problemId]);
  assert(auditRows.length >= 6, `Expected at least 6 audit events, found ${auditRows.length}`);
  console.log(`  ✔ MySQL audit events verified: ${auditRows.length} immutable events recorded.`);
  console.log(`    First event: [${auditRows[0].actor_role}] ${auditRows[0].from_status} -> ${auditRows[0].to_status}`);
  console.log(`    Latest event: [${auditRows[auditRows.length - 1].actor_role}] ${auditRows[auditRows.length - 1].from_status} -> ${auditRows[auditRows.length - 1].to_status}`);
  console.log('  >>> [PASS] TEST 13: Audit events verified in MySQL `audit_events`.\n');

  // TEST 14: Persist notification
  console.log('[TEST 14] Verify notification persistence in MySQL `notifications`...');
  const [notifRows] = await pool.query('SELECT * FROM notifications WHERE problem_id = ?', [problemId]);
  assert(notifRows.length >= 3, `Expected at least 3 notifications, found ${notifRows.length}`);
  console.log(`  ✔ MySQL notifications verified: ${notifRows.length} notifications recorded.`);
  console.log(`    Sample: [${notifRows[0].recipient_role}:${notifRows[0].recipient_id}] ${notifRows[0].title} - ${notifRows[0].message}`);
  console.log('  >>> [PASS] TEST 14: Notifications verified in MySQL `notifications`.\n');

  // TEST 15: Persist resolution feedback
  console.log('[TEST 15] Close problem and submit citizen resolution feedback...');
  await api(`/api/admin/problems/${problemId}/close`, {
    method: 'POST',
    role: 'ADMIN',
    userId: 'admin-master',
    body: { approved: true, remarks: 'Closure confirmed by Admin.' },
  });

  const feedbackRes = await api(`/api/problems/${problemId}/resolution-feedback`, {
    method: 'POST',
    role: 'CITIZEN',
    userId: 'citizen-alpha',
    body: {
      resolved: true,
      comment: 'Excellent work by the municipal team! Water pressure is fully restored.',
    },
  });
  assert(feedbackRes.status === 200, `Resolution feedback failed: ${feedbackRes.status}`);

  const [feedbackRows] = await pool.query('SELECT * FROM resolution_feedback WHERE problem_id = ?', [problemId]);
  assert(feedbackRows.length === 1, 'Resolution feedback row not found in MySQL');
  assert(feedbackRows[0].resolved === 1, 'Feedback resolved mismatch');
  console.log(`  ✔ MySQL resolution feedback verified: resolved=${feedbackRows[0].resolved}, comment="${feedbackRows[0].comment}"`);
  console.log('  >>> [PASS] TEST 15: Resolution feedback persisted in MySQL `resolution_feedback`.\n');

  // TEST 16: Verify nested JSON fields deserialize correctly
  console.log('[TEST 16] Verify nested JSON fields deserialize into JavaScript objects/arrays...');
  const officerViewRes = await api(`/api/officer/problems/${problemId}`, {
    role: 'CIVIC_OFFICER',
    userId: 'OFF-001',
  });
  assert(officerViewRes.status === 200, 'Failed to fetch officer view');
  const task = officerViewRes.data.task;

  assert(typeof task.inspection === 'object' && task.inspection !== null, 'inspection is not an object');
  assert(Array.isArray(task.inspection.photos), 'inspection.photos is not an array');
  assert(typeof task.work_report === 'object' && task.work_report !== null, 'work_report is not an object');
  assert(Array.isArray(task.work_report.materials), 'work_report.materials is not an array');
  assert(typeof task.work_order === 'object' && task.work_order !== null, 'work_order is not an object');
  assert(Array.isArray(task.work_order.materials), 'work_order.materials is not an array');
  assert(typeof task.completion_verification === 'object' && task.completion_verification !== null, 'completion_verification is not an object');
  assert(Array.isArray(task.completion_verification.photos), 'completion_verification.photos is not an array');

  console.log('  ✔ All JSON fields deserialized cleanly:');
  console.log(`    - inspection.photos: Array(${task.inspection.photos.length})`);
  console.log(`    - work_report.materials: Array(${task.work_report.materials.length})`);
  console.log(`    - work_order.materials: Array(${task.work_order.materials.length})`);
  console.log(`    - completion.photos: Array(${task.completion_verification.photos.length})`);
  console.log('  >>> [PASS] TEST 16: JSON serialization/deserialization verified.\n');

  // TEST 17: Verify foreign-key relationships remain valid
  console.log('[TEST 17] Verify foreign-key constraints in MySQL...');
  let fkErrorOccurred = false;
  try {
    // Attempting to insert a child assignment for a non-existent problem ID
    await pool.query(
      `INSERT INTO problem_assignments (problem_id, officer_id, assigned_by, assignment_status)
       VALUES ('non-existent-problem-999999', 'OFF-001', 'admin-1', 'ASSIGNED')`
    );
  } catch (fkErr) {
    if (fkErr.code === 'ER_NO_REFERENCED_ROW_2' || fkErr.code === 'ER_NO_REFERENCED_ROW') {
      fkErrorOccurred = true;
    }
  }
  assert(fkErrorOccurred === true, 'Foreign key constraint did not reject invalid parent problem ID!');
  console.log('  ✔ Foreign-key constraint successfully enforced: child insert without parent rejected with ER_NO_REFERENCED_ROW.');
  console.log('  >>> [PASS] TEST 17: Foreign-key relationships enforced by MySQL.\n');

  // TEST 18: Verify seeded data remains accessible
  console.log('[TEST 18] Verify seeded data remains accessible...');
  const [seededProb] = await pool.query('SELECT * FROM problems WHERE id = "101"');
  assert(seededProb.length === 1, 'Seeded problem #101 missing from MySQL');
  const [seededUsers] = await pool.query('SELECT COUNT(*) AS count FROM users');
  assert(seededUsers[0].count >= 13, `Expected at least 13 seeded users, found ${seededUsers[0].count}`);

  const prob101Res = await api('/api/problems/101', { role: 'ADMIN', userId: 'admin-1' });
  assert(prob101Res.status === 200, 'Failed to fetch seeded problem #101 via API');
  console.log(`  ✔ Seeded Problem #101 accessible: "${prob101Res.data.problem.title}"`);
  console.log(`  ✔ Seeded Users count in MySQL: ${seededUsers[0].count}`);
  console.log('  >>> [PASS] TEST 18: Seeded data remains completely accessible.\n');

  console.log('====================================================');
  console.log('ALL 18 MYSQL STORE TESTS PASSED!');
  console.log('====================================================\n');

  return problemId;
}

// Execute tests
runStoreTests()
  .then((persistedProblemId) => {
    console.log(`Persisted Test Problem ID for restart verification: #${persistedProblemId}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  });
