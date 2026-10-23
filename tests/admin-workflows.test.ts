import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminService,
  parseCsvRows,
  type AdminKpiMetric,
  type HistorySafetyCheckResult,
  type StudentImportRecord,
  type BulkImportResult,
} from '../src/lib/services/admin-service.ts';
import {
  calculateFeeBalance,
  formatMinorUnits,
} from '../src/lib/calculations/index.ts';

// ============================================================================
// 1. ADMIN OVERVIEW COMMAND CENTER & KPI TESTS
// ============================================================================
test('Admin Command Center: Overview KPIs & Sparkline Metrics', async (t) => {
  await t.test('Overview summary returns all 6 mandatory KPIs with sparklines and deep-links', async () => {
    const summary = await AdminService.getOverviewSummary();

    assert.ok(summary.kpis.length === 6, 'Must return exactly 6 primary KPI metrics');

    const expectedIds = [
      'kpi-enrollment',
      'kpi-faculty',
      'kpi-attendance',
      'kpi-published-results',
      'kpi-fee-collection',
      'kpi-pending-approvals',
    ];

    for (const id of expectedIds) {
      const metric = summary.kpis.find((k) => k.id === id);
      assert.ok(metric, `Missing metric with id "${id}"`);
      assert.ok(metric!.title.length > 0, 'Metric must have non-empty title');
      assert.ok(metric!.formattedValue.length > 0, 'Metric must have formatted value');
      assert.ok(typeof metric!.deltaPercent === 'number', 'Metric must have delta percent');
      assert.ok(metric!.period.length > 0, 'Metric must have documented period');
      assert.ok(metric!.definition.length > 0, 'Metric must have documented definition');
      assert.ok(metric!.deepLink.startsWith('/admin/'), 'Metric must deep-link to /admin sub-route');
      assert.ok(metric!.sparkline.length >= 7, 'Metric must have at least 7 sparkline data points');
    }
  });

  await t.test('Specific KPI values and delta changes match institutional baselines', async () => {
    const summary = await AdminService.getOverviewSummary();

    const enrollment = summary.kpis.find((k) => k.id === 'kpi-enrollment')!;
    assert.equal(enrollment.value, 1248);
    assert.equal(enrollment.deepLink, '/admin/students');
    assert.equal(enrollment.isPositiveTrend, true);

    const faculty = summary.kpis.find((k) => k.id === 'kpi-faculty')!;
    assert.equal(faculty.value, 78);
    assert.equal(faculty.deepLink, '/admin/faculty');

    const attendance = summary.kpis.find((k) => k.id === 'kpi-attendance')!;
    assert.equal(attendance.formattedValue, '84.3%');
    assert.equal(attendance.deepLink, '/admin/attendance');

    const fee = summary.kpis.find((k) => k.id === 'kpi-fee-collection')!;
    assert.equal(fee.deepLink, '/admin/fees');
    assert.ok(fee.deltaPercent > 0);

    const approvals = summary.kpis.find((k) => k.id === 'kpi-pending-approvals')!;
    assert.equal(approvals.deepLink, '/admin/approvals');
    assert.equal(approvals.deltaDirection, 'down');
  });

  await t.test('Overview returns collection and attendance trend datasets', async () => {
    const summary = await AdminService.getOverviewSummary();
    assert.ok(summary.collectionTrends.length >= 4);
    assert.ok(summary.attendanceTrends.length >= 4);
    assert.ok(summary.quickActions.length >= 4);
  });
});

