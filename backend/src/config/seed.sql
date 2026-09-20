-- ============================================================
-- FUSIONX CivicResolve AI Platform — Seed Data Migration (MYSQL-3A)
-- Database: fusionx
-- Idempotent: Uses INSERT ... ON DUPLICATE KEY UPDATE
-- ============================================================

-- ------------------------------------------------------------
-- 1. USERS
-- DEMO_USERS + test users required by Phase 5 test suites and baseline problems
-- ------------------------------------------------------------
INSERT INTO users (id, role, name, email, dashboard, created_at)
VALUES
  ('citizen-101', 'CITIZEN', 'Citizen Demo', 'citizen@civicresolve.ai', '/citizen-dashboard.html', NOW(3)),
  ('admin-1', 'ADMIN', 'Admin Demo', 'admin@civicresolve.ai', '/admin-dashboard.html', NOW(3)),
  ('OFF-001', 'CIVIC_OFFICER', 'Officer Arun', 'officer@civicresolve.ai', '/officer-dashboard.html', NOW(3)),
  ('admin-master', 'ADMIN', 'Admin Master', 'admin.master@civicresolve.ai', '/admin-dashboard.html', NOW(3)),
  ('OFF-002', 'CIVIC_OFFICER', 'Officer Priya', 'officer2@civicresolve.ai', '/officer-dashboard.html', NOW(3)),
  ('citizen-alpha', 'CITIZEN', 'Citizen Alpha', 'citizen.alpha@civicresolve.ai', '/citizen-dashboard.html', NOW(3)),
  ('citizen-anonymous', 'CITIZEN', 'Anonymous Citizen', 'anonymous@civicresolve.ai', '/citizen-dashboard.html', NOW(3)),
  ('citizen_2', 'CITIZEN', 'Citizen Two', 'citizen2@civicresolve.ai', '/citizen-dashboard.html', NOW(3)),
  ('citizen_3', 'CITIZEN', 'Citizen Three', 'citizen3@civicresolve.ai', '/citizen-dashboard.html', NOW(3)),
  ('citizen_4', 'CITIZEN', 'Citizen Four', 'citizen4@civicresolve.ai', '/citizen-dashboard.html', NOW(3)),
  ('citizen_5', 'CITIZEN', 'Citizen Five', 'citizen5@civicresolve.ai', '/citizen-dashboard.html', NOW(3)),
  ('citizen_6', 'CITIZEN', 'Citizen Six', 'citizen6@civicresolve.ai', '/citizen-dashboard.html', NOW(3)),
  ('citizen_8', 'CITIZEN', 'Citizen Eight', 'citizen8@civicresolve.ai', '/citizen-dashboard.html', NOW(3))
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  name = VALUES(name),
  email = VALUES(email),
  dashboard = VALUES(dashboard);

