import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All 30 relational tables in foreign-key dependency order for deterministic restore:
const TABLES_IN_DEPENDENCY_ORDER = [
  'institutions',
  'campuses',
  'user_profiles',
  'user_roles',
  'departments',
  'programmes',
  'academic_sessions',
  'semesters',
  'sections',
  'subjects',
  'faculty_profiles',
  'student_profiles',
  'teaching_assignments',
  'attendance_sessions',
  'attendance_records',
  'attendance_revisions',
  'grading_scales',
  'grading_scale_tiers',
  'assessments',
  'assessment_results',
  'fee_structures',
  'fee_assignments',
  'fee_payments',
  'leave_requests',
  'doubts',
  'doubt_messages',
  'audit_events',
  'notification_outbox',
  'notifications',
  'institution_policies',
];

async function createBaseInstance(): Promise<PGlite> {
  const db = new PGlite();

  // Create standard Supabase roles and auth schema
  await db.exec(`
    DO $$ BEGIN
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    $$ LANGUAGE sql STABLE;

    CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
      SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'authenticated');
    $$ LANGUAGE sql STABLE;

    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
  `);

  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const ddlFiles = [
    '20261023000001_core_schema.sql',
    '20261023000002_rls_and_helpers.sql',
    '20261023000003_rpc_state_machines.sql',
  ];

  for (const file of ddlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    await db.exec(sql);
  }

  await db.exec(`
    GRANT USAGE ON SCHEMA private TO authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA private TO authenticated, service_role;
  `);

  return db;
}

/**
 * Computes deterministic SHA-256 checksum and row count for a table.
 */
async function computeTableChecksum(
  db: PGlite,
  tableName: string
): Promise<{ count: number; sha256: string; rows: any[] }> {
  // Query all rows ordered deterministically by primary key or all columns
  const res = await db.query(`
    SELECT row_to_json(t.*) as row_data
    FROM (
      SELECT * FROM public.${tableName}
      ORDER BY 1, 2
    ) t;
  `);

  const rows = res.rows.map((r: any) => r.row_data);
  const jsonString = JSON.stringify(rows);
  const sha256 = crypto.createHash('sha256').update(jsonString).digest('hex');

  return { count: rows.length, sha256, rows };
}

