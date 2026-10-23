import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import {
  generateWebhookSignature,
  verifyWebhookSignature,
  processPaymentWebhook,
} from '../src/lib/services/payment-webhook-service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IDS = {
  instA: '00000000-0000-0000-0000-000000000001',
  facultyA1: '00000000-0000-0000-0000-000000000020',
  facultyA2: '00000000-0000-0000-0000-000000000021',
  studentA1: '00000000-0000-0000-0000-000000000030',
  studentA2: '00000000-0000-0000-0000-000000000031',
  feeAssignmentA1: '00000000-0000-0000-0000-000000000611',
  financeAdminA: '00000000-0000-0000-0000-000000000013',
  programmeA1: '00000000-0000-0000-0000-000000000311',
  semesterS6: '00000000-0000-0000-0000-000000000331',
};

async function setupDatabase() {
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
  const migrationFiles = [
    '20261023000001_core_schema.sql',
    '20261023000002_rls_and_helpers.sql',
    '20261023000003_rpc_state_machines.sql',
    '20261023000004_seed_data.sql',
  ];

  for (const file of migrationFiles) {
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

async function asUser<T>(
  db: PGlite,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  await db.exec(`
    SET SESSION "request.jwt.claim.sub" = '${userId}';
    SET SESSION "request.jwt.claim.role" = 'authenticated';
    SET ROLE authenticated;
  `);
  try {
    return await fn();
  } finally {
    await db.exec(`
      RESET ROLE;
      RESET "request.jwt.claim.sub";
      RESET "request.jwt.claim.role";
    `);
  }
}

// Helper to calculate percentiles
function getPercentiles(durations: number[]) {
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const mean = sorted.reduce((sum, d) => sum + d, 0) / sorted.length;
  return { min: sorted[0], max: sorted[sorted.length - 1], mean, p50, p95, p99 };
}

test('Performance & Peak Load Testing Harness', async (t) => {
  const db = await setupDatabase();

  // =========================================================================
  // 1. PEAK ATTENDANCE BURST: 60 CONCURRENT SUBMISSIONS
  // =========================================================================
  await t.test('Peak Attendance Burst: 60 concurrent faculty submissions under high load', async (st) => {
    const burstCount = 60;
    const sessionIds: string[] = [];

    // Create 60 distinct sessions with unique dates and slots
    for (let i = 0; i < burstCount; i++) {
      const sessRes = await db.query<{ id: string }>(`
        INSERT INTO public.attendance_sessions (
          institution_id,
          teaching_assignment_id,
          session_date,
          slot_number,
          status,
          revision_count
        ) VALUES (
          '${IDS.instA}',
          '00000000-0000-0000-0000-000000000361', -- Faculty A1 assignment for CS601
          (DATE '2026-01-01' + (${i} || ' days')::INTERVAL)::DATE,
          (${i % 10} + 1),
          'open',
          0
        ) RETURNING id;
      `);
      sessionIds.push(sessRes.rows[0].id);
    }

    assert.equal(sessionIds.length, burstCount);

    await st.test('Concurrent submission burst executes with 0 deadlocks and maintains row integrity', async () => {
      const startTime = performance.now();

      // Submit attendance for all 60 sessions concurrently as Faculty A1
      const promises = sessionIds.map((sessionId, index) => {
        const records = JSON.stringify([
          { student_id: IDS.studentA1, status: index % 2 === 0 ? 'Present' : 'Absent' },
          { student_id: IDS.studentA2, status: 'Present' },
        ]);

        return asUser(db, IDS.facultyA1, async () => {
          const res = await db.query<{ rpc_submit_attendance_session: any }>(`
            SELECT public.rpc_submit_attendance_session(
              '${sessionId}'::UUID,
              '${records}'::JSONB,
              'burst_idemp_key_${index}'
            ) as rpc_submit_attendance_session;
          `);
          return res.rows[0].rpc_submit_attendance_session;
        });
      });

      const results = await Promise.all(promises);
      const totalDuration = performance.now() - startTime;

      // Verify all 60 submissions succeeded
      assert.equal(results.length, burstCount);
      for (const res of results) {
        assert.equal(res.success, true);
        assert.equal(res.status, 'submitted');
        assert.equal(res.revision_count, 1);
      }

      // Verify total attendance records created: 60 sessions * 2 students = 120 records
      const recordCountRes = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.attendance_records
        WHERE session_id = ANY(ARRAY[${sessionIds.map(id => `'${id}'::UUID`).join(',')}]);
      `);
      assert.equal(Number(recordCountRes.rows[0].count), burstCount * 2);

      // Verify audit logs generated for all burst submissions
      const auditCountRes = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.audit_events
        WHERE action = 'SUBMIT_ATTENDANCE'
          AND entity_id = ANY(ARRAY[${sessionIds.map(id => `'${id}'`).join(',')}]);
      `);
      assert.equal(Number(auditCountRes.rows[0].count), burstCount);

      // Verify throughput is healthy
      const throughput = (burstCount / (totalDuration / 1000)).toFixed(1);
      assert.ok(totalDuration > 0);
      assert.ok(Number(throughput) > 0, `Throughput: ${throughput} req/s over ${totalDuration.toFixed(1)}ms`);
    });

    await st.test('Concurrent submissions against the SAME session serialize correctly with FOR UPDATE', async () => {
      const targetSessionId = sessionIds[0];
      const contentionCount = 10;

      // 10 concurrent requests to update the same session with different attendance states
      const contentionPromises = Array.from({ length: contentionCount }).map((_, idx) => {
        const records = JSON.stringify([
          { student_id: IDS.studentA1, status: idx % 2 === 0 ? 'Present' : 'Late' },
          { student_id: IDS.studentA2, status: 'Present' },
        ]);

        return asUser(db, IDS.facultyA1, async () => {
          return await db.query<{ rpc_submit_attendance_session: any }>(`
            SELECT public.rpc_submit_attendance_session(
              '${targetSessionId}'::UUID,
              '${records}'::JSONB,
              'contention_update_${idx}'
            ) as rpc_submit_attendance_session;
          `);
        });
      });

      const contentionResults = await Promise.all(contentionPromises);
      assert.equal(contentionResults.length, contentionCount);

      // Check final state of session: revision count should be exactly 1 (initial) + 10 = 11
      const finalSession = await db.query<{ revision_count: number; status: string }>(`
        SELECT revision_count, status FROM public.attendance_sessions WHERE id = '${targetSessionId}';
      `);
      assert.equal(finalSession.rows[0].revision_count, 1 + contentionCount);
      assert.equal(finalSession.rows[0].status, 'submitted');

      // Check revision table has exactly 11 distinct revision records
      const revs = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.attendance_revisions WHERE session_id = '${targetSessionId}';
      `);
      assert.equal(Number(revs.rows[0].count), 1 + contentionCount);
    });
  });

  // =========================================================================
  // 2. CONCURRENT FEE PAYMENT LEDGER MUTATIONS & IDEMPOTENCY COLLISIONS
  // =========================================================================
  await t.test('Concurrent Fee Payment Mutations & Idempotency Collisions', async (st) => {
    await st.test('Duplicate requests with identical idempotency key return idempotent response without duplicate ledger entries', async () => {
      const fixedKey = 'idemp_concurrent_collision_key_101';
      const duplicateCalls = 20;

      // Launch 20 concurrent payment attempts with the identical idempotency key
      const collisionPromises = Array.from({ length: duplicateCalls }).map(() => {
        return asUser(db, IDS.financeAdminA, async () => {
          const res = await db.query<{ rpc_record_fee_payment: any }>(`
            SELECT public.rpc_record_fee_payment(
              '${IDS.feeAssignmentA1}'::UUID,
              500000::BIGINT, -- 5000.00 INR
              'UPI',
              '${fixedKey}',
              'GATEWAY_TXN_BURST_1'
            ) as rpc_record_fee_payment;
          `);
          return res.rows[0].rpc_record_fee_payment;
        });
      });

      const responses = await Promise.all(collisionPromises);
      assert.equal(responses.length, duplicateCalls);

      // Verify all responses report success
      for (const r of responses) {
        assert.equal(r.success, true);
        assert.equal(r.amount_minor_units, 500000);
      }

      // Exactly ONE unique payment ID must be returned across all 20 calls
      const paymentIds = new Set(responses.map(r => r.payment_id));
      assert.equal(paymentIds.size, 1, 'All colliding requests must resolve to the identical payment ID');

      // Database verification: exactly 1 payment record exists for this key
      const dbPayments = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.fee_payments WHERE idempotency_key = '${fixedKey}';
      `);
      assert.equal(Number(dbPayments.rows[0].count), 1);
    });

    await st.test('Concurrent unique payments strictly maintain double-entry balance without race leakage', async () => {
      // Create a dedicated fresh fee structure & assignment for student A2 to test strict ledger balance under concurrency
      const structRes = await db.query<{ id: string }>(`
        INSERT INTO public.fee_structures (
          institution_id,
          programme_id,
          semester_id,
          name,
          amount_minor_units,
          due_date
        ) VALUES (
          '${IDS.instA}',
          '${IDS.programmeA1}',
          '${IDS.semesterS6}',
          'Concurrency Test Structure',
          10000000, -- 100,000.00 INR
          '2026-12-31'
        ) RETURNING id;
      `);
      const testStructId = structRes.rows[0].id;

      const assignRes = await db.query<{ id: string }>(`
        INSERT INTO public.fee_assignments (
          institution_id,
          fee_structure_id,
          student_id,
          assigned_amount_minor_units,
          concession_amount_minor_units
        ) VALUES (
          '${IDS.instA}',
          '${testStructId}',
          '${IDS.studentA2}',
          10000000,
          0
        ) RETURNING id;
      `);
      const testAssignId = assignRes.rows[0].id;

      // 10 concurrent payments of 500,000 minor units (5,000 INR each) = 50,000 INR total
      const paymentCount = 10;
      const paymentAmount = 500000;

      const paymentPromises = Array.from({ length: paymentCount }).map((_, idx) => {
        return asUser(db, IDS.financeAdminA, async () => {
          const res = await db.query<{ rpc_record_fee_payment: any }>(`
            SELECT public.rpc_record_fee_payment(
              '${testAssignId}'::UUID,
              ${paymentAmount}::BIGINT,
              'NetBanking',
              'burst_unique_key_${idx}_${Date.now()}',
              'GATEWAY_REF_${idx}'
            ) as rpc_record_fee_payment;
          `);
          return res.rows[0].rpc_record_fee_payment;
        });
      });

      const pResults = await Promise.all(paymentPromises);
      assert.equal(pResults.length, paymentCount);

      // Verify all payment records in database
      const totalPaidRes = await db.query<{ total: string; cnt: string }>(`
        SELECT COALESCE(SUM(amount_minor_units), 0) as total, COUNT(*) as cnt
        FROM public.fee_payments
        WHERE fee_assignment_id = '${testAssignId}' AND status = 'verified';
      `);
      const totalPaid = Number(totalPaidRes.rows[0].total);
      const totalCount = Number(totalPaidRes.rows[0].cnt);

      assert.equal(totalCount, paymentCount);
      assert.equal(totalPaid, paymentCount * paymentAmount);

      // Invariant: assigned (10,000,000) - totalPaid (5,000,000) = balance (5,000,000)
      const expectedBalance = 10000000 - totalPaid;
      assert.equal(expectedBalance, 5000000);
    });
  });

  // =========================================================================
  // 3. LATENCY TARGET BENCHMARKING (SECTION 11 SLA VERIFICATION)
  // =========================================================================
  await t.test('Section 11 Latency Targets & Query SLA Verification', async (st) => {
    const iterations = 50;

    await st.test('Single-row reads conform to latency budget (target: < 15ms p95)', async () => {
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await db.query(`SELECT * FROM public.student_profiles WHERE id = '${IDS.studentA1}';`);
        const elapsed = performance.now() - start;
        durations.push(elapsed);
      }

      const stats = getPercentiles(durations);
      assert.ok(stats.p95 < 15, `Single-row read p95 (${stats.p95.toFixed(2)}ms) must be under 15ms limit`);
      assert.ok(stats.mean < 15, `Single-row read mean (${stats.mean.toFixed(2)}ms) must be under 15ms`);
    });

    await st.test('Relational list queries with multi-table joins conform to budget (target: < 50ms p95)', async () => {
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await db.query(`
          SELECT
            sp.id,
            sp.enrolment_no,
            sp.roll_no,
            (up.first_name || ' ' || up.last_name) as full_name,
            up.email,
            d.name as department_name,
            p.name as programme_name,
            COUNT(DISTINCT ar.id) as attendance_records_count,
            COUNT(DISTINCT fa.id) as fee_assignments_count
          FROM public.student_profiles sp
          JOIN public.user_profiles up ON up.id = sp.id
          JOIN public.departments d ON d.id = sp.department_id
          JOIN public.programmes p ON p.id = sp.programme_id
          LEFT JOIN public.attendance_records ar ON ar.student_id = sp.id
          LEFT JOIN public.fee_assignments fa ON fa.student_id = sp.id
          WHERE sp.institution_id = '${IDS.instA}'
          GROUP BY sp.id, sp.enrolment_no, sp.roll_no, up.first_name, up.last_name, up.email, d.name, p.name;
        `);
        const elapsed = performance.now() - start;
        durations.push(elapsed);
      }

      const stats = getPercentiles(durations);
      assert.ok(stats.p95 < 50, `List query with joins p95 (${stats.p95.toFixed(2)}ms) must be under 50ms`);
      assert.ok(stats.mean < 35, `List query mean (${stats.mean.toFixed(2)}ms) must be under 35ms`);
    });

    await st.test('Complex aggregate computations conform to budget (target: < 100ms p95)', async () => {
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await db.query(`
          SELECT
            inst.name as institution_name,
            (SELECT COUNT(*) FROM public.student_profiles WHERE institution_id = inst.id) as total_students,
            (SELECT COUNT(*) FROM public.faculty_profiles WHERE institution_id = inst.id) as total_faculty,
            (SELECT COUNT(*) FROM public.attendance_sessions WHERE institution_id = inst.id) as total_attendance_sessions,
            (SELECT COUNT(*) FROM public.attendance_records WHERE institution_id = inst.id AND status = 'Present') as total_presents,
            (SELECT COUNT(*) FROM public.attendance_records WHERE institution_id = inst.id AND status = 'Absent') as total_absents,
            (SELECT COALESCE(SUM(amount_minor_units), 0) FROM public.fee_payments WHERE institution_id = inst.id AND status = 'verified') as total_fees_collected_minor_units
          FROM public.institutions inst
          WHERE inst.id = '${IDS.instA}';
        `);
        const elapsed = performance.now() - start;
        durations.push(elapsed);
      }

      const stats = getPercentiles(durations);
      assert.ok(stats.p95 < 100, `Aggregate calculation p95 (${stats.p95.toFixed(2)}ms) must be under 100ms`);
      assert.ok(stats.mean < 75, `Aggregate calculation mean (${stats.mean.toFixed(2)}ms) must be under 75ms`);
    });
  });

  // =========================================================================
  // 4. CRYPTOGRAPHIC PAYMENT GATEWAY WEBHOOK HMAC & REPLAY PROTECTION (ASSUMPTION A-012)
  // =========================================================================
  await t.test('Cryptographic Payment Gateway Webhook HMAC & Replay Protection (Assumption A-012)', async (st) => {
    const WEBHOOK_SECRET = 'campai_pilot_hmac_secret_key_998877';

    // Fresh dedicated fee assignment for webhook testing
    const structRes = await db.query<{ id: string }>(`
      INSERT INTO public.fee_structures (
        institution_id,
        programme_id,
        semester_id,
        name,
        amount_minor_units,
        due_date
      ) VALUES (
        '${IDS.instA}',
        '${IDS.programmeA1}',
        '${IDS.semesterS6}',
        'Webhook Security Test Fee',
        5000000, -- 50,000.00 INR
        '2026-12-31'
      ) RETURNING id;
    `);
    const webhookStructId = structRes.rows[0].id;

    const assignRes = await db.query<{ id: string }>(`
      INSERT INTO public.fee_assignments (
        institution_id,
        fee_structure_id,
        student_id,
        assigned_amount_minor_units,
        concession_amount_minor_units
      ) VALUES (
        '${IDS.instA}',
        '${webhookStructId}',
        '${IDS.studentA1}',
        5000000,
        0
      ) RETURNING id;
    `);
    const webhookAssignId = assignRes.rows[0].id;

    await st.test('Attack Vector 1: Webhook with forged / invalid HMAC signature is rejected with 401', async () => {
      const payloadObj = {
        event: 'payment.captured',
        institution_id: IDS.instA,
        assignment_id: webhookAssignId,
        amount_minor_units: 1000000,
        payment_method: 'UPI',
        idempotency_key: 'idemp_spoofed_attack_001',
        gateway_reference: 'GW_SPOOFED_REF',
      };
      const rawPayload = JSON.stringify(payloadObj);
      const forgedSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const result = await processPaymentWebhook(db, {
        payloadRaw: rawPayload,
        signatureHeader: forgedSignature,
        secret: WEBHOOK_SECRET,
      });

      assert.equal(result.status, 401);
      assert.equal(result.success, false);
      assert.equal(result.error, 'INVALID_SIGNATURE');

      // Database assertion: zero payments recorded for spoofed key
      const dbCheck = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.fee_payments WHERE idempotency_key = 'idemp_spoofed_attack_001';
      `);
      assert.equal(Number(dbCheck.rows[0].count), 0);
    });

    await st.test('Attack Vector 2: Replay attack with expired timestamp (> 300s old) is rejected with 401', async () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const payloadObj = {
        event: 'payment.captured',
        institution_id: IDS.instA,
        assignment_id: webhookAssignId,
        amount_minor_units: 1000000,
        payment_method: 'NetBanking',
        idempotency_key: 'idemp_replay_attack_002',
        gateway_reference: 'GW_REPLAY_REF',
      };
      const rawPayload = JSON.stringify(payloadObj);
      const validSigForExpiredTime = generateWebhookSignature(rawPayload, WEBHOOK_SECRET, expiredTimestamp);

      const result = await processPaymentWebhook(db, {
        payloadRaw: rawPayload,
        signatureHeader: validSigForExpiredTime,
        secret: WEBHOOK_SECRET,
        timestampHeader: expiredTimestamp,
      });

      assert.equal(result.status, 401);
      assert.equal(result.success, false);
      assert.equal(result.error, 'TIMESTAMP_EXPIRED');

      // Database assertion: zero payments recorded
      const dbCheck = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.fee_payments WHERE idempotency_key = 'idemp_replay_attack_002';
      `);
      assert.equal(Number(dbCheck.rows[0].count), 0);
    });

    await st.test('Attack Vector 3: Tampered payload body with original signature is rejected with 401', async () => {
      const originalPayload = JSON.stringify({
        event: 'payment.captured',
        institution_id: IDS.instA,
        assignment_id: webhookAssignId,
        amount_minor_units: 50000, // 500 INR
        payment_method: 'Card',
        idempotency_key: 'idemp_tamper_attack_003',
        gateway_reference: 'GW_TAMPER_REF',
      });
      const originalSignature = generateWebhookSignature(originalPayload, WEBHOOK_SECRET);

      // Attacker intercepts and modifies amount to 5,000,000 minor units
      const tamperedPayload = JSON.stringify({
        event: 'payment.captured',
        institution_id: IDS.instA,
        assignment_id: webhookAssignId,
        amount_minor_units: 5000000, // 50,000 INR
        payment_method: 'Card',
        idempotency_key: 'idemp_tamper_attack_003',
        gateway_reference: 'GW_TAMPER_REF',
      });

      const result = await processPaymentWebhook(db, {
        payloadRaw: tamperedPayload,
        signatureHeader: originalSignature,
        secret: WEBHOOK_SECRET,
      });

      assert.equal(result.status, 401);
      assert.equal(result.success, false);
      assert.equal(result.error, 'INVALID_SIGNATURE');

      // Database check
      const dbCheck = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.fee_payments WHERE idempotency_key = 'idemp_tamper_attack_003';
      `);
      assert.equal(Number(dbCheck.rows[0].count), 0);
    });

    await st.test('Legitimate Webhook: Authentic HMAC signature records payment and updates fee balance', async () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const legitPayload = JSON.stringify({
        event: 'payment.captured',
        institution_id: IDS.instA,
        assignment_id: webhookAssignId,
        amount_minor_units: 2000000, // 20,000 INR
        payment_method: 'UPI',
        idempotency_key: 'idemp_legit_webhook_004',
        gateway_reference: 'GW_LEGIT_TXN_999',
      });
      const validSig = generateWebhookSignature(legitPayload, WEBHOOK_SECRET, currentTimestamp);

      const result = await processPaymentWebhook(db, {
        payloadRaw: legitPayload,
        signatureHeader: validSig,
        secret: WEBHOOK_SECRET,
        timestampHeader: currentTimestamp,
      });

      assert.equal(result.status, 200);
      assert.equal(result.success, true);
      assert.equal(result.is_duplicate, false);
      assert.equal(result.amount_minor_units, 2000000);

      // Database verification
      const dbPayment = await db.query<{ amount_minor_units: number; status: string }>(`
        SELECT amount_minor_units, status FROM public.fee_payments WHERE idempotency_key = 'idemp_legit_webhook_004';
      `);
      assert.equal(dbPayment.rows.length, 1);
      assert.equal(dbPayment.rows[0].status, 'verified');
      assert.equal(dbPayment.rows[0].amount_minor_units, 2000000);
    });

    await st.test('Idempotent Replay: Duplicate webhook delivery returns existing payment without double recording', async () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const legitPayload = JSON.stringify({
        event: 'payment.captured',
        institution_id: IDS.instA,
        assignment_id: webhookAssignId,
        amount_minor_units: 2000000,
        payment_method: 'UPI',
        idempotency_key: 'idemp_legit_webhook_004',
        gateway_reference: 'GW_LEGIT_TXN_999',
      });
      const validSig = generateWebhookSignature(legitPayload, WEBHOOK_SECRET, currentTimestamp);

      // Re-send identical webhook
      const duplicateResult = await processPaymentWebhook(db, {
        payloadRaw: legitPayload,
        signatureHeader: validSig,
        secret: WEBHOOK_SECRET,
        timestampHeader: currentTimestamp,
      });

      assert.equal(duplicateResult.status, 200);
      assert.equal(duplicateResult.success, true);
      assert.equal(duplicateResult.is_duplicate, true);

      // Total payments for this assignment must still be exactly 1
      const countRes = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.fee_payments WHERE fee_assignment_id = '${webhookAssignId}';
      `);
      assert.equal(Number(countRes.rows[0].count), 1);
    });

    await st.test('Concurrent Webhooks: Simultaneous duplicate webhook invocations resolve to single payment', async () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const concurrentPayload = JSON.stringify({
        event: 'payment.captured',
        institution_id: IDS.instA,
        assignment_id: webhookAssignId,
        amount_minor_units: 1500000, // 15,000 INR
        payment_method: 'NetBanking',
        idempotency_key: 'idemp_concurrent_webhook_005',
        gateway_reference: 'GW_CONCURRENT_TXN_888',
      });
      const validSig = generateWebhookSignature(concurrentPayload, WEBHOOK_SECRET, currentTimestamp);

      // 15 simultaneous webhook calls
      const webhookBurst = Array.from({ length: 15 }).map(() =>
        processPaymentWebhook(db, {
          payloadRaw: concurrentPayload,
          signatureHeader: validSig,
          secret: WEBHOOK_SECRET,
          timestampHeader: currentTimestamp,
        })
      );

      const burstResults = await Promise.all(webhookBurst);
      assert.equal(burstResults.length, 15);

      for (const r of burstResults) {
        assert.equal(r.status, 200);
        assert.equal(r.success, true);
      }

      // Exactly ONE unique payment ID returned across all 15 calls
      const paymentIds = new Set(burstResults.map((r) => r.payment_id));
      assert.equal(paymentIds.size, 1);

      // Exactly 1 database payment record exists for this idempotency key
      const dbCheck = await db.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM public.fee_payments WHERE idempotency_key = 'idemp_concurrent_webhook_005';
      `);
      assert.equal(Number(dbCheck.rows[0].count), 1);
    });
  });
});

