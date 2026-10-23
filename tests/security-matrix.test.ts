import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test fixtures from seed migration:
const IDS = {
  instA: '00000000-0000-0000-0000-000000000001',
  instB: '00000000-0000-0000-0000-000000000002',
  superAdmin: '00000000-0000-0000-0000-000000000010',
  instAdminA: '00000000-0000-0000-0000-000000000011',
  examAdminA: '00000000-0000-0000-0000-000000000012',
  financeAdminA: '00000000-0000-0000-0000-000000000013',
  academicAdminA: '00000000-0000-0000-0000-000000000014',
  deptAdminA: '00000000-0000-0000-0000-000000000015',
  facultyA1: '00000000-0000-0000-0000-000000000020', // Assigned to CS601
  facultyA2: '00000000-0000-0000-0000-000000000021', // Unassigned to CS601
  studentA1: '00000000-0000-0000-0000-000000000030', // Inst A
  studentA2: '00000000-0000-0000-0000-000000000031', // Inst A
  studentB1: '00000000-0000-0000-0000-000000000040', // Inst B
  semesterS6: '00000000-0000-0000-0000-000000000331',
  sessionCS601: '00000000-0000-0000-0000-000000000501',
  feeAssignmentA1: '00000000-0000-0000-0000-000000000611',
  leaveRequestA1: '00000000-0000-0000-0000-000000000701',
  assessmentMidterm: '00000000-0000-0000-0000-000000000411', // published
  assessmentEndterm: '00000000-0000-0000-0000-000000000412', // submitted
  assessmentQuiz: '00000000-0000-0000-0000-000000000413',    // draft
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

  // Load migrations sequentially
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

  // Grant permissions on newly created tables and private schema
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
 * Runs a query within a simulated authenticated user session.
 */
async function asUser<T = any>(
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

test('Security Matrix: Schema & RLS Foundation', async (t) => {
  const db = await setupDatabase();

  await t.test('All 30 tables have RLS enabled (relrowsecurity = true)', async () => {
    const res = await db.query<{ tablename: string; rls_enabled: boolean }>(`
      SELECT c.relname as tablename, c.relrowsecurity as rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;
    `);

    assert.ok(res.rows.length >= 30, `Expected at least 30 tables, found ${res.rows.length}`);
    for (const row of res.rows) {
      assert.equal(
        row.rls_enabled,
        true,
        `Table public.${row.tablename} must have Row Level Security enabled`
      );
    }
  });

  await t.test('Private schema helper functions execute securely', async () => {
    // Test current_institution_id() for Student A1
    const resA = await asUser(db, IDS.studentA1, async () => {
      const q = await db.query<{ inst_id: string }>(`SELECT private.current_institution_id() as inst_id;`);
      return q.rows[0].inst_id;
    });
    assert.equal(resA, IDS.instA);

    // Test current_institution_id() for Student B1
    const resB = await asUser(db, IDS.studentB1, async () => {
      const q = await db.query<{ inst_id: string }>(`SELECT private.current_institution_id() as inst_id;`);
      return q.rows[0].inst_id;
    });
    assert.equal(resB, IDS.instB);
  });

  await t.test('Super Admin has global visibility across institutions', async () => {
    await asUser(db, IDS.superAdmin, async () => {
      const insts = await db.query(`SELECT id FROM public.institutions;`);
      assert.equal(insts.rows.length, 2, 'Super Admin must see all institutions');

      const depts = await db.query(`SELECT id FROM public.departments;`);
      assert.equal(depts.rows.length, 2, 'Super Admin must see all departments across institutions');
    });
  });
});

test('Security Matrix: Cross-Tenant Isolation Tests (Negative Tests)', async (t) => {
  const db = await setupDatabase();

  await t.test('Tenant B Student cannot read Tenant A institutions or departments', async () => {
    await asUser(db, IDS.studentB1, async () => {
      const insts = await db.query(`SELECT id, code FROM public.institutions;`);
      assert.equal(insts.rows.length, 1);
      assert.equal((insts.rows[0] as any).id, IDS.instB);

      const depts = await db.query(`SELECT id, code FROM public.departments;`);
      assert.equal(depts.rows.length, 1);
      assert.equal((depts.rows[0] as any).code, 'CS');
    });
  });

  await t.test('Tenant B Student cannot read Tenant A attendance records or sessions', async () => {
    await asUser(db, IDS.studentB1, async () => {
      const att = await db.query(`SELECT * FROM public.attendance_records;`);
      assert.equal(att.rows.length, 0, 'Tenant B student must see 0 attendance records from Tenant A');

      const sessions = await db.query(`SELECT * FROM public.attendance_sessions;`);
      assert.equal(sessions.rows.length, 0, 'Tenant B student must see 0 attendance sessions from Tenant A');
    });
  });

  await t.test('Tenant B Student cannot read Tenant A leave requests or fee structures', async () => {
    await asUser(db, IDS.studentB1, async () => {
      const leaves = await db.query(`SELECT * FROM public.leave_requests;`);
      assert.equal(leaves.rows.length, 0, 'Tenant B student must not see Tenant A leave requests');

      const fees = await db.query(`SELECT * FROM public.fee_structures;`);
      assert.equal(fees.rows.length, 0, 'Tenant B student must not see Tenant A fee structures');
    });
  });

  await t.test('Tenant B Student cannot calculate Tenant A Student attendance percentage', async () => {
    await asUser(db, IDS.studentB1, async () => {
      await assert.rejects(
        async () => {
          await db.query(`SELECT public.calc_attendance_percentage('${IDS.studentA1}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_ATTENDANCE_ACCESS/);
          return true;
        }
      );
    });
  });

  await t.test('Tenant B Student cannot calculate Tenant A Student fee balance', async () => {
    await asUser(db, IDS.studentB1, async () => {
      await assert.rejects(
        async () => {
          await db.query(`SELECT public.calc_fee_balance('${IDS.feeAssignmentA1}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_FEE_ACCESS/);
          return true;
        }
      );
    });
  });

  await t.test('Tenant B Student cannot calculate Tenant A Student SGPA', async () => {
    await asUser(db, IDS.studentB1, async () => {
      await assert.rejects(
        async () => {
          await db.query(`SELECT public.calc_sgpa('${IDS.studentA1}'::uuid, '${IDS.semesterS6}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_GRADE_ACCESS/);
          return true;
        }
      );
    });
  });

  await t.test('Tenant B Student cannot record fee payment on Tenant A fee assignment', async () => {
    await asUser(db, IDS.studentB1, async () => {
      await assert.rejects(
        async () => {
          await db.query(`
            SELECT public.rpc_record_fee_payment(
              '${IDS.feeAssignmentA1}'::uuid,
              100000,
              'UPI',
              'ROGUE-PAY-TB'
            );
          `);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_FEE_PAYMENT/);
          return true;
        }
      );
    });
  });

  await t.test('Faculty A1 cannot submit attendance for student belonging to another tenant', async () => {
    await asUser(db, IDS.facultyA1, async () => {
      const records = JSON.stringify([
        { student_id: IDS.studentB1, status: 'Present' }
      ]);
      await assert.rejects(
        async () => {
          await db.query(`
            SELECT public.rpc_submit_attendance_session(
              '${IDS.sessionCS601}'::uuid,
              '${records}'::jsonb,
              'test-cross-tenant-student'
            );
          `);
        },
        (err: any) => {
          assert.match(err.message, /STUDENT_NOT_IN_INSTITUTION/);
          return true;
        }
      );
    });
  });
});

test('Security Matrix: Intra-Tenant RBAC Isolation (Student vs Student)', async (t) => {
  const db = await setupDatabase();

  await t.test('Student A1 can only see own attendance records, NOT Student A2 records', async () => {
    await asUser(db, IDS.studentA1, async () => {
      const records = await db.query<{ student_id: string; status: string }>(`
        SELECT student_id, status FROM public.attendance_records;
      `);
      assert.equal(records.rows.length, 1);
      assert.equal(records.rows[0].student_id, IDS.studentA1);
      assert.equal(records.rows[0].status, 'Present');
    });

    await asUser(db, IDS.studentA2, async () => {
      const records = await db.query<{ student_id: string; status: string }>(`
        SELECT student_id, status FROM public.attendance_records;
      `);
      assert.equal(records.rows.length, 1);
      assert.equal(records.rows[0].student_id, IDS.studentA2);
      assert.equal(records.rows[0].status, 'Absent');
    });
  });

  await t.test('Student A1 cannot see Student A2 leave requests', async () => {
    await asUser(db, IDS.studentA2, async () => {
      const leaves = await db.query(`SELECT * FROM public.leave_requests;`);
      assert.equal(leaves.rows.length, 0, 'Student A2 has no leave requests and must not see Student A1 requests');
    });
  });

  await t.test('Student A1 cannot mutate attendance records directly (denied by RLS)', async () => {
    await asUser(db, IDS.studentA1, async () => {
      await assert.rejects(
        async () => {
          await db.query(`
            INSERT INTO public.attendance_records (institution_id, session_id, student_id, status)
            VALUES ('${IDS.instA}', '${IDS.sessionCS601}', '${IDS.studentA1}', 'Present');
          `);
        },
        (err: any) => true
      );

      const updateRes = await db.query(`
        UPDATE public.attendance_records
        SET status = 'Present'
        WHERE student_id = '${IDS.studentA2}';
      `);
      assert.equal(updateRes.affectedRows, 0, 'RLS must prevent student from modifying other student records');
    });
  });

  await t.test('Student A2 cannot calculate Student A1 fee balance or SGPA', async () => {
    await asUser(db, IDS.studentA2, async () => {
      await assert.rejects(
        async () => {
          await db.query(`SELECT public.calc_fee_balance('${IDS.feeAssignmentA1}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_FEE_ACCESS/);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await db.query(`SELECT public.calc_sgpa('${IDS.studentA1}'::uuid, '${IDS.semesterS6}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_GRADE_ACCESS/);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await db.query(`SELECT public.calc_attendance_percentage('${IDS.studentA1}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_ATTENDANCE_ACCESS/);
          return true;
        }
      );
    });
  });

  await t.test('Student A1 CAN calculate own attendance percentage, fee balance, and SGPA', async () => {
    await asUser(db, IDS.studentA1, async () => {
      const att = await db.query<{ calc_attendance_percentage: string }>(`
        SELECT public.calc_attendance_percentage('${IDS.studentA1}'::uuid);
      `);
      assert.equal(Number(att.rows[0].calc_attendance_percentage), 100.00);

      const fee = await db.query<{ calc_fee_balance: number }>(`
        SELECT public.calc_fee_balance('${IDS.feeAssignmentA1}'::uuid);
      `);
      assert.equal(Number(fee.rows[0].calc_fee_balance), 3000000); // 7000000 net - 4000000 paid

      const sgpa = await db.query<{ calc_sgpa: string }>(`
        SELECT public.calc_sgpa('${IDS.studentA1}'::uuid, '${IDS.semesterS6}'::uuid);
      `);
      assert.equal(Number(sgpa.rows[0].calc_sgpa), 9.00);
    });
  });
});

test('Security Matrix: Faculty Role & Teaching Assignment Enforcement', async (t) => {
  const db = await setupDatabase();

  await t.test('Faculty A2 (unassigned) CANNOT submit attendance for CS601', async () => {
    await asUser(db, IDS.facultyA2, async () => {
      const records = JSON.stringify([
        { student_id: IDS.studentA1, status: 'Present' }
      ]);
      await assert.rejects(
        async () => {
          await db.query(`
            SELECT public.rpc_submit_attendance_session(
              '${IDS.sessionCS601}'::uuid,
              '${records}'::jsonb,
              'test-unassigned'
            );
          `);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_ATTENDANCE_SUBMISSION/);
          return true;
        }
      );
    });
  });

  await t.test('Faculty A1 (assigned) CAN successfully submit attendance for CS601', async () => {
    await asUser(db, IDS.facultyA1, async () => {
      const records = JSON.stringify([
        { student_id: IDS.studentA1, status: 'Present' },
        { student_id: IDS.studentA2, status: 'Present' }
      ]);
      const res = await db.query<{ rpc_submit_attendance_session: any }>(`
        SELECT public.rpc_submit_attendance_session(
          '${IDS.sessionCS601}'::uuid,
          '${records}'::jsonb,
          'faculty-submission-01'
        );
      `);
      assert.ok(res.rows[0].rpc_submit_attendance_session.success);
      assert.equal(res.rows[0].rpc_submit_attendance_session.status, 'submitted');
    });

    // Verify audit event
    const audit = await db.query<{ action: string; entity_id: string }>(`
      SELECT action, entity_id FROM public.audit_events
      WHERE entity_name = 'attendance_sessions' AND entity_id = '${IDS.sessionCS601}'
      ORDER BY id DESC LIMIT 1;
    `);
    assert.equal(audit.rows[0].action, 'SUBMIT_ATTENDANCE');

    // Verify notification outbox
    const outbox = await db.query<{ event_type: string }>(`
      SELECT event_type FROM public.notification_outbox
      WHERE event_type = 'ATTENDANCE_SUBMITTED'
      ORDER BY id DESC LIMIT 1;
    `);
    assert.equal(outbox.rows[0].event_type, 'ATTENDANCE_SUBMITTED');
  });

  await t.test('Locked attendance session cannot be modified', async () => {
    await db.exec(`
      UPDATE public.attendance_sessions
      SET status = 'locked'
      WHERE id = '${IDS.sessionCS601}';
    `);

    await asUser(db, IDS.facultyA1, async () => {
      const records = JSON.stringify([{ student_id: IDS.studentA1, status: 'Absent' }]);
      await assert.rejects(
        async () => {
          await db.query(`
            SELECT public.rpc_submit_attendance_session(
              '${IDS.sessionCS601}'::uuid,
              '${records}'::jsonb,
              'test-locked'
            );
          `);
        },
        (err: any) => {
          assert.match(err.message, /ATTENDANCE_SESSION_LOCKED/);
          return true;
        }
      );
    });
  });
});

test('Security Matrix: Fee Payment Idempotency & Finance Admin Role', async (t) => {
  const db = await setupDatabase();

  await t.test('Idempotent payment: second call with same key does not create duplicate payment', async () => {
    const key = 'IDEMP-TEST-UNIQUE-99';
    const amount = 2000000; // 20,000 INR

    const res1 = await asUser(db, IDS.studentA1, async () => {
      const q = await db.query<{ rpc_record_fee_payment: any }>(`
        SELECT public.rpc_record_fee_payment(
          '${IDS.feeAssignmentA1}'::uuid,
          ${amount},
          'UPI',
          '${key}'
        );
      `);
      return q.rows[0].rpc_record_fee_payment;
    });

    assert.equal(res1.success, true);
    assert.equal(res1.is_duplicate, false);
    const paymentId = res1.payment_id;

    const res2 = await asUser(db, IDS.studentA1, async () => {
      const q = await db.query<{ rpc_record_fee_payment: any }>(`
        SELECT public.rpc_record_fee_payment(
          '${IDS.feeAssignmentA1}'::uuid,
          ${amount},
          'UPI',
          '${key}'
        );
      `);
      return q.rows[0].rpc_record_fee_payment;
    });

    assert.equal(res2.success, true);
    assert.equal(res2.is_duplicate, true);
    assert.equal(res2.payment_id, paymentId);

    const countRes = await db.query<{ count: string }>(`
      SELECT COUNT(*) as count FROM public.fee_payments WHERE idempotency_key = '${key}';
    `);
    assert.equal(Number(countRes.rows[0].count), 1, 'Must have exactly 1 payment record for unique idempotency key');
  });

  await t.test('Finance Admin can record fee payment on student assignment', async () => {
    const key = 'IDEMP-FINANCE-ADMIN-01';
    const amount = 1000000; // 10,000 INR

    const res = await asUser(db, IDS.financeAdminA, async () => {
      const q = await db.query<{ rpc_record_fee_payment: any }>(`
        SELECT public.rpc_record_fee_payment(
          '${IDS.feeAssignmentA1}'::uuid,
          ${amount},
          'Demand Draft',
          '${key}',
          'DD-887766'
        );
      `);
      return q.rows[0].rpc_record_fee_payment;
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'verified');
  });
});

test('Security Matrix: Leave Request Workflow State Machine', async (t) => {
  const db = await setupDatabase();

  await t.test('Student can withdraw own submitted leave request', async () => {
    const res = await asUser(db, IDS.studentA1, async () => {
      const q = await db.query<{ rpc_transition_leave_request: any }>(`
        SELECT public.rpc_transition_leave_request(
          '${IDS.leaveRequestA1}'::uuid,
          'withdrawn'::public.leave_status,
          'No longer unwell'
        );
      `);
      return q.rows[0].rpc_transition_leave_request;
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'withdrawn');
  });

  await t.test('Resolved/withdrawn leave cannot transition further', async () => {
    await asUser(db, IDS.instAdminA, async () => {
      await assert.rejects(
        async () => {
          await db.query(`
            SELECT public.rpc_transition_leave_request(
              '${IDS.leaveRequestA1}'::uuid,
              'approved'::public.leave_status,
              'Approving anyway'
            );
          `);
        },
        (err: any) => {
          assert.match(err.message, /LEAVE_REQUEST_ALREADY_RESOLVED/);
          return true;
        }
      );
    });
  });

  await t.test('Approving or rejecting leave requires non-empty decision comment', async () => {
    // Create new leave request
    const leaveId = '00000000-0000-0000-0000-000000000702';
    await db.exec(`
      INSERT INTO public.leave_requests (id, institution_id, student_id, start_date, end_date, reason, status)
      VALUES ('${leaveId}', '${IDS.instA}', '${IDS.studentA1}', '2026-04-01', '2026-04-03', 'Family Event', 'submitted');
    `);

    // Attempt approve with null / empty comment
    await asUser(db, IDS.facultyA1, async () => {
      await assert.rejects(
        async () => {
          await db.query(`
            SELECT public.rpc_transition_leave_request(
              '${leaveId}'::uuid,
              'approved'::public.leave_status,
              ''
            );
          `);
        },
        (err: any) => {
          assert.match(err.message, /DECISION_COMMENT_REQUIRED/);
          return true;
        }
      );
    });

    // Approve with valid decision comment
    await asUser(db, IDS.facultyA1, async () => {
      const res = await db.query<{ rpc_transition_leave_request: any }>(`
        SELECT public.rpc_transition_leave_request(
          '${leaveId}'::uuid,
          'approved'::public.leave_status,
          'Leave approved with prior proctor permission'
        );
      `);
      assert.equal(res.rows[0].rpc_transition_leave_request.status, 'approved');
    });
  });
});

test('Security Matrix: Examination Admin & Assessment Publication', async (t) => {
  const db = await setupDatabase();

  await t.test('Student cannot publish assessment results', async () => {
    await asUser(db, IDS.studentA1, async () => {
      await assert.rejects(
        async () => {
          await db.query(`SELECT public.rpc_publish_assessment_results('${IDS.assessmentEndterm}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_ASSESSMENT_PUBLICATION/);
          return true;
        }
      );
    });
  });

  await t.test('Faculty cannot publish assessment results', async () => {
    await asUser(db, IDS.facultyA1, async () => {
      await assert.rejects(
        async () => {
          await db.query(`SELECT public.rpc_publish_assessment_results('${IDS.assessmentEndterm}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /UNAUTHORIZED_ASSESSMENT_PUBLICATION/);
          return true;
        }
      );
    });
  });

  await t.test('Exam Admin cannot publish draft assessment results', async () => {
    await asUser(db, IDS.examAdminA, async () => {
      await assert.rejects(
        async () => {
          await db.query(`SELECT public.rpc_publish_assessment_results('${IDS.assessmentQuiz}'::uuid);`);
        },
        (err: any) => {
          assert.match(err.message, /CANNOT_PUBLISH_UNSUBMITTED_ASSESSMENT/);
          return true;
        }
      );
    });
  });

  await t.test('Exam Admin can publish submitted assessment results and idempotent repeat', async () => {
    // 1. Initial publication
    const res1 = await asUser(db, IDS.examAdminA, async () => {
      const q = await db.query<{ rpc_publish_assessment_results: any }>(`
        SELECT public.rpc_publish_assessment_results('${IDS.assessmentEndterm}'::uuid);
      `);
      return q.rows[0].rpc_publish_assessment_results;
    });

    assert.equal(res1.success, true);
    assert.equal(res1.status, 'published');
    assert.equal(res1.result_count, 2);

    // Verify audit log
    const audit = await db.query<{ action: string; entity_id: string }>(`
      SELECT action, entity_id FROM public.audit_events
      WHERE entity_name = 'assessments' AND entity_id = '${IDS.assessmentEndterm}'
      ORDER BY id DESC LIMIT 1;
    `);
    assert.equal(audit.rows[0].action, 'PUBLISH_ASSESSMENT');

    // 2. Second publication call is idempotent
    const res2 = await asUser(db, IDS.examAdminA, async () => {
      const q = await db.query<{ rpc_publish_assessment_results: any }>(`
        SELECT public.rpc_publish_assessment_results('${IDS.assessmentEndterm}'::uuid);
      `);
      return q.rows[0].rpc_publish_assessment_results;
    });

    assert.equal(res2.success, true);
    assert.equal(res2.is_duplicate, true);
    assert.equal(res2.status, 'published');
  });
});
