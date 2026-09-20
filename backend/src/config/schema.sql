-- ============================================================
-- FUSIONX CivicResolve AI Platform — MySQL Schema (MYSQL-2)
-- Database: fusionx
-- Character Set: utf8mb4, Collation: utf8mb4_unicode_ci
-- ============================================================

-- 1. USERS (Roles: CITIZEN, ADMIN, CIVIC_OFFICER)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  role ENUM('CITIZEN', 'ADMIN', 'CIVIC_OFFICER') NOT NULL,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(128) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  dashboard VARCHAR(128) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_users_role (role),
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 2. PROBLEMS (Core Civic Issue Aggregate Root)
CREATE TABLE IF NOT EXISTS problems (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(64) NOT NULL DEFAULT 'general',
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  image_path VARCHAR(512) DEFAULT NULL,
  voice_note_text TEXT DEFAULT NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'en',
  created_by VARCHAR(64) NOT NULL,
  internal_status VARCHAR(64) NOT NULL DEFAULT 'ADMIN_REVIEW',
  status VARCHAR(64) NOT NULL DEFAULT 'REPORTED',
  field_verification_flag VARCHAR(64) DEFAULT NULL,
  severity INT DEFAULT NULL,
  criticality VARCHAR(64) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_problems_status (status),
  INDEX idx_problems_internal_status (internal_status),
  INDEX idx_problems_created_by (created_by),
  INDEX idx_problems_created_at (created_at),
  INDEX idx_problems_geo (latitude, longitude),
  INDEX idx_problems_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PROBLEM_ASSIGNMENTS (1:1 Officer Task Allocation)
CREATE TABLE IF NOT EXISTS problem_assignments (
  problem_id VARCHAR(64) NOT NULL PRIMARY KEY,
  officer_id VARCHAR(64) NOT NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  assigned_by VARCHAR(64) NOT NULL,
  assignment_status VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED',
  remarks TEXT,
  INDEX idx_assignments_officer (officer_id),
  INDEX idx_assignments_assigned_at (assigned_at),
  CONSTRAINT fk_assignments_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PROBLEM_INSPECTIONS (1:1 On-Site Field Inspection)
CREATE TABLE IF NOT EXISTS problem_inspections (
  problem_id VARCHAR(64) NOT NULL PRIMARY KEY,
  location_verified BOOLEAN NOT NULL DEFAULT TRUE,
  issue_exists BOOLEAN NOT NULL DEFAULT TRUE,
  severity INT NOT NULL DEFAULT 3,
  current_condition TEXT,
  remarks TEXT,
  photos JSON DEFAULT NULL,
  videos JSON DEFAULT NULL,
  voice_note_text TEXT DEFAULT NULL,
  inspected_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  inspected_by VARCHAR(64) NOT NULL,
  INDEX idx_inspections_officer (inspected_by),
  INDEX idx_inspections_inspected_at (inspected_at),
  CONSTRAINT fk_inspections_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. PROBLEM_WORK_REPORTS (1:1 Resource & Work Estimation)
CREATE TABLE IF NOT EXISTS problem_work_reports (
  problem_id VARCHAR(64) NOT NULL PRIMARY KEY,
  workers_required INT NOT NULL DEFAULT 1,
  estimated_hours DECIMAL(6, 2) NOT NULL DEFAULT 4.00,
  materials JSON DEFAULT NULL,
  remarks TEXT,
  urgency_notes TEXT,
  additional_evidence JSON DEFAULT NULL,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  submitted_by VARCHAR(64) NOT NULL,
  INDEX idx_work_reports_submitted_by (submitted_by),
  INDEX idx_work_reports_submitted_at (submitted_at),
  CONSTRAINT fk_work_reports_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PROBLEM_WORK_ORDERS (1:1 Worker & Material Allocation)
CREATE TABLE IF NOT EXISTS problem_work_orders (
  problem_id VARCHAR(64) NOT NULL PRIMARY KEY,
  workers_allocated INT NOT NULL DEFAULT 1,
  planned_start DATETIME(3) NULL,
  planned_completion DATETIME(3) NULL,
  materials JSON DEFAULT NULL,
  instructions TEXT,
  allocated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  allocated_by VARCHAR(64) NOT NULL,
  INDEX idx_work_orders_allocated_by (allocated_by),
  INDEX idx_work_orders_allocated_at (allocated_at),
  CONSTRAINT fk_work_orders_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PROBLEM_COMPLETIONS (1:1 Completion Verification with After-Photos)
CREATE TABLE IF NOT EXISTS problem_completions (
  problem_id VARCHAR(64) NOT NULL PRIMARY KEY,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  remarks TEXT,
  photos JSON DEFAULT NULL,
  videos JSON DEFAULT NULL,
  verified_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  verified_by VARCHAR(64) NOT NULL,
  INDEX idx_completions_verified_by (verified_by),
  INDEX idx_completions_verified_at (verified_at),
  CONSTRAINT fk_completions_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PROBLEM_AI_ANALYSIS (1:1 Multimodal Evidence & Priority Cache)
CREATE TABLE IF NOT EXISTS problem_ai_analysis (
  problem_id VARCHAR(64) NOT NULL PRIMARY KEY,
  evidence_strength INT DEFAULT 50,
  evidence_interpretation VARCHAR(255) DEFAULT NULL,
  evidence_explanation JSON DEFAULT NULL,
  priority_score INT DEFAULT 35,
  priority_level VARCHAR(32) DEFAULT 'LOW',
  signals JSON DEFAULT NULL,
  weights JSON DEFAULT NULL,
  priority_explanation JSON DEFAULT NULL,
  source VARCHAR(64) DEFAULT 'local-engine',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_ai_priority_score (priority_score),
  INDEX idx_ai_priority_level (priority_level),
  CONSTRAINT fk_ai_analysis_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PROBLEM_SUPPORTS (1:N Citizen Endorsements / "I'm Affected")
CREATE TABLE IF NOT EXISTS problem_supports (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  problem_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  explanation TEXT,
  latitude DECIMAL(10, 7) DEFAULT NULL,
  longitude DECIMAL(10, 7) DEFAULT NULL,
  image_path VARCHAR(512) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_support_problem_user (problem_id, user_id),
  INDEX idx_supports_problem_id (problem_id),
  INDEX idx_supports_user_id (user_id),
  INDEX idx_supports_created_at (created_at),
  CONSTRAINT fk_supports_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. RESOLUTION_FEEDBACK (1:N Post-Resolution Citizen Feedback)
CREATE TABLE IF NOT EXISTS resolution_feedback (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  problem_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  resolved BOOLEAN NOT NULL,
  comment TEXT,
  photo VARCHAR(512) DEFAULT NULL,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_feedback_problem_id (problem_id),
  INDEX idx_feedback_user_id (user_id),
  INDEX idx_feedback_submitted_at (submitted_at),
  CONSTRAINT fk_feedback_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. AUDIT_EVENTS (1:N Immutable Lifecycle Audit Trail)
CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  problem_id VARCHAR(64) NOT NULL,
  from_status VARCHAR(64) NOT NULL,
  to_status VARCHAR(64) NOT NULL,
  public_status VARCHAR(64) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  remarks TEXT,
  metadata JSON DEFAULT NULL,
  timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_audit_problem_id (problem_id),
  INDEX idx_audit_actor (actor_id),
  INDEX idx_audit_role (actor_role),
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_status (to_status),
  CONSTRAINT fk_audit_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. NOTIFICATIONS (Role & User In-App Notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  recipient_role VARCHAR(32) DEFAULT NULL,
  recipient_id VARCHAR(64) DEFAULT NULL,
  problem_id VARCHAR(64) DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'INFO',
  metadata JSON DEFAULT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_notif_role (recipient_role),
  INDEX idx_notif_recipient (recipient_id),
  INDEX idx_notif_is_read (is_read),
  INDEX idx_notif_created_at (created_at),
  INDEX idx_notif_problem_id (problem_id),
  CONSTRAINT fk_notif_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
