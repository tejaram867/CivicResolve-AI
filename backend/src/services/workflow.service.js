/**
 * FUSIONX Civic Lifecycle Workflow State Machine & Audit Service
 */

export const INTERNAL_STATUS = {
  REPORTED: 'REPORTED',
  AI_ANALYZED: 'AI_ANALYZED',
  ADMIN_REVIEW: 'ADMIN_REVIEW',
  OFFICER_ASSIGNED: 'OFFICER_ASSIGNED',
  INSPECTION: 'INSPECTION',
  WORK_REPORT_SUBMITTED: 'WORK_REPORT_SUBMITTED',
  WORK_APPROVED: 'WORK_APPROVED',
  WORK_REVIEW_REQUIRED: 'WORK_REVIEW_REQUIRED',
  WORKER_ALLOCATED: 'WORKER_ALLOCATED',
  WORK_STARTED: 'WORK_STARTED',
  WORK_IN_PROGRESS: 'WORK_IN_PROGRESS',
  WORK_COMPLETED: 'WORK_COMPLETED',
  OFFICER_VERIFIED: 'OFFICER_VERIFIED',
  ADMIN_CLOSED: 'ADMIN_CLOSED',
  RESOLVED: 'RESOLVED',
  REOPENED: 'REOPENED',
};

export const PUBLIC_STATUS = {
  REPORTED: 'REPORTED',
  AI_ANALYZED: 'AI_ANALYZED',
  ASSIGNED: 'ASSIGNED',
  INSPECTION: 'INSPECTION',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ADMIN_VERIFIED: 'ADMIN_VERIFIED',
  RESOLVED: 'RESOLVED',
  REOPENED: 'REOPENED',
};

export const INTERNAL_TO_PUBLIC_STATUS = {
  [INTERNAL_STATUS.REPORTED]: PUBLIC_STATUS.REPORTED,
  [INTERNAL_STATUS.AI_ANALYZED]: PUBLIC_STATUS.AI_ANALYZED,
  [INTERNAL_STATUS.ADMIN_REVIEW]: PUBLIC_STATUS.REPORTED,
  [INTERNAL_STATUS.OFFICER_ASSIGNED]: PUBLIC_STATUS.ASSIGNED,
  [INTERNAL_STATUS.INSPECTION]: PUBLIC_STATUS.INSPECTION,
  [INTERNAL_STATUS.WORK_REPORT_SUBMITTED]: PUBLIC_STATUS.INSPECTION,
  [INTERNAL_STATUS.WORK_APPROVED]: PUBLIC_STATUS.ASSIGNED,
  [INTERNAL_STATUS.WORK_REVIEW_REQUIRED]: PUBLIC_STATUS.ASSIGNED,
  [INTERNAL_STATUS.WORKER_ALLOCATED]: PUBLIC_STATUS.IN_PROGRESS,
  [INTERNAL_STATUS.WORK_STARTED]: PUBLIC_STATUS.IN_PROGRESS,
  [INTERNAL_STATUS.WORK_IN_PROGRESS]: PUBLIC_STATUS.IN_PROGRESS,
  [INTERNAL_STATUS.WORK_COMPLETED]: PUBLIC_STATUS.COMPLETED,
  [INTERNAL_STATUS.OFFICER_VERIFIED]: PUBLIC_STATUS.COMPLETED,
  [INTERNAL_STATUS.ADMIN_CLOSED]: PUBLIC_STATUS.RESOLVED,
  [INTERNAL_STATUS.RESOLVED]: PUBLIC_STATUS.RESOLVED,
  [INTERNAL_STATUS.REOPENED]: PUBLIC_STATUS.REOPENED,
};