// ============================================================================
// 2. INSTITUTION STRUCTURE & HISTORY SAFETY TESTS
// ============================================================================
test('Institution Structure: Departments, Courses & History Safety Guards', async (t) => {
  await t.test('Departments list returns active departments with student and faculty counts', async () => {
    const depts = await AdminService.getDepartments();
    assert.ok(depts.length >= 3);
    const cse = depts.find((d) => d.code === 'CSE');
    assert.ok(cse);
    assert.equal(cse!.name, 'Computer Science & Engineering');
    assert.equal(cse!.status, 'Active');
    assert.ok(cse!.studentCount > 0);
    assert.ok(cse!.facultyCount > 0);
  });

  await t.test('Department with historical records BLOCKS destructive deletion', async () => {
    const safety = await AdminService.checkDestructiveSafety('department', 'dept-cse-01');

    assert.equal(safety.allowed, false, 'Deletion must be blocked when historical records exist');
    assert.equal(safety.recommendedAction, 'deactivate');
    assert.ok(safety.dependencies.activeEnrollmentsCount > 0);
    assert.ok(safety.dependencies.attendanceSessionsCount > 0);
    assert.ok(safety.reason?.includes('corrupt'));

    // Attempting deleteDepartment directly must throw safety error
    await assert.rejects(
      async () => {
        await AdminService.deleteDepartment('dept-cse-01');
      },
      /history safety/i
    );
  });

  await t.test('Subject with active syllabus and assessment marks BLOCKS destructive deletion', async () => {
    const safety = await AdminService.checkDestructiveSafety('subject', 'sub-cd-601');

    assert.equal(safety.allowed, false, 'Subject with historical marks cannot be deleted');
    assert.equal(safety.recommendedAction, 'deactivate');
    assert.ok(safety.dependencies.attendanceSessionsCount > 0);
    assert.ok(safety.dependencies.examinationMarksCount > 0);
    assert.ok(safety.reason?.includes('Cannot delete subject'));
  });

  await t.test('Soft deactivation of department sets status to Inactive and logs audit event', async () => {
    const depts = await AdminService.getDepartments();
    const meDept = depts.find((d) => d.code === 'ME');
    assert.ok(meDept);

    const deactivated = await AdminService.deactivateDepartment(meDept!.id);
    assert.equal(deactivated.status, 'Inactive');

    const auditLogs = await AdminService.getAuditEvents({ entityTable: 'departments' });
    const log = auditLogs.find((l) => l.entityId === meDept!.id && l.action === 'UPDATE');
    assert.ok(log, 'Audit log must record department deactivation');
  });

  await t.test('Creating new department validates uniqueness and required fields', async () => {
    await assert.rejects(
      async () => {
        await AdminService.createDepartment({ name: '', code: '', hodName: '', email: '', phone: '' });
      },
      /required/i
    );

    await assert.rejects(
      async () => {
        await AdminService.createDepartment({ name: 'Duplicate CSE', code: 'CSE', hodName: '', email: '', phone: '' });
      },
      /already exists/i
    );

    const created = await AdminService.createDepartment({
      name: 'Biotechnology Engineering',
      code: 'BT',
      hodName: 'Dr. Priya Sharma',
      email: 'hod.bt@campusos.dev',
      phone: '+91 98100 99999',
    });

    assert.equal(created.code, 'BT');
    assert.equal(created.status, 'Active');
  });
});