test('Operations, Backup & Disaster Recovery Drill', async (t) => {
  // =========================================================================
  // 1. SETUP PRIMARY DATABASE WITH SEED DATA
  // =========================================================================
  const dbPrimary = await createBaseInstance();

  // Load Seed Data on primary
  const seedSql = fs.readFileSync(
    path.resolve(__dirname, '../supabase/migrations/20261023000004_seed_data.sql'),
    'utf8'
  );
  await dbPrimary.exec(seedSql);

  // Ensure all 30 tables have non-empty data prior to snapshot drill
  await dbPrimary.exec(`
    INSERT INTO public.attendance_revisions (id, institution_id, session_id, revision_number, reason, performed_by, snapshot_records)
    VALUES ('00000000-0000-0000-0000-000000000521', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000501', 1, 'Initial session submission', '00000000-0000-0000-0000-000000000020', '[]'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.doubts (id, institution_id, student_id, subject_id, title, status)
    VALUES ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000351', 'Clarification on Sorting Algorithms', 'open')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.doubt_messages (id, doubt_id, sender_id, message)
    VALUES ('00000000-0000-0000-0000-000000000811', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000030', 'Specifically the Lomuto partitioning scheme.')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.audit_events (id, institution_id, actor_id, actor_role, action, entity_name, entity_id)
    VALUES (1001, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Super Admin', 'SEED_INIT', 'institutions', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.notification_outbox (id, institution_id, event_type, payload)
    VALUES (2001, '00000000-0000-0000-0000-000000000001', 'SYSTEM_ANNOUNCEMENT', '{"message": "Welcome to CampusOS"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.notifications (id, institution_id, recipient_id, title, body, category, is_read)
    VALUES ('00000000-0000-0000-0000-000000000961', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', 'Welcome Aarav', 'Your student portal is ready.', 'System', false)
    ON CONFLICT (id) DO NOTHING;
  `);

  await t.test('Primary instance contains all 30 schema tables with active RLS', async () => {
    const tableRes = await dbPrimary.query<{ tablename: string; rls_enabled: boolean }>(`
      SELECT c.relname as tablename, c.relrowsecurity as rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;
    `);

    assert.equal(tableRes.rows.length, 30, 'Exactly 30 relational tables must exist');
    for (const r of tableRes.rows) {
      assert.equal(r.rls_enabled, true, `Table ${r.tablename} must have RLS enabled`);
    }
  });

  // =========================================================================
  // 2. EXPORT DETERMINISTIC DATABASE SNAPSHOT FROM PRIMARY
  // =========================================================================
  const snapshotData: Record<string, { count: number; sha256: string; rows: any[] }> = {};

  await t.test('Export deterministic database state snapshot across all 30 tables', async () => {
    for (const tableName of TABLES_IN_DEPENDENCY_ORDER) {
      const result = await computeTableChecksum(dbPrimary, tableName);
      snapshotData[tableName] = result;
    }

    assert.equal(Object.keys(snapshotData).length, 30);
    // Assert EVERY SINGLE ONE of all 30 tables has non-zero records
    for (const tableName of TABLES_IN_DEPENDENCY_ORDER) {
      assert.ok(
        snapshotData[tableName].count > 0,
        `Table public.${tableName} must have at least 1 record to ensure non-empty backup drill`
      );
    }
  });

  // =========================================================================
  // 3. INSTANTIATE FRESH STANDBY DATABASE (COLD STANDBY RESTORE TARGET)
  // =========================================================================
  const dbStandby = await createBaseInstance();

  await t.test('Cold standby instance begins with 0 records across all tables', async () => {
    for (const tableName of TABLES_IN_DEPENDENCY_ORDER) {
      const countRes = await dbStandby.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.${tableName};
      `);
      assert.equal(
        Number(countRes.rows[0].count),
        0,
        `Standby table ${tableName} must be empty prior to restore`
      );
    }
  });

  // =========================================================================
  // 4. REPLAY SNAPSHOT INTO FRESH STANDBY INSTANCE
  // =========================================================================
  await t.test('Replay snapshot into standby instance in topological dependency order', async () => {
    for (const tableName of TABLES_IN_DEPENDENCY_ORDER) {
      const tableRows = snapshotData[tableName].rows;
      if (tableRows.length === 0) continue;

      for (const row of tableRows) {
        const columns = Object.keys(row);
        const colList = columns.map((c) => `"${c}"`).join(', ');

        const valList = columns
          .map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            if (typeof v === 'number') return String(v);
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::JSONB`;
            return `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(', ');

        await dbStandby.exec(`
          INSERT INTO public.${tableName} (${colList})
          VALUES (${valList})
          ON CONFLICT DO NOTHING;
        `);
      }
    }
  });

  // =========================================================================
  // 5. VERIFY CHECKSUMS, RECORD COUNTS & REFERENTIAL INTEGRITY ON STANDBY
  // =========================================================================
  await t.test('Standby instance checksums and row counts match primary 100% byte-for-byte', async (st) => {
    for (const tableName of TABLES_IN_DEPENDENCY_ORDER) {
      const restored = await computeTableChecksum(dbStandby, tableName);
      const original = snapshotData[tableName];

      await st.test(`Table public.${tableName}: count=${original.count}, SHA-256 match`, () => {
        assert.equal(
          restored.count,
          original.count,
          `Row count mismatch on table ${tableName}: expected ${original.count}, got ${restored.count}`
        );
        assert.equal(
          restored.sha256,
          original.sha256,
          `SHA-256 checksum mismatch on table ${tableName}`
        );
      });
    }
  });

  await t.test('Referential Integrity Drill: Standby has 0 orphan foreign key records', async (st) => {
    // Check FK invariants:
    // 1. All student_profiles reference valid user_profiles and institutions
    await st.test('All student profiles reference valid users and institutions', async () => {
      const orphanStudents = await dbStandby.query(`
        SELECT sp.id FROM public.student_profiles sp
        LEFT JOIN public.user_profiles up ON up.id = sp.id
        LEFT JOIN public.institutions i ON i.id = sp.institution_id
        WHERE up.id IS NULL OR i.id IS NULL;
      `);
      assert.equal(orphanStudents.rows.length, 0, 'Must have 0 orphan student profiles');
    });

    // 2. All attendance records reference valid sessions and student profiles
    await st.test('All attendance records reference valid sessions and student profiles', async () => {
      const orphanAttendance = await dbStandby.query(`
        SELECT ar.id FROM public.attendance_records ar
        LEFT JOIN public.attendance_sessions s ON s.id = ar.session_id
        LEFT JOIN public.student_profiles sp ON sp.id = ar.student_id
        WHERE s.id IS NULL OR sp.id IS NULL;
      `);
      assert.equal(orphanAttendance.rows.length, 0, 'Must have 0 orphan attendance records');
    });

    // 3. All fee payments reference valid fee assignments and students
    await st.test('All fee payments reference valid fee assignments and students', async () => {
      const orphanPayments = await dbStandby.query(`
        SELECT fp.id FROM public.fee_payments fp
        LEFT JOIN public.fee_assignments fa ON fa.id = fp.fee_assignment_id
        LEFT JOIN public.student_profiles sp ON sp.id = fp.student_id
        WHERE fa.id IS NULL OR sp.id IS NULL;
      `);
      assert.equal(orphanPayments.rows.length, 0, 'Must have 0 orphan fee payments');
    });
  });

  // =========================================================================
  // 6. OPERATIONAL READINESS DRILL ON RESTORED STANDBY INSTANCE
  // =========================================================================
  await t.test('Restored standby database handles transactions and RPC state transitions successfully', async () => {
    // Perform an attendance submission RPC on the restored standby instance
    const student1Id = '00000000-0000-0000-0000-000000000030';
    const student2Id = '00000000-0000-0000-0000-000000000031';
    const faculty1Id = '00000000-0000-0000-0000-000000000020';
    const sessionId = '00000000-0000-0000-0000-000000000501';

    await dbStandby.exec(`
      SET SESSION "request.jwt.claim.sub" = '${faculty1Id}';
      SET SESSION "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
    `);

    try {
      const records = JSON.stringify([
        { student_id: student1Id, status: 'Present' },
        { student_id: student2Id, status: 'Present' },
      ]);

      const rpcRes = await dbStandby.query<{ rpc_submit_attendance_session: any }>(`
        SELECT public.rpc_submit_attendance_session(
          '${sessionId}'::UUID,
          '${records}'::JSONB,
          'drill_restore_test_key'
        ) as rpc_submit_attendance_session;
      `);

      const res = rpcRes.rows[0].rpc_submit_attendance_session;
      assert.equal(res.success, true);
      assert.equal(res.status, 'submitted');
    } finally {
      await dbStandby.exec(`
        RESET ROLE;
        RESET "request.jwt.claim.sub";
        RESET "request.jwt.claim.role";
      `);
    }

    // Verify standby recorded the audit log and new revision
    const auditRes = await dbStandby.query<{ count: string }>(`
      SELECT COUNT(*) as count FROM public.audit_events WHERE request_id = 'drill_restore_test_key';
    `);
    assert.equal(Number(auditRes.rows[0].count), 1);
  });
});
