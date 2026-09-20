import { pool } from './src/config/database.js';

async function checkRows() {
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
    'notifications'
  ];

  console.log('\n====================================================');
  console.log('MYSQL FUSIONX DATABASE TABLE ROW COUNTS');
  console.log('====================================================\n');

  const summary = [];
  for (const t of tables) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${t}`);
    summary.push({ Table: t, 'Row Count': rows[0].count });
  }
  console.table(summary);

  // Foreign Key Integrity Check
  console.log('\n--- Foreign Key Integrity Verification ---');
  const [fkChecks] = await pool.query(`
    SELECT
      TABLE_NAME,
      COLUMN_NAME,
      CONSTRAINT_NAME,
      REFERENCED_TABLE_NAME,
      REFERENCED_COLUMN_NAME
    FROM
      INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      TABLE_SCHEMA = 'fusionx'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME;
  `);
  console.log(`Verified ${fkChecks.length} active foreign key constraints across child tables:`);
  fkChecks.forEach((fk) => {
    console.log(`  • ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} [${fk.CONSTRAINT_NAME}]`);
  });

  process.exit(0);
}

checkRows().catch((e) => {
  console.error(e);
  process.exit(1);
});