// ============================================================================
// 3. PEOPLE MANAGEMENT & BULK IMPORT DRY-RUN TESTS
// ============================================================================
test('People Management: Student & Faculty Registry with Dry-Run Bulk Import', async (t) => {
  await t.test('Student creation enforces ID uniqueness and email validation', async () => {
    await assert.rejects(
      async () => {
        await AdminService.createStudent({
          studentId: 'EN2023CSE042', // duplicate ID
          firstName: 'Duplicate',
          lastName: 'Student',
          email: 'duplicate.unique@campusos.dev',
          phone: '',
          departmentCode: 'CSE',
          courseCode: 'BTECH-CSE',
          semester: 1,
          section: 'A',
        });
      },
      /already exists/i
    );

    await assert.rejects(
      async () => {
        await AdminService.createStudent({
          studentId: 'EN2024UNIQUE',
          firstName: 'Duplicate',
          lastName: 'Student',
          email: 'aarav.patel@campusos.dev', // duplicate email
          phone: '',
          departmentCode: 'CSE',
          courseCode: 'BTECH-CSE',
          semester: 1,
          section: 'A',
        });
      },
      /already registered/i
    );
  });

  await t.test('Student soft-deactivation and reactivation retains student record', async () => {
    const stu = await AdminService.createStudent({
      studentId: 'EN2024SOFT01',
      firstName: 'Karan',
      lastName: 'Kapoor',
      email: 'karan.kapoor@campusos.dev',
      phone: '+91 98765 11111',
      departmentCode: 'CSE',
      courseCode: 'BTECH-CSE',
      semester: 2,
      section: 'B',
    });

    assert.equal(stu.status, 'Active');

    const deactivated = await AdminService.deactivateStudent(stu.id);
    assert.equal(deactivated.status, 'Inactive');

    const reactivated = await AdminService.reactivateStudent(stu.id);
    assert.equal(reactivated.status, 'Active');

    const logs = await AdminService.getAuditEvents({ entityTable: 'students' });
    const updateLogs = logs.filter((l) => l.entityId === stu.id);
    assert.ok(updateLogs.length >= 2, 'Audit trail must record both deactivation and reactivation');
  });

  await t.test('Bulk Student Import Dry-Run: Validates CSV headers and identifies format errors', async () => {
    const invalidHeaderCsv = `id,name,email
1,Test,test@campusos.dev`;

    const res = AdminService.validateStudentBulkImport(invalidHeaderCsv);
    assert.equal(res.dryRun, true);
    assert.equal(res.validRows, 0);
    assert.ok(res.errors.length > 0);
    assert.ok(res.errors[0].reason.includes('Missing required header'));
  });

  await t.test('Bulk Student Import Dry-Run: Detects intra-file duplicate IDs and invalid foreign keys', async () => {
    const csvWithErrors = `student_id,first_name,last_name,email,department_code,course_code,semester,section
EN2024CSE801,Ishaan,Sharma,ishaan.sharma@campusos.dev,CSE,BTECH-CSE,2,A
EN2024CSE801,DuplicateId,Row,dup.id@campusos.dev,CSE,BTECH-CSE,2,A
EN2024CSE803,Invalid,Dept,inv.dept@campusos.dev,NONEXISTENT_DEPT,BTECH-CSE,2,A
EN2024CSE804,Bad,Email,not-an-email,CSE,BTECH-CSE,2,A
EN2024CSE805,Bad,Semester,bad.sem@campusos.dev,CSE,BTECH-CSE,15,A`;

    const res = AdminService.validateStudentBulkImport(csvWithErrors);
    assert.equal(res.totalRows, 5);
    assert.equal(res.validRows, 1);
    assert.equal(res.invalidRows, 4);

    // Check itemized errors
    const dupErr = res.errors.find((e) => e.column === 'student_id' && e.value === 'EN2024CSE801');
    assert.ok(dupErr, 'Must flag intra-file duplicate student ID');
    assert.ok(dupErr?.reason.includes('Duplicate'));

    const deptErr = res.errors.find((e) => e.column === 'department_code');
    assert.ok(deptErr, 'Must flag unrecognized department code');

    const emailErr = res.errors.find((e) => e.column === 'email');
    assert.ok(emailErr, 'Must flag invalid email format');

    const semErr = res.errors.find((e) => e.column === 'semester');
    assert.ok(semErr, 'Must flag invalid semester integer out of bounds');
  });

  await t.test('Bulk Student Import: Commits only validated records and updates registry', async () => {
    const validCsv = `student_id,first_name,last_name,email,department_code,course_code,semester,section
EN2024CSE901,Ananya,Vaidya,ananya.vaidya@campusos.dev,CSE,BTECH-CSE,2,A
EN2024CSE902,Aryan,Chopra,aryan.chopra@campusos.dev,CSE,BTECH-CSE,2,B`;

    const dryRun = AdminService.validateStudentBulkImport(validCsv);
    assert.equal(dryRun.validRows, 2);
    assert.equal(dryRun.invalidRows, 0);

    const commitResult = await AdminService.commitStudentBulkImport(dryRun.parsedRecords);
    assert.equal(commitResult.committedCount, 2);

    // Verify presence in student directory
    const students = await AdminService.getStudents({ search: 'Ananya Vaidya' });
    assert.ok(students.length >= 1);
    assert.equal(students[0].studentId, 'EN2024CSE901');
  });

  await t.test('RFC 4180 CSV parser handles inner commas, double quotes, and CRLF line endings', () => {
    const rawCsv = `"student_id","first_name","last_name","email","department_code","course_code","semester","section"\r\n"EN2024CSE991","Smith, Jr.","John","john.smith@campusos.dev","CSE","BTECH-CSE",2,"Room ""A"", 101"`;
    const parsed = parseCsvRows(rawCsv);

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0][0], 'student_id');
    assert.equal(parsed[1][0], 'EN2024CSE991');
    assert.equal(parsed[1][1], 'Smith, Jr.'); // Preserves inner comma inside quotes
    assert.equal(parsed[1][7], 'Room "A", 101'); // Preserves unescaped double quotes and inner comma
  });

  await t.test('Student record editing updates fields, enforces unique email, and logs audit event', async () => {
    const stu = await AdminService.createStudent({
      studentId: 'EN2024EDIT01',
      firstName: 'Riya',
      lastName: 'Mehta',
      email: 'riya.mehta@campusos.dev',
      phone: '+91 99999 11111',
      departmentCode: 'CSE',
      courseCode: 'BTECH-CSE',
      semester: 1,
      section: 'A',
    });

    // Valid update
    const updated = await AdminService.updateStudent(stu.id, {
      phone: '+91 99999 22222',
      semester: 2,
      section: 'B',
    });
    assert.equal(updated.phone, '+91 99999 22222');
    assert.equal(updated.semester, 2);
    assert.equal(updated.section, 'B');

    // Duplicate email collision with another student must be rejected
    await assert.rejects(
      async () => {
        await AdminService.updateStudent(stu.id, {
          email: 'aarav.patel@campusos.dev',
        });
      },
      /already registered/i
    );

    // Audit trail verification
    const logs = await AdminService.getAuditEvents({ entityTable: 'students' });
    const editLog = logs.find((l) => l.entityId === stu.id && l.action === 'UPDATE');
    assert.ok(editLog, 'Must record UPDATE audit event for student edit');
  });

  await t.test('Faculty record editing updates fields, enforces unique email, and logs audit event', async () => {
    const fac = await AdminService.createFaculty({
      facultyId: 'FAC-EDIT-01',
      firstName: 'Sunil',
      lastName: 'Gavaskar',
      email: 'sunil.gavaskar@campusos.dev',
      phone: '+91 98888 11111',
      departmentCode: 'CSE',
      designation: 'Assistant Professor',
      cabin: 'Cabin 101',
    });

    // Valid update
    const updated = await AdminService.updateFaculty(fac.id, {
      designation: 'Associate Professor',
      cabin: 'Room 402, Block C',
    });
    assert.equal(updated.designation, 'Associate Professor');
    assert.equal(updated.cabin, 'Room 402, Block C');

    // Duplicate email collision with another faculty member must be rejected
    await assert.rejects(
      async () => {
        await AdminService.updateFaculty(fac.id, {
          email: 'ananya.sen@campusos.dev',
        });
      },
      /already registered/i
    );

    // Audit trail verification
    const logs = await AdminService.getAuditEvents({ entityTable: 'faculty' });
    const editLog = logs.find((l) => l.entityId === fac.id && l.action === 'UPDATE');
    assert.ok(editLog, 'Must record UPDATE audit event for faculty edit');
  });

  await t.test('Faculty soft-deactivation and reactivation retains record with audit history', async () => {
    const fac = await AdminService.createFaculty({
      facultyId: 'FAC-REACT-01',
      firstName: 'Vinod',
      lastName: 'Kambli',
      email: 'vinod.kambli@campusos.dev',
      phone: '+91 97777 22222',
      departmentCode: 'ECE',
      designation: 'Assistant Professor',
      cabin: 'Room 205',
    });

    assert.equal(fac.status, 'Active');

    const deactivated = await AdminService.deactivateFaculty(fac.id);
    assert.equal(deactivated.status, 'Inactive');

    const reactivated = await AdminService.reactivateFaculty(fac.id);
    assert.equal(reactivated.status, 'Active');

    const logs = await AdminService.getAuditEvents({ entityTable: 'faculty' });
    const facLogs = logs.filter((l) => l.entityId === fac.id);
    assert.ok(facLogs.length >= 2, 'Audit trail must record both deactivation and reactivation');
  });

  await t.test('Bulk Faculty Import Dry-Run: Validates headers, detects duplicate IDs/emails, and invalid department codes', async () => {
    const invalidHeaderCsv = `id,name,email\n1,Test,test@campusos.dev`;
    const resHeader = AdminService.validateFacultyBulkImport(invalidHeaderCsv);
    assert.equal(resHeader.validRows, 0);
    assert.ok(resHeader.errors[0].reason.includes('Missing required header'));

    const facultyCsvWithErrors = `faculty_id,first_name,last_name,email,department_code,designation,cabin
FAC-BULK-01,Vikram,Batra,vikram.batra@campusos.dev,CSE,Professor,Room 101
FAC-BULK-01,Duplicate,Id,dup.fac@campusos.dev,CSE,Associate Professor,Room 102
FAC-BULK-02,Invalid,Dept,inv.dept@campusos.dev,UNKNOWN_DEPT,Professor,Room 103
FAC-BULK-03,Bad,Email,invalid-email-address,CSE,Professor,Room 104`;

    const res = AdminService.validateFacultyBulkImport(facultyCsvWithErrors);
    assert.equal(res.totalRows, 4);
    assert.equal(res.validRows, 1);
    assert.equal(res.invalidRows, 3);

    const dupErr = res.errors.find((e) => e.column === 'faculty_id' && e.value === 'FAC-BULK-01');
    assert.ok(dupErr, 'Must flag intra-file duplicate faculty ID');

    const deptErr = res.errors.find((e) => e.column === 'department_code');
    assert.ok(deptErr, 'Must flag unrecognized department code');

    const emailErr = res.errors.find((e) => e.column === 'email');
    assert.ok(emailErr, 'Must flag invalid email format');
  });

  await t.test('Bulk Faculty Import: Commits validated records with quoted fields and updates directory', async () => {
    const validFacultyCsv = `"faculty_id","first_name","last_name","email","department_code","designation","cabin"
"FAC-VALID-91","Harish","Nambiar","harish.nambiar@campusos.dev","CSE","Professor","Room 501, Academic Block A"
"FAC-VALID-92","Sunita","Menon","sunita.menon@campusos.dev","ECE","Assistant Professor","Room 204, Block B"`;

    const dryRun = AdminService.validateFacultyBulkImport(validFacultyCsv);
    assert.equal(dryRun.validRows, 2);
    assert.equal(dryRun.invalidRows, 0);
    assert.equal(dryRun.parsedRecords[0].cabin, 'Room 501, Academic Block A');

    const commitResult = await AdminService.commitFacultyBulkImport(dryRun.parsedRecords);
    assert.equal(commitResult.committedCount, 2);

    const faculty = await AdminService.getFaculty({ search: 'Harish Nambiar' });
    assert.ok(faculty.length >= 1);
    assert.equal(faculty[0].facultyId, 'FAC-VALID-91');
    assert.equal(faculty[0].cabin, 'Room 501, Academic Block A');
  });
});

