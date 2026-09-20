/**
 * FUSIONX Configurable Civic SLA Management Service
 */

export const SLA_RULES_DAYS = {
  CRITICAL: 1, // 24 hours
  HIGH: 3,     // 72 hours
  MEDIUM: 7,   // 7 days
  LOW: 14,     // 14 days
  'VERY LOW': 21,
};

/**
 * Calculate SLA deadlines and operational metrics for a specific problem.
 */
export function calculateProblemSla(problem) {
  const priorityLevel = (problem.priority_analysis?.priority_level || 'MEDIUM').toUpperCase();
  const allowedDays = SLA_RULES_DAYS[priorityLevel] ?? 7;

  const createdTime = problem.created_at ? new Date(problem.created_at).getTime() : Date.now();
  const dueTimestamp = createdTime + allowedDays * 86400000;
  const dueAt = new Date(dueTimestamp).toISOString();

  const isClosed = ['RESOLVED', 'ADMIN_CLOSED'].includes(
    String(problem.internal_status || problem.status).toUpperCase()
  );

  const now = Date.now();
  const diffMs = dueTimestamp - now;
  const isOverdue = !isClosed && diffMs < 0;

  const daysRemaining = isClosed
    ? 0
    : Math.round((diffMs / 86400000) * 10) / 10;

  const hoursRemaining = isClosed
    ? 0
    : Math.round(diffMs / 3600000);

  let resolutionDays = null;
  if (isClosed) {
    const closedTime = problem.updated_at ? new Date(problem.updated_at).getTime() : now;
    resolutionDays = Math.max(0, Math.round(((closedTime - createdTime) / 86400000) * 10) / 10);
  }

  return {
    priority_level: priorityLevel,
    allowed_sla_days: allowedDays,
    due_at: dueAt,
    is_overdue: isOverdue,
    days_remaining: daysRemaining,
    hours_remaining: hoursRemaining,
    is_approaching: !isClosed && !isOverdue && hoursRemaining <= 24 && hoursRemaining >= 0,
    due_today: !isClosed && hoursRemaining <= 24 && hoursRemaining >= 0,
    is_closed: isClosed,
    resolution_days: resolutionDays,
  };
}

/**
 * Generate aggregate SLA summary metrics for Admin Command Center.
 */
export function getSlaSummary(problems = []) {
  let totalActive = 0;
  let overdueCount = 0;
  let criticalOverdueCount = 0;
  let dueTodayCount = 0;
  let approachingCount = 0;
  let resolvedCount = 0;
  let totalResolutionDays = 0;

  const activeSlaList = [];

  for (const p of problems) {
    const sla = calculateProblemSla(p);

    if (sla.is_closed) {
      resolvedCount++;
      if (sla.resolution_days != null) {
        totalResolutionDays += sla.resolution_days;
      }
    } else {
      totalActive++;
      if (sla.is_overdue) {
        overdueCount++;
        if (sla.priority_level === 'CRITICAL') {
          criticalOverdueCount++;
        }
      }
      if (sla.due_today) {
        dueTodayCount++;
      }
      if (sla.is_approaching) {
        approachingCount++;
      }

      activeSlaList.push({
        problem_id: p.id,
        title: p.title,
        category: p.category,
        priority_level: sla.priority_level,
        assigned_officer: p.assignment?.officer_id || 'UNASSIGNED',
        due_at: sla.due_at,
        days_remaining: sla.days_remaining,
        hours_remaining: sla.hours_remaining,
        is_overdue: sla.is_overdue,
        is_approaching: sla.is_approaching,
      });
    }
  }

  const averageResolutionTimeDays = resolvedCount > 0
    ? Math.round((totalResolutionDays / resolvedCount) * 10) / 10
    : 0;

  return {
    total_active_problems: totalActive,
    overdue: overdueCount,
    critical_overdue: criticalOverdueCount,
    due_today: dueTodayCount,
    approaching_sla: approachingCount,
    average_resolution_time_days: averageResolutionTimeDays,
    sla_thresholds: SLA_RULES_DAYS,
    active_issues: activeSlaList.sort((a, b) => a.hours_remaining - b.hours_remaining),
  };
}