-- ------------------------------------------------------------
-- 2. BASELINE PROBLEMS (#101 - #105)
-- Identical to initialProblems in store.service.js
-- ------------------------------------------------------------
INSERT INTO problems (
  id, title, description, category, latitude, longitude, image_path, voice_note_text,
  language, created_by, internal_status, status, field_verification_flag, severity, criticality,
  created_at, updated_at
) VALUES
  (
    '101',
    'Main Road Pothole near School Zone',
    'Large pothole causing vehicle damage; school-zone safety risk.',
    'road',
    13.0852,
    80.2731,
    NULL,
    NULL,
    'en',
    'citizen-101',
    'OFFICER_ASSIGNED',
    'ASSIGNED',
    NULL,
    3,
    'School Zone',
    DATE_SUB(NOW(3), INTERVAL 2 HOUR),
    DATE_SUB(NOW(3), INTERVAL 1 HOUR)
  ),
  (
    '102',
    'Drainage blockage — School Lane',
    'Open drain overflow after rains; foul smell and mosquito breeding.',
    'drainage',
    13.0801,
    80.2684,
    NULL,
    NULL,
    'en',
    'citizen_3',
    'ADMIN_REVIEW',
    'REPORTED',
    NULL,
    NULL,
    'Health Risk',
    DATE_SUB(NOW(3), INTERVAL 4 HOUR),
    DATE_SUB(NOW(3), INTERVAL 4 HOUR)
  ),
  (
    '103',
    'Streetlight outage — Park Avenue',
    'Pole #44 dark since Monday evening.',
    'streetlight',
    13.0788,
    80.2755,
    NULL,
    NULL,
    'en',
    'citizen_4',
    'ADMIN_REVIEW',
    'REPORTED',
    NULL,
    NULL,
    'Night Safety',
    DATE_SUB(NOW(3), INTERVAL 6 HOUR),
    DATE_SUB(NOW(3), INTERVAL 6 HOUR)
  ),
  (
    '104',
    'Garbage overflow — Market Road',
    'Community bin overflowing for 3 days near vegetable stalls.',
    'garbage',
    13.0864,
    80.2692,
    NULL,
    NULL,
    'en',
    'citizen_6',
    'ADMIN_REVIEW',
    'REPORTED',
    NULL,
    NULL,
    'Public Hygiene',
    DATE_SUB(NOW(3), INTERVAL 3 HOUR),
    DATE_SUB(NOW(3), INTERVAL 3 HOUR)
  ),
  (
    '105',
    'Pothole patch completed — Ring Road',
    'Earlier pothole complaint; work finished — awaiting citizen verification.',
    'road',
    13.0835,
    80.2660,
    NULL,
    NULL,
    'en',
    'citizen-101',
    'OFFICER_VERIFIED',
    'COMPLETED',
    NULL,
    3,
    'Standard Zone',
    DATE_SUB(NOW(3), INTERVAL 48 HOUR),
    DATE_SUB(NOW(3), INTERVAL 2 HOUR)
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  category = VALUES(category),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  internal_status = VALUES(internal_status),
  status = VALUES(status),
  severity = VALUES(severity),
  criticality = VALUES(criticality);

-- ------------------------------------------------------------
-- 3. PROBLEM ASSIGNMENTS
-- For problems 101 and 105
-- ------------------------------------------------------------
INSERT INTO problem_assignments (
  problem_id, officer_id, assigned_at, assigned_by, assignment_status, remarks
) VALUES
  (
    '101',
    'OFF-001',
    DATE_SUB(NOW(3), INTERVAL 1 HOUR),
    'admin-1',
    'ASSIGNED',
    'P1 school-zone pothole — inspect today'
  ),
  (
    '105',
    'OFF-001',
    DATE_SUB(NOW(3), INTERVAL 24 HOUR),
    'admin-1',
    'ASSIGNED',
    'Completed — verify'
  )
ON DUPLICATE KEY UPDATE
  officer_id = VALUES(officer_id),
  assigned_at = VALUES(assigned_at),
  assigned_by = VALUES(assigned_by),
  assignment_status = VALUES(assignment_status),
  remarks = VALUES(remarks);

-- ------------------------------------------------------------
-- 4. PROBLEM INSPECTIONS
-- For problem 105
-- ------------------------------------------------------------
INSERT INTO problem_inspections (
  problem_id, location_verified, issue_exists, severity, current_condition,
  remarks, photos, videos, voice_note_text, inspected_at, inspected_by
) VALUES
  (
    '105',
    TRUE,
    TRUE,
    3,
    'Repaired and asphalt compacted',
    'Patched and barricades removed',
    '[]',
    '[]',
    NULL,
    DATE_SUB(NOW(3), INTERVAL 12 HOUR),
    'OFF-001'
  )
ON DUPLICATE KEY UPDATE
  location_verified = VALUES(location_verified),
  issue_exists = VALUES(issue_exists),
  severity = VALUES(severity),
  current_condition = VALUES(current_condition),
  remarks = VALUES(remarks),
  inspected_at = VALUES(inspected_at),
  inspected_by = VALUES(inspected_by);

-- ------------------------------------------------------------
-- 5. PROBLEM COMPLETIONS
-- For problem 105
-- ------------------------------------------------------------
INSERT INTO problem_completions (
  problem_id, completed, remarks, photos, videos, verified_at, verified_by
) VALUES
  (
    '105',
    TRUE,
    'Asphalt patch complete',
    '[]',
    '[]',
    DATE_SUB(NOW(3), INTERVAL 2 HOUR),
    'OFF-001'
  )
ON DUPLICATE KEY UPDATE
  completed = VALUES(completed),
  remarks = VALUES(remarks),
  verified_at = VALUES(verified_at),
  verified_by = VALUES(verified_by);

-- ------------------------------------------------------------
-- 6. PROBLEM AI ANALYSIS (Evidence & Priority Scores)
-- ------------------------------------------------------------
INSERT INTO problem_ai_analysis (
  problem_id, evidence_strength, evidence_interpretation, evidence_explanation,
  priority_score, priority_level, signals, weights, priority_explanation, source, updated_at
) VALUES
  (
    '101',
    78,
    'Strong multimodal evidence',
    '["Multimodal evidence analysis validated report description."]',
    86,
    'HIGH',
    '{"severity": 0.6, "evidence": 0.78, "community": 0.1, "criticality": 0.3, "duration": 0.05, "growth": 0.0}',
    '{"severity": 0.3, "evidence": 0.2, "community": 0.2, "criticality": 0.15, "duration": 0.1, "growth": 0.05}',
    '["School zone", "Multiple citizen supports", "Safety risk"]',
    'local-engine',
    DATE_SUB(NOW(3), INTERVAL 1 HOUR)
  ),
  (
    '102',
    65,
    'Moderate evidence',
    '["Open drain blockage reported with environmental impact."]',
    74,
    'HIGH',
    '{"severity": 0.6, "evidence": 0.65, "community": 0.05, "criticality": 0.25, "duration": 0.1, "growth": 0.0}',
    '{"severity": 0.3, "evidence": 0.2, "community": 0.2, "criticality": 0.15, "duration": 0.1, "growth": 0.05}',
    '["Health risk", "Clustered reports"]',
    'local-engine',
    DATE_SUB(NOW(3), INTERVAL 4 HOUR)
  ),
  (
    '103',
    50,
    'Baseline evidence',
    '["Single citizen report for outage."]',
    42,
    'MEDIUM',
    '{"severity": 0.4, "evidence": 0.5, "community": 0.0, "criticality": 0.15, "duration": 0.1, "growth": 0.0}',
    '{"severity": 0.3, "evidence": 0.2, "community": 0.2, "criticality": 0.15, "duration": 0.1, "growth": 0.05}',
    '["Night safety"]',
    'local-engine',
    DATE_SUB(NOW(3), INTERVAL 6 HOUR)
  ),
  (
    '104',
    50,
    'Baseline evidence',
    '["Community bin overflow report."]',
    55,
    'MEDIUM',
    '{"severity": 0.5, "evidence": 0.5, "community": 0.0, "criticality": 0.2, "duration": 0.1, "growth": 0.0}',
    '{"severity": 0.3, "evidence": 0.2, "community": 0.2, "criticality": 0.15, "duration": 0.1, "growth": 0.05}',
    '["Public hygiene"]',
    'local-engine',
    DATE_SUB(NOW(3), INTERVAL 3 HOUR)
  ),
  (
    '105',
    50,
    'Verified completed',
    '["Patch completed and verified."]',
    40,
    'LOW',
    '{"severity": 0.4, "evidence": 0.5, "community": 0.0, "criticality": 0.15, "duration": 0.2, "growth": 0.0}',
    '{"severity": 0.3, "evidence": 0.2, "community": 0.2, "criticality": 0.15, "duration": 0.1, "growth": 0.05}',
    '["Low remaining risk post repair"]',
    'local-engine',
    DATE_SUB(NOW(3), INTERVAL 2 HOUR)
  )
ON DUPLICATE KEY UPDATE
  evidence_strength = VALUES(evidence_strength),
  evidence_interpretation = VALUES(evidence_interpretation),
  evidence_explanation = VALUES(evidence_explanation),
  priority_score = VALUES(priority_score),
  priority_level = VALUES(priority_level),
  signals = VALUES(signals),
  weights = VALUES(weights),
  priority_explanation = VALUES(priority_explanation),
  source = VALUES(source),
  updated_at = VALUES(updated_at);

-- ------------------------------------------------------------
-- 7. PROBLEM SUPPORTS
-- Baseline endorsements for problems 101 and 102
-- ------------------------------------------------------------
INSERT INTO problem_supports (
  id, problem_id, user_id, explanation, latitude, longitude, image_path, created_at
) VALUES
  (
    'sup-1',
    '101',
    'citizen_2',
    'Affects school commute',
    NULL,
    NULL,
    NULL,
    DATE_SUB(NOW(3), INTERVAL 1 HOUR)
  ),
  (
    'sup-2',
    '101',
    'citizen_5',
    'Two-wheeler hazard',
    NULL,
    NULL,
    NULL,
    DATE_SUB(NOW(3), INTERVAL 1 HOUR)
  ),
  (
    'sup-3',
    '102',
    'citizen_8',
    'Water entering compound',
    NULL,
    NULL,
    NULL,
    DATE_SUB(NOW(3), INTERVAL 3 HOUR)
  )
ON DUPLICATE KEY UPDATE
  explanation = VALUES(explanation);

-- ------------------------------------------------------------
-- 8. INITIAL AUDIT EVENTS
-- Historical event trail for baseline seed problems
-- ------------------------------------------------------------
INSERT INTO audit_events (
  id, problem_id, from_status, to_status, public_status, actor_id, actor_role, remarks, metadata, timestamp
) VALUES
  (
    'evt-init-101-1',
    '101',
    'REPORTED',
    'ADMIN_REVIEW',
    'REPORTED',
    'citizen-101',
    'CITIZEN',
    'Initial complaint registered via citizen portal.',
    '{}',
    DATE_SUB(NOW(3), INTERVAL 2 HOUR)
  ),
  (
    'evt-init-101-2',
    '101',
    'ADMIN_REVIEW',
    'OFFICER_ASSIGNED',
    'ASSIGNED',
    'admin-1',
    'ADMIN',
    'Assigned to Civic Officer OFF-001.',
    '{"officer_id": "OFF-001"}',
    DATE_SUB(NOW(3), INTERVAL 1 HOUR)
  ),
  (
    'evt-init-105-1',
    '105',
    'WORK_COMPLETED',
    'OFFICER_VERIFIED',
    'COMPLETED',
    'OFF-001',
    'CIVIC_OFFICER',
    'Field officer verified completion on site.',
    '{}',
    DATE_SUB(NOW(3), INTERVAL 2 HOUR)
  )
ON DUPLICATE KEY UPDATE
  remarks = VALUES(remarks);