// ============================================================================
// 4. FINANCE COMMAND CENTER & DOUBLE-ENTRY TESTS
// ============================================================================
test('Finance Command Center: Fee Structures, Concessions & Idempotent Payments', async (t) => {
  await t.test('Fee structure total matches integer minor units sum', async () => {
    const struct = await AdminService.createFeeStructure({
      name: 'M.Tech AI Semester 1 Structure',
      courseCode: 'MTECH-AI',
      semester: 1,
      academicYear: '2026-2027',
      tuitionFeeMinor: 6000000,
      devFeeMinor: 1500000,
      labFeeMinor: 1000000,
      examFeeMinor: 500000,
      libraryFeeMinor: 200000,
      dueDate: '2026-09-15',
    });

    assert.equal(struct.totalFeeMinor, 9200000); // ₹92,000.00
    assert.equal(formatMinorUnits(struct.totalFeeMinor), '₹92,000.00');
  });

  await t.test('Student fee assignment computes double-entry balance correctly', async () => {
    const assignments = await AdminService.getStudentFeeAssignments();
    const aarav = assignments.find((a) => a.studentCode === 'EN2023CSE042');
    assert.ok(aarav);

    assert.equal(aarav!.assignedFeeMinor, 7500000); // ₹75,000.00
    assert.equal(aarav!.concessionMinor, 500000);   // ₹5,000.00
    assert.equal(aarav!.netPayableMinor, 7000000);  // ₹70,000.00
    assert.equal(aarav!.verifiedPaidMinor, 4000000); // ₹40,000.00
    assert.equal(aarav!.outstandingMinor, 3000000);  // ₹30,000.00
    assert.equal(aarav!.isFullyPaid, false);
  });

  await t.test('Applying fee concession enforces concession <= assigned fee', async () => {
    // Attempting concession greater than assigned fee must be rejected
    await assert.rejects(
      async () => {
        await AdminService.applyFeeConcession('sfa-001', 8000000, 'Excess concession');
      },
      /cannot exceed/i
    );

    // Negative concession must be rejected
    await assert.rejects(
      async () => {
        await AdminService.applyFeeConcession('sfa-001', -500, 'Negative concession');
      },
      /cannot be negative/i
    );

    // Valid concession updates net payable and outstanding balance
    const updated = await AdminService.applyFeeConcession('sfa-001', 1000000, 'Upgraded merit concession');
    assert.equal(updated.concessionMinor, 1000000);
    assert.equal(updated.netPayableMinor, 6500000); // 7500000 - 1000000
    assert.equal(updated.outstandingMinor, 2500000); // 6500000 - 4000000
  });

  await t.test('Offline fee payment recording is strictly idempotent', async () => {
    const key = `idem-test-key-${Date.now()}`;
    const firstPayment = await AdminService.recordFeePayment('sfa-003', 2500000, 'UPI', key);

    assert.ok(firstPayment.id);
    assert.equal(firstPayment.status, 'verified');
    assert.equal(firstPayment.amountMinorUnits, 2500000);

    // Second call with same idempotency key must return the exact same receipt without re-crediting
    const secondPayment = await AdminService.recordFeePayment('sfa-003', 2500000, 'UPI', key);
    assert.equal(secondPayment.id, firstPayment.id);
    assert.equal(secondPayment.transactionReference, firstPayment.transactionReference);
  });

  await t.test('Finance analytics computes collection rate and aging buckets', async () => {
    const analytics = await AdminService.getFinanceAnalytics();
    assert.ok(analytics.totalAssignedMinor > 0);
    assert.ok(analytics.totalCollectedMinor > 0);
    assert.ok(analytics.collectionRatePercent > 0 && analytics.collectionRatePercent <= 100);
    assert.ok(typeof analytics.agingBreakdown.lessThan30dMinor === 'number');
    assert.ok(typeof analytics.agingBreakdown.thirtyToSixtyMinor === 'number');
  });
});