export const ALLOWED_TRANSITIONS = {
  [INTERNAL_STATUS.REPORTED]: [
    INTERNAL_STATUS.AI_ANALYZED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.AI_ANALYZED]: [
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.ADMIN_REVIEW]: [
    INTERNAL_STATUS.OFFICER_ASSIGNED,
    INTERNAL_STATUS.RESOLVED,
    INTERNAL_STATUS.REOPENED,
  ],
  [INTERNAL_STATUS.OFFICER_ASSIGNED]: [
    INTERNAL_STATUS.INSPECTION,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.INSPECTION]: [
    INTERNAL_STATUS.WORK_REPORT_SUBMITTED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.WORK_REPORT_SUBMITTED]: [
    INTERNAL_STATUS.WORK_APPROVED,
    INTERNAL_STATUS.WORK_REVIEW_REQUIRED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.WORK_REVIEW_REQUIRED]: [
    INTERNAL_STATUS.OFFICER_ASSIGNED,
    INTERNAL_STATUS.INSPECTION,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.WORK_APPROVED]: [
    INTERNAL_STATUS.WORKER_ALLOCATED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.WORKER_ALLOCATED]: [
    INTERNAL_STATUS.WORK_STARTED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.WORK_STARTED]: [
    INTERNAL_STATUS.WORK_IN_PROGRESS,
    INTERNAL_STATUS.WORK_COMPLETED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.WORK_IN_PROGRESS]: [
    INTERNAL_STATUS.WORK_COMPLETED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.WORK_COMPLETED]: [
    INTERNAL_STATUS.OFFICER_VERIFIED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.OFFICER_VERIFIED]: [
    INTERNAL_STATUS.ADMIN_CLOSED,
    INTERNAL_STATUS.RESOLVED,
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
  [INTERNAL_STATUS.ADMIN_CLOSED]: [
    INTERNAL_STATUS.RESOLVED,
    INTERNAL_STATUS.REOPENED,
  ],
  [INTERNAL_STATUS.RESOLVED]: [
    INTERNAL_STATUS.REOPENED,
  ],
  [INTERNAL_STATUS.REOPENED]: [
    INTERNAL_STATUS.ADMIN_REVIEW,
  ],
};

export function getPublicStatus(internalStatus) {
  return INTERNAL_TO_PUBLIC_STATUS[internalStatus] || PUBLIC_STATUS.REPORTED;
}

export function isValidTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

/**
 * Execute a validated workflow transition and log an immutable audit event.
 */
export async function transitionProblemStatus(problem, targetStatus, actor = {}, remarks = '', metadata = {}, store = null) {
  const currentInternal = problem.internal_status || INTERNAL_STATUS.REPORTED;

  if (!isValidTransition(currentInternal, targetStatus)) {
    const error = new Error(
      `Invalid workflow transition from '${currentInternal}' to '${targetStatus}'. Allowed next states: ${(ALLOWED_TRANSITIONS[currentInternal] || []).join(', ') || 'none'}.`
    );
    error.statusCode = 400;
    throw error;
  }

  problem.internal_status = targetStatus;
  problem.status = getPublicStatus(targetStatus);
  problem.updated_at = new Date().toISOString();

  const auditEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    problem_id: String(problem.id),
    from_status: currentInternal,
    to_status: targetStatus,
    public_status: problem.status,
    actor_id: actor.id || 'system',
    actor_role: actor.role || 'SYSTEM',
    remarks: remarks || '',
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  };

  if (store && typeof store.addAuditEvent === 'function') {
    await store.addAuditEvent(auditEvent);
  }
  if (store && typeof store.updateProblemStatus === 'function') {
    await store.updateProblemStatus(problem.id, targetStatus, problem.status);
  }

  return auditEvent;
}

/**
 * Sanitize problem record for public/citizen view:
 * Strips internal signals, priority scores, officer internal remarks, fraud flags, and internal SLA.
 */
export function sanitizeForCitizen(problem) {
  if (!problem) return null;

  const publicData = {
    id: problem.id,
    title: problem.title,
    description: problem.description,
    category: problem.category,
    latitude: problem.latitude,
    longitude: problem.longitude,
    image_path: problem.image_path || null,
    status: getPublicStatus(problem.internal_status || problem.status),
    support_count: Array.isArray(problem.supports) ? problem.supports.length : (problem.support_count || 0),
    created_at: problem.created_at,
    updated_at: problem.updated_at || problem.created_at,
    created_by: problem.created_by || 'anonymous_citizen',
  };

  if (problem.completion_verification?.completed) {
    publicData.completion_status = 'Physical work verified completed';
    publicData.completion_photos = problem.completion_verification.photos || [];
  }

  if (problem.resolution_feedback && problem.resolution_feedback.length > 0) {
    publicData.resolution_feedback = problem.resolution_feedback.map((f) => ({
      resolved: f.resolved,
      comment: f.comment,
      submitted_at: f.submitted_at,
    }));
  }

  return publicData;
}
