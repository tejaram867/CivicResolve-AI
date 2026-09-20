import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

export const ROLES = {
  CITIZEN: 'CITIZEN',
  ADMIN: 'ADMIN',
  CIVIC_OFFICER: 'CIVIC_OFFICER',
};

/**
 * Register a new persistent user in MySQL `users`.
 * Restricted to CITIZEN role only.
 */
export async function signupUser({ name, email, password, role }) {
  // 1. Missing fields validation
  if (!name || !email || !password) {
    const err = new Error('Name, email, and password are required.');
    err.statusCode = 400;
    throw err;
  }

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const rawPassword = String(password);

  if (!cleanName || !cleanEmail || !rawPassword) {
    const err = new Error('Name, email, and password cannot be empty.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Role validation: Public signup restricted to CITIZEN only
  const requestedRole = role ? String(role).trim().toUpperCase() : ROLES.CITIZEN;

  if (
    requestedRole === ROLES.ADMIN ||
    requestedRole === 'ADMIN' ||
    requestedRole === ROLES.CIVIC_OFFICER ||
    requestedRole === 'CIVIC_OFFICER' ||
    requestedRole === 'OFFICER'
  ) {
    const err = new Error(
      `Public registration is restricted to citizens only. Role '${requestedRole}' cannot be registered publicly.`
    );
    err.statusCode = 403;
    throw err;
  }

  if (requestedRole !== ROLES.CITIZEN) {
    const err = new Error(`Invalid role '${requestedRole}'. Only '${ROLES.CITIZEN}' is supported for public signup.`);
    err.statusCode = 400;
    throw err;
  }

  // 3. Duplicate email check (parameterized)
  const [existingUsers] = await pool.query(
    'SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1;',
    [cleanEmail]
  );

  if (existingUsers && existingUsers.length > 0) {
    const err = new Error(`Email address '${cleanEmail}' is already registered.`);
    err.statusCode = 409;
    throw err;
  }

  // 4. Generate unique user ID using existing project convention
  // Convention: citizen-<timestamp>
  const userId = `citizen-${Date.now()}`;
  const dashboard = '/citizen-dashboard.html';

  // 5. Hash password with bcryptjs (never store plaintext)
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

  // 6. Parameterized INSERT into MySQL users table
  await pool.query(
    `INSERT INTO users (id, role, name, email, password_hash, dashboard, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(3));`,
    [userId, ROLES.CITIZEN, cleanName, cleanEmail, passwordHash, dashboard]
  );

  // 7. Return user info without exposing password_hash
  return {
    id: userId,
    role: ROLES.CITIZEN,
    name: cleanName,
    email: cleanEmail,
    dashboard,
  };
}

/**
 * Authenticate an existing user via email and password from MySQL `users`.
 */
export async function loginUser({ email, password, role }) {
  // 1. Validate required fields
  if (!email || !password) {
    const err = new Error('Email and password are required.');
    err.statusCode = 400;
    throw err;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const rawPassword = String(password);

  // 2. Look up user by email (or username/id as fallback)
  const [rows] = await pool.query(
    `SELECT id, role, name, email, password_hash, dashboard 
     FROM users 
     WHERE LOWER(email) = ? OR id = ? 
     LIMIT 1;`,
    [cleanEmail, String(email).trim()]
  );

  if (!rows || rows.length === 0) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const user = rows[0];

  // 3. Verify password against password_hash (NO empty password bypass)
  if (!user.password_hash || !user.password_hash.trim()) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const isValid = await bcrypt.compare(rawPassword, user.password_hash);
  if (!isValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  // 4. Role check if explicitly provided
  if (role) {
    const normalizedRequested = String(role).trim().toUpperCase();
    const roleMapping = {
      CITIZEN: ROLES.CITIZEN,
      ADMIN: ROLES.ADMIN,
      CIVIC_OFFICER: ROLES.CIVIC_OFFICER,
      OFFICER: ROLES.CIVIC_OFFICER,
    };
    const expected = roleMapping[normalizedRequested];
    if (expected && expected !== user.role) {
      const err = new Error(`Account role '${user.role}' does not match requested role '${expected}'.`);
      err.statusCode = 403;
      throw err;
    }
  }

  // 5. Return user info (never expose password_hash)
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    dashboard: user.dashboard || (user.role === ROLES.ADMIN ? '/admin-dashboard.html' : user.role === ROLES.CIVIC_OFFICER ? '/officer-dashboard.html' : '/citizen-dashboard.html'),
  };
}