// ============================================================================
// 5. EXAMINATIONS MANAGEMENT & PUBLICATION GATES
// ============================================================================
test('Examinations Desk: Grading Scales & rpc_publish_assessment_results Protocol', async (t) => {
  await t.test('Versioned 10-point grading scale matches UGC standards', async () => {
    const grading = await AdminService.getGradingScales();
    assert.equal(grading.version, '2026.1-UGC');
    assert.ok(grading.scales.length === 7);

    const oGrade = grading.scales.find((s) => s.grade === 'O')!;
    assert.equal(oGrade.gradePoint, 10);
    assert.equal(oGrade.minPercent, 90);
    assert.equal(oGrade.maxPercent, 100);

    const fGrade = grading.scales.find((s) => s.grade === 'F')!;
    assert.equal(fGrade.gradePoint, 0);
    assert.equal(fGrade.minPercent, 0);
    assert.equal(fGrade.maxPercent, 39);
  });

  await t.test('Publishing a DRAFT assessment is strictly REJECTED', async () => {
    await assert.rejects(
      async () => {
        await AdminService.publishAssessmentResults('asm-draft-cs603');
      },
      /Status is currently "draft"/i
    );
  });

  await t.test('Publishing a SUBMITTED assessment succeeds and is IDEMPOTENT', async () => {
    const res = await AdminService.publishAssessmentResults('asm-mid-cs601');
    assert.equal(res.success, true);
    assert.equal(res.assessment.status, 'published');
    assert.ok(res.assessment.publishedAt !== undefined);

    // Repeat publication call (must succeed idempotently)
    const idempotentRes = await AdminService.publishAssessmentResults('asm-mid-cs601');
    assert.equal(idempotentRes.success, true);
    assert.ok(idempotentRes.message.includes('idempotent'));

    // Check audit event
    const auditLogs = await AdminService.getAuditEvents({ entityTable: 'assessments' });
    const log = auditLogs.find((l) => l.entityId === 'asm-mid-cs601' && l.action === 'PUBLISH');
    assert.ok(log, 'Must record PUBLISH audit event in forensic log');
  });

  await t.test('Backlog roster and marks correction history are tracked', async () => {
    const backlogs = await AdminService.getBacklogStudents();
    assert.ok(backlogs.length >= 1);
    assert.equal(backlogs[0].subjectCode, 'CS502');

    const corrections = await AdminService.getMarksCorrectionHistory();
    assert.ok(corrections.length >= 1);
    assert.equal(corrections[0].oldMarks, 44);
    assert.equal(corrections[0].newMarks, 47);
  });
});

