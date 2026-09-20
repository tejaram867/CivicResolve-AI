/**
 * FUSIONX Role-Based Authentication & Access Control Middleware
 * Roles: CITIZEN, ADMIN, CIVIC_OFFICER
 */

export const ROLES = {
  CITIZEN: 'CITIZEN',
  ADMIN: 'ADMIN',
  CIVIC_OFFICER: 'CIVIC_OFFICER',
};

/**
 * Extract authenticated user context from request headers.
 * Supports:
 * - x-user-role (CITIZEN | ADMIN | CIVIC_OFFICER)
 * - x-user-id (e.g. citizen-101, admin-1, OFF-001)
 * - Authorization: Bearer <role>:<user_id>
 * Gracefully defaults unauthenticated callers to CITIZEN role.
 */
export function authenticateUser(req, _res, next) {
  let role = ROLES.CITIZEN;
  let id = 'citizen-anonymous';

  // 1. Direct custom headers
  const roleHeader = req.headers['x-user-role'];
  const idHeader = req.headers['x-user-id'];

  if (roleHeader) {
    const normalizedRole = String(roleHeader).trim().toUpperCase();
    if (Object.values(ROLES).includes(normalizedRole)) {
      role = normalizedRole;
    }
  }

  if (idHeader) {
    id = String(idHeader).trim();
  }

  // 2. Bearer token fallback: Bearer <ROLE>:<ID>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token.includes(':')) {
      const [tokenRole, tokenId] = token.split(':');
      const normalizedRole = tokenRole.trim().toUpperCase();
      if (Object.values(ROLES).includes(normalizedRole)) {
        role = normalizedRole;
        id = tokenId.trim() || id;
      }
    }
  }

  req.user = {
    id,
    role,
  };

  next();
}

/**
 * Guard endpoint to require one of the specified roles.
 * Returns 403 Forbidden on role mismatch.
 */
export function requireRole(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    const currentRole = req.user?.role;
    if (!currentRole || !normalizedAllowed.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access denied for role '${currentRole || 'UNKNOWN'}'. Required: ${normalizedAllowed.join(' or ')}.`,
      });
    }
    next();
  };
}

/**
 * Ensure a Civic Officer caller is only operating on an issue assigned to them.
 */
export function verifyOfficerAssignment(problemGetter) {
  return async (req, res, next) => {
    const problemId = req.params.id;
    let problem = req.problem;
    if (!problem && typeof problemGetter === 'function') {
      try {
        problem = await problemGetter(problemId);
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    req.problem = problem;

    // Admins bypass officer-specific restriction
    if (req.user?.role === ROLES.ADMIN) {
      return next();
    }

    if (req.user?.role !== ROLES.CIVIC_OFFICER) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Access denied. Civic Officer role required.",
      });
    }

    const assignedOfficer = problem.assignment?.officer_id;
    if (!assignedOfficer || String(assignedOfficer) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Problem #${problemId} is assigned to officer '${assignedOfficer || 'UNASSIGNED'}', not '${req.user.id}'.`,
      });
    }

    next();
  };
}
