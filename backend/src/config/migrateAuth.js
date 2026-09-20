import { pool } from './database.js';

export async function migrateAuthSchema() {
  console.log('====================================================');
  console.log('MYSQL-3B: AUTHENTICATION SCHEMA MIGRATION');
  console.log('====================================================\n');

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Check if password_hash column exists
    const [cols] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash';`
    );

    if (cols.length === 0) {
      console.log('[1] Column password_hash not found. Running safe ALTER TABLE...');
      await connection.query(
        `ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER email;`
      );
      console.log('  >>> [PASS] Column password_hash VARCHAR(255) NOT NULL DEFAULT \'\' added successfully.\n');
    } else {
      console.log('[1] Column password_hash already exists:', cols[0]);
      console.log('  >>> [PASS] Schema is already up to date.\n');
    }

    // 2. Describe users table
    console.log('[2] Verifying users table schema:');
    const [describeRows] = await connection.query('DESCRIBE users;');
    for (const row of describeRows) {
      console.log(`  • ${row.Field.padEnd(16)} | ${row.Type.padEnd(20)} | Null: ${row.Null} | Key: ${row.Key} | Default: ${row.Default}`);
    }
    console.log('');

    // 3. Verify existing 13 users remain intact
    console.log('[3] Verifying existing users remain intact:');
    const [users] = await connection.query('SELECT id, role, name, email, password_hash, dashboard FROM users;');
    console.log(`  Total users in database: ${users.length} (Expected: >= 13)`);
    if (users.length < 13) {
      throw new Error(`Expected at least 13 users, found ${users.length}`);
    }
    for (const u of users) {
      console.log(`  • [${u.role.padEnd(13)}] ${u.id.padEnd(18)} | ${u.email.padEnd(28)} | pw_hash: "${u.password_hash}"`);
    }
    console.log('\n  >>> [PASS] All seeded users preserved intact.\n');

    console.log('====================================================');
    console.log('AUTH SCHEMA MIGRATION VERIFIED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrateAuth.js')) {
  migrateAuthSchema().then(() => pool.end());
}