// ============================================================================
// 6. UNIFIED APPROVALS & COMMUNICATIONS TESTS
// ============================================================================
test('Unified Approvals & Communications: Multi-Category Review & Broadcasts', async (t) => {
  await t.test('Unified queue aggregates leaves, certificates, and concessions', async () => {
    const approvals = await AdminService.getUnifiedApprovals();
    assert.ok(approvals.length >= 3);

    const categories = new Set(approvals.map((a) => a.category));
    assert.ok(categories.has('leave'));
    assert.ok(categories.has('service_certificate'));
    assert.ok(categories.has('fee_concession'));
  });

  await t.test('Actioning an approval requires non-empty decision comment', async () => {
    await assert.rejects(
      async () => {
        await AdminService.actionApproval('appr-01', 'approve', '');
      },
      /decision comment is required/i
    );

    const approved = await AdminService.actionApproval(
      'appr-02',
      'approve',
      'Verified bonafide requirements with registrar office.'
    );
    assert.equal(approved.status, 'approved');
    assert.equal(approved.decisionComment, 'Verified bonafide requirements with registrar office.');
  });

  await t.test('Bulk approve action validates non-empty selection and decision comment', async () => {
    await assert.rejects(
      async () => {
        await AdminService.bulkActionApprovals([], 'approve', 'comment');
      },
      /No items selected/i
    );

    await assert.rejects(
      async () => {
        await AdminService.bulkActionApprovals(['appr-01', 'appr-03'], 'approve', '');
      },
      /comment is required/i
    );
  });

  await t.test('Creating announcements enforces required title, content, and targets audience', async () => {
    await assert.rejects(
      async () => {
        await AdminService.createAnnouncement({ title: '', content: '', priority: 'Normal', category: 'Institution', targetAudience: 'All' });
      },
      /cannot be empty/i
    );

    const ann = await AdminService.createAnnouncement({
      title: 'Annual Tech Symposium 2026',
      content: 'Call for papers open for all CSE and ECE students.',
      priority: 'Important',
      category: 'Department',
      targetAudience: 'Students',
    });

    assert.equal(ann.priority, 'Important');
    assert.equal(ann.targetAudience, 'Students');
    assert.ok(ann.reachCount > 0);
  });
});

// ============================================================================
// 7. GOVERNANCE, PERMISSION VISUAL DIFF & AUDIT TESTS
// ============================================================================
test('Governance & Permissions: Visual Diffing & Forensic Audit Trail', async (t) => {
  await t.test('Permission diff generator detects added, removed, and unchanged permissions', () => {
    const oldMatrix = {
      'Academic Admin': {
        Academics: { create: true, read: true, update: true, delete: false, approve: true },
        Students: { create: true, read: true, update: true, delete: false, approve: true },
      },
    };

    const newMatrix = {
      'Academic Admin': {
        Academics: { create: true, read: true, update: true, delete: true, approve: true }, // Added delete
        Students: { create: false, read: true, update: true, delete: false, approve: true }, // Removed create
      },
    };

    const diff = AdminService.calculatePermissionDiff(oldMatrix, newMatrix, 'Academic Admin');

    assert.equal(diff.role, 'Academic Admin');
    assert.deepEqual(diff.addedPermissions, ['Academics.DELETE']);
    assert.deepEqual(diff.removedPermissions, ['Students.CREATE']);
    assert.ok(diff.unchangedCount > 0);
  });

  await t.test('Audit event logger stores structured forensic records with before/after state', async () => {
    const event = await AdminService.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'system_settings',
      entityId: 'global_config',
      beforeState: { attendanceThresholdPercent: 75.0 },
      afterState: { attendanceThresholdPercent: 80.0 },
    });

    assert.ok(event.id.startsWith('aud-'));
    assert.equal(event.action, 'UPDATE');
    assert.equal(event.entityTable, 'system_settings');
    assert.equal(event.beforeState?.attendanceThresholdPercent, 75.0);
    assert.equal(event.afterState?.attendanceThresholdPercent, 80.0);
    assert.ok(event.timestamp !== undefined);
  });
});
