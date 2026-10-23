import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FacultyService,
  type FacultyConsoleSummary,
  type ScopedStudent,
  type AttendanceStatus,
  type AssessmentRecordItem,
} from '../src/lib/services/faculty-service.ts';
import {
  calculateGradeFromMarks,
  calculateAttendanceMetrics,
} from '../src/lib/calculations/index.ts';

// ============================================================================
// 1. FACULTY CONSOLE & DASHBOARD SUMMARY TESTS
// ============================================================================
test('Faculty Console: Dashboard Overview & Authoritative Data Strip', async (t) => {
  await t.test('Console summary returns accurate faculty profile, cabin, and academic session', async () => {
    const summary = await FacultyService.getConsoleSummary();

    assert.equal(summary.faculty.name, 'Dr. Vikram Mehta');
    assert.equal(summary.faculty.employeeCode, 'FAC-CS-001');
    assert.equal(summary.faculty.departmentCode, 'CSE');
    assert.equal(summary.faculty.academicSession, '2025-2026');
    assert.ok(summary.faculty.cabin.includes('302'));
  });

  await t.test('Today schedule contains classes with exact attendance deep-links', async () => {
    const summary = await FacultyService.getConsoleSummary();

    assert.ok(summary.todaySchedule.length >= 2);
    const nextClass = summary.todaySchedule.find((c) => c.isNext);
    assert.ok(nextClass, 'Must flag next scheduled teaching class');
    assert.equal(nextClass?.subjectCode, 'CS601');
    assert.match(nextClass?.deepLink || '', /^\/faculty\/attendance\?sessionId=/);
    assert.ok(nextClass!.enrolledCount >= 60);
  });

  await t.test('Attendance action tasks deep-link directly to session workspace', async () => {
    const summary = await FacultyService.getConsoleSummary();

    assert.ok(summary.attendanceTasks.length >= 2);
    for (const task of summary.attendanceTasks) {
      assert.ok(task.sessionId.length > 0);
      assert.ok(task.subjectCode.length > 0);
      assert.match(task.deepLink, /^\/faculty\/attendance\?sessionId=/);
      assert.ok(task.totalStudents > 0);
    }
  });

  await t.test('Pending leaves queue summary highlights attendance risk applicants (<75%)', async () => {
    const summary = await FacultyService.getConsoleSummary();

    assert.ok(summary.pendingLeavesSummary.totalPending >= 1);
    const urgentItem = summary.pendingLeavesSummary.items.find((i) => i.isUrgent);
    assert.ok(urgentItem, 'Must flag leave request with attendance shortage risk');
    assert.equal(urgentItem?.studentName, 'Diya Kaur');
  });

  await t.test('Grading deadlines list pending evaluations with due dates', async () => {
    const summary = await FacultyService.getConsoleSummary();

    assert.ok(summary.gradingDeadlines.length >= 2);
    for (const task of summary.gradingDeadlines) {
      assert.ok(task.pendingEvaluations >= 0);
      assert.ok(task.dueDate.length > 0);
      assert.ok(['draft', 'submitted', 'reviewed', 'published'].includes(task.status));
    }
  });
});

// ============================================================================
// 2. SCOPED STUDENT DIRECTORY TESTS
// ============================================================================
test('Faculty Directory: Scoped Roster Isolation & Risk Tracking', async (t) => {
  await t.test('Returns only students within faculty department and assigned sections', async () => {
    const students = await FacultyService.getScopedStudents();

    assert.ok(students.length >= 150, 'Scoped roster contains 150+ students across Section A & B');
    for (const s of students) {
      assert.equal(s.department, 'Computer Science & Engineering');
      assert.ok(s.section === 'Section A' || s.section === 'Section B');
      assert.ok(s.rollNo.startsWith('23CSE'));
      assert.ok(s.attendancePercentage >= 0 && s.attendancePercentage <= 100);
      assert.ok(s.cgpa >= 0 && s.cgpa <= 10.0);
    }
  });

  await t.test('Filters students by section accurately', async () => {
    const secA = await FacultyService.getScopedStudents('00000000-0000-0000-0000-000000000020', {
      section: 'Section A',
    });
    const secB = await FacultyService.getScopedStudents('00000000-0000-0000-0000-000000000020', {
      section: 'Section B',
    });

    assert.ok(secA.length > 0);
    assert.ok(secB.length > 0);
    assert.ok(secA.every((s) => s.section === 'Section A'));
    assert.ok(secB.every((s) => s.section === 'Section B'));
  });

  await t.test('Filters students by batch accurately', async () => {
    const batchStudents = await FacultyService.getScopedStudents('00000000-0000-0000-0000-000000000020', {
      batch: '2023-2027',
    });
    assert.ok(batchStudents.length > 0);
    assert.ok(batchStudents.every((s) => s.batch === '2023-2027'));
  });

  await t.test('Filters students by attendance risk status (<75%)', async () => {
    const atRisk = await FacultyService.getScopedStudents('00000000-0000-0000-0000-000000000020', {
      status: 'at_risk',
    });

    assert.ok(atRisk.length > 0);
    assert.ok(atRisk.every((s) => s.isShortage && s.attendancePercentage < 75.0));
  });

  await t.test('Search matches student name, roll number, or enrolment number', async () => {
    const byName = await FacultyService.getScopedStudents('00000000-0000-0000-0000-000000000020', {
      search: 'Aarav Patel',
    });
    assert.ok(byName.length >= 1);
    assert.ok(byName.some((s) => s.rollNo === '23CSE042'));

    const byRoll = await FacultyService.getScopedStudents('00000000-0000-0000-0000-000000000020', {
      search: '23CSE043',
    });
    assert.equal(byRoll.length, 1);
    assert.equal(byRoll[0].name, 'Diya Kaur');

    const byEnrol = await FacultyService.getScopedStudents('00000000-0000-0000-0000-000000000020', {
      search: 'EN2023CSE042',
    });
    assert.equal(byEnrol.length, 1);
    assert.equal(byEnrol[0].rollNo, '23CSE042');
  });
});

// ============================================================================
// 3. ATTENDANCE ENTRY — FLAGSHIP SPEED SCREEN & STATE MACHINE TESTS
// ============================================================================
test('Faculty Attendance: High-Speed Roll Call & Transactional RPC State Machine', async (t) => {
  await t.test('Loads attendance session with 150+ students for high-speed roll call', async () => {
    const session = await FacultyService.getAttendanceSession();

    assert.ok(session.sessionId);
    assert.equal(session.subjectCode, 'CS601');
    assert.ok(session.students.length >= 150, 'Supports 150+ students roster without truncation');
  });

  await t.test('Submit attendance for scheduled session commits state to submitted and increments revision count', async () => {
    const session = await FacultyService.getAttendanceSession('00000000-0000-0000-0000-000000000502');
    assert.equal(session.status, 'scheduled');
    assert.equal(session.revisionCount, 0);

    const records = session.students.map((s, idx) => ({
      student_id: s.studentId,
      status: (idx === 1 ? 'Absent' : idx === 3 ? 'Late' : 'Present') as AttendanceStatus,
    }));

    const result = await FacultyService.submitAttendanceSession({
      sessionId: session.sessionId,
      records,
    });

    assert.equal(result.success, true);
    assert.equal(result.revisionNumber, 1);

    // Verify session updated state
    const updated = await FacultyService.getAttendanceSession(session.sessionId);
    assert.equal(updated.status, 'submitted');
    assert.equal(updated.revisionCount, 1);
    assert.ok(updated.submittedAt !== null);
  });

  await t.test('Correction Flow: Modifying an already submitted session REQUIRES mandatory documented reason', async () => {
    const session = await FacultyService.getAttendanceSession('00000000-0000-0000-0000-000000000501');
    assert.equal(session.status, 'submitted');

    const records = session.students.map((s) => ({
      student_id: s.studentId,
      status: 'Present' as AttendanceStatus,
    }));

    // 1. Missing reason must be rejected per institutional policy
    await assert.rejects(
      async () => {
        await FacultyService.submitAttendanceSession({
          sessionId: session.sessionId,
          records,
          reason: '', // Empty reason
        });
      },
      /CORRECTION_REASON_REQUIRED/
    );

    // 2. Reason with less than 5 characters must be rejected
    await assert.rejects(
      async () => {
        await FacultyService.submitAttendanceSession({
          sessionId: session.sessionId,
          records,
          reason: 'Typo', // Only 4 chars
        });
      },
      /CORRECTION_REASON_REQUIRED/
    );

    // 3. Documented reason succeeds, creates revision history snapshot
    const initialRevCount = session.revisionCount;
    const res = await FacultyService.submitAttendanceSession({
      sessionId: session.sessionId,
      records,
      reason: 'Correction: Student Diya Kaur arrived late with approved medical slip',
    });

    assert.equal(res.success, true);
    assert.equal(res.revisionNumber, initialRevCount + 1);

    const revised = await FacultyService.getAttendanceSession(session.sessionId);
    assert.equal(revised.revisionCount, initialRevCount + 1);
    assert.ok(revised.revisions.length >= 2);
    assert.equal(revised.revisions[0].reason, 'Correction: Student Diya Kaur arrived late with approved medical slip');
  });

  await t.test('Submitting on locked session is rejected', async () => {
    // Attempting to submit non-existent or invalid session
    await assert.rejects(
      async () => {
        await FacultyService.submitAttendanceSession({
          sessionId: '00000000-0000-0000-0000-999999999999',
          records: [],
        });
      },
      /ATTENDANCE_SESSION_NOT_FOUND/
    );
  });

  await t.test('Undo toast workflow: successfully reverts submitted attendance session back to scheduled draft', async () => {
    // Session 503 is scheduled
    const session = await FacultyService.getAttendanceSession('00000000-0000-0000-0000-000000000503');
    const records = session.students.map((s) => ({
      student_id: s.studentId,
      status: 'Present' as AttendanceStatus,
    }));

    // Submit
    const submitRes = await FacultyService.submitAttendanceSession({
      sessionId: session.sessionId,
      records,
    });
    assert.equal(submitRes.success, true);
    assert.equal(submitRes.revisionNumber, 1);

    // Verify submitted
    const submitted = await FacultyService.getAttendanceSession(session.sessionId);
    assert.equal(submitted.status, 'submitted');
    assert.equal(submitted.revisionCount, 1);

    // Undo submission via toast action
    const undoRes = await FacultyService.undoAttendanceSubmission(session.sessionId);
    assert.equal(undoRes.success, true);
    assert.equal(undoRes.status, 'scheduled');
    assert.equal(undoRes.revisionCount, 0);

    // Verify reverted to draft
    const reverted = await FacultyService.getAttendanceSession(session.sessionId);
    assert.equal(reverted.status, 'scheduled');
    assert.equal(reverted.revisionCount, 0);
  });
});

// ============================================================================
// 4. MARKS ENTRY GRID, SPREADSHEET PARSER & DIFF ENGINE TESTS
// ============================================================================
test('Faculty Exams: Marks Entry Grid, UGC Grading Scale & CSV Diagnostics', async (t) => {
  await t.test('UGC 10-Point Scale pure calculation correctly maps marks across all grade tiers', () => {
    // Max marks = 50.0
    // >= 90% (>= 45): O (10.0)
    assert.deepEqual(calculateGradeFromMarks(46.0, 50.0), { percentage: 92.0, grade: 'O', gradePoints: 10.0, description: 'Outstanding' });
    // >= 80% and < 90% (>= 40): A+ (9.0)
    assert.deepEqual(calculateGradeFromMarks(41.0, 50.0), { percentage: 82.0, grade: 'A+', gradePoints: 9.0, description: 'Excellent' });
    // >= 70% and < 80% (>= 35): A (8.0)
    assert.deepEqual(calculateGradeFromMarks(36.0, 50.0), { percentage: 72.0, grade: 'A', gradePoints: 8.0, description: 'Very Good' });
    // >= 60% and < 70% (>= 30): B+ (7.0)
    assert.deepEqual(calculateGradeFromMarks(31.5, 50.0), { percentage: 63.0, grade: 'B+', gradePoints: 7.0, description: 'Good' });
    // >= 50% and < 60% (>= 25): B (6.0)
    assert.deepEqual(calculateGradeFromMarks(27.0, 50.0), { percentage: 54.0, grade: 'B', gradePoints: 6.0, description: 'Above Average' });
    // >= 40% and < 50% (>= 20): C (5.0)
    assert.deepEqual(calculateGradeFromMarks(22.0, 50.0), { percentage: 44.0, grade: 'C', gradePoints: 5.0, description: 'Pass' });
    // < 40% (< 20): F (0.0)
    assert.deepEqual(calculateGradeFromMarks(15.0, 50.0), { percentage: 30.0, grade: 'F', gradePoints: 0.0, description: 'Fail' });

    // Boundary edge cases
    assert.equal(calculateGradeFromMarks(0, 50.0).grade, 'F');
    assert.equal(calculateGradeFromMarks(50.0, 50.0).grade, 'O');
    assert.equal(calculateGradeFromMarks(-5, 50.0).percentage, 0);
  });

  await t.test('CSV / Excel paste parser accepts clean comma and tab separated values', () => {
    const csv = `Roll Number\tMarks\n23CSE042\t44.5\n23CSE043\t38.0`;
    const res = FacultyService.parseMarksCsv(csv, 50.0);

    assert.equal(res.success, true);
    assert.equal(res.parsedCount, 2);
    assert.equal(res.records[0].rollNo, '23CSE042');
    assert.equal(res.records[0].marks, 44.5);
    assert.equal(res.records[1].rollNo, '23CSE043');
    assert.equal(res.records[1].marks, 38.0);
  });

  await t.test('CSV parser handles 3-column format with student names and quoted values', () => {
    const csvWithNames = `Roll Number,Student Name,Marks\n"23CSE042","Aarav Patel","47.5"\n"23CSE043","Diya Kaur","39.0"`;
    const res = FacultyService.parseMarksCsv(csvWithNames, 50.0);

    assert.equal(res.success, true);
    assert.equal(res.parsedCount, 2);
    assert.equal(res.records[0].rollNo, '23CSE042');
    assert.equal(res.records[0].marks, 47.5);
    assert.equal(res.records[1].rollNo, '23CSE043');
    assert.equal(res.records[1].marks, 39.0);
  });

  await t.test('CSV paste parser detects out-of-boundary marks and NaN errors with exact line numbers', () => {
    const badCsv = `23CSE042,55.0\n23CSE043,-4\n23CSE044,AB\n23CSE045,35.0`;
    const res = FacultyService.parseMarksCsv(badCsv, 50.0);

    assert.equal(res.success, false);
    assert.equal(res.errors.length, 3);
    assert.match(res.errors[0].reason, /exceed maximum allowed marks/);
    assert.match(res.errors[1].reason, /cannot be negative/);
    assert.match(res.errors[2].reason, /not a valid number/);
    assert.equal(res.records.length, 1);
    assert.equal(res.records[0].rollNo, '23CSE045');
  });

  await t.test('Diff view calculator detects modified, unchanged, and new records accurately', () => {
    const orig: AssessmentRecordItem[] = [
      { id: '1', studentId: 's1', enrollmentNo: 'EN1', rollNo: '23CSE001', studentName: 'Student 1', marksObtained: 40.0, maxMarks: 50, percentage: 80, grade: 'A+', gradePoints: 9.0, isAbsent: false },
      { id: '2', studentId: 's2', enrollmentNo: 'EN2', rollNo: '23CSE002', studentName: 'Student 2', marksObtained: 30.0, maxMarks: 50, percentage: 60, grade: 'B+', gradePoints: 7.0, isAbsent: false },
    ];

    const proposed = [
      { studentId: 's1', rollNo: '23CSE001', marks: 45.0 }, // modified (+5)
      { studentId: 's2', rollNo: '23CSE002', marks: 30.0 }, // unchanged
    ];

    const diff = FacultyService.calculateMarksDiff(orig, proposed, 50.0);
    assert.equal(diff.length, 2);

    assert.equal(diff[0].status, 'modified');
    assert.equal(diff[0].delta, 5.0);
    assert.equal(diff[0].originalGrade, 'A+');
    assert.equal(diff[0].proposedGrade, 'O');

    assert.equal(diff[1].status, 'unchanged');
    assert.equal(diff[1].delta, 0);
  });

  await t.test('Published assessment results cannot be modified by faculty', async () => {
    // Assessment 411 is published
    await assert.rejects(
      async () => {
        await FacultyService.updateAssessmentMarks({
          assessmentId: '00000000-0000-0000-0000-000000000411',
          records: [{ studentId: 's1', marks: 49 }],
        });
      },
      /ASSESSMENT_ALREADY_PUBLISHED/
    );
  });

  await t.test('Draft assessment can be updated and submitted to exam cell', async () => {
    const assessmentId = '00000000-0000-0000-0000-000000000413';
    const res = await FacultyService.updateAssessmentMarks({
      assessmentId,
      records: [
        { studentId: '00000000-0000-0000-0000-000000000030', marks: 19.5 },
      ],
      status: 'submitted',
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'submitted');

    const updated = await FacultyService.getMarksGrid(assessmentId);
    assert.equal(updated.status, 'submitted');
    const studentRec = updated.records.find((r: any) => r.studentId === '00000000-0000-0000-0000-000000000030');
    assert.equal(studentRec.marksObtained, 19.5);
    assert.equal(studentRec.grade, 'O');
  });
});

// ============================================================================
// 5. LEAVE APPROVALS QUEUE & DECISION POLICIES TESTS
// ============================================================================
test('Faculty Leaves: Split-Pane Approvals & State Machine Rules', async (t) => {
  await t.test('Fetches pending leaves with attendance impact metrics', async () => {
    const queue = await FacultyService.getLeaveRequestsQueue('00000000-0000-0000-0000-000000000020', 'submitted');

    assert.ok(queue.length >= 1);
    for (const item of queue) {
      assert.equal(item.status, 'submitted');
      assert.ok(item.daysCount > 0);
      assert.ok(item.currentAttendancePercent >= 0);
      assert.ok(item.projectedAttendancePercent <= item.currentAttendancePercent);
    }
  });

  await t.test('Approving or rejecting a leave REQUIRES non-empty decision comment', async () => {
    const queue = await FacultyService.getLeaveRequestsQueue('00000000-0000-0000-0000-000000000020', 'submitted');
    const target = queue[0];

    // 1. Approving with empty comment must be rejected
    await assert.rejects(
      async () => {
        await FacultyService.actionLeaveRequest({
          leaveId: target.id,
          status: 'approved',
          decisionComment: '',
        });
      },
      /DECISION_COMMENT_REQUIRED/
    );

    // 2. Rejecting with whitespace comment must be rejected
    await assert.rejects(
      async () => {
        await FacultyService.actionLeaveRequest({
          leaveId: target.id,
          status: 'rejected',
          decisionComment: '   ',
        });
      },
      /DECISION_COMMENT_REQUIRED/
    );

    // 3. Approving with valid comment succeeds
    const res = await FacultyService.actionLeaveRequest({
      leaveId: target.id,
      status: 'approved',
      decisionComment: 'Approved. Advised student to submit lab assignments by Monday.',
    });

    assert.equal(res.success, true);
    assert.equal(res.newStatus, 'approved');

    // 4. Resolved leave cannot transition further
    await assert.rejects(
      async () => {
        await FacultyService.actionLeaveRequest({
          leaveId: target.id,
          status: 'rejected',
          decisionComment: 'Attempting to reject an already approved leave',
        });
      },
      /LEAVE_REQUEST_ALREADY_RESOLVED/
    );
  });
});

// ============================================================================
// 6. DOUBTS INBOX & 2-REOPEN LIMIT POLICY TESTS
// ============================================================================
test('Faculty Doubts: Threaded Resolution & Policy Caps', async (t) => {
  await t.test('Faculty can answer an open doubt with explanation and attachment', async () => {
    const doubts = await FacultyService.getDoubtsQueue();
    const openDoubt = doubts.find((d) => d.status === 'open');
    assert.ok(openDoubt, 'Must have at least one open doubt');

    const replyRes = await FacultyService.replyToDoubt({
      doubtId: openDoubt.id,
      replyText: 'Default Bison shift resolution handles dangling else by preferring shift over reduce.',
      attachmentName: 'lr1_shift_proof.pdf',
    });

    assert.equal(replyRes.success, true);
    assert.equal(replyRes.status, 'answered');
  });

  await t.test('Faculty can resolve doubt ticket', async () => {
    const doubts = await FacultyService.getDoubtsQueue();
    const answeredDoubt = doubts.find((d) => d.status === 'answered');
    assert.ok(answeredDoubt);

    const resolveRes = await FacultyService.resolveDoubt(answeredDoubt.id);
    assert.equal(resolveRes.success, true);
    assert.equal(resolveRes.status, 'resolved');
  });

  await t.test('Enforces 2-reopen limit policy on doubt ticket', async () => {
    const doubts = await FacultyService.getDoubtsQueue();
    const resolvedDoubt = doubts.find((d) => d.status === 'resolved');
    assert.ok(resolvedDoubt);

    // Reopen 1
    const r1 = await FacultyService.reopenDoubt(resolvedDoubt.id, 'Need clarification on Lookahead item');
    assert.equal(r1.reopenCount, 1);
    await FacultyService.resolveDoubt(resolvedDoubt.id);

    // Reopen 2
    const r2 = await FacultyService.reopenDoubt(resolvedDoubt.id, 'One final question on grammar precedence');
    assert.equal(r2.reopenCount, 2);
    await FacultyService.resolveDoubt(resolvedDoubt.id);

    // Attempting Reopen 3 must be rejected per 2-attempt cap
    await assert.rejects(
      async () => {
        await FacultyService.reopenDoubt(resolvedDoubt.id, 'Third reopen should be blocked');
      },
      /REOPEN_LIMIT_EXCEEDED/
    );
  });
});

// ============================================================================
// 7. ASSIGNMENTS, NOTES & GROUPS WORKFLOWS TESTS
// ============================================================================
test('Faculty Coursework: Assignments, Notes & Student Groups', async (t) => {
  await t.test('Create assignment with section targeting and max marks', async () => {
    const newAsg = await FacultyService.createAssignment({
      subjectId: '00000000-0000-0000-0000-000000000351',
      subjectCode: 'CS601',
      subjectName: 'Compiler Design',
      sectionName: 'Section A & B',
      title: 'Intermediate Representation & 3-Address Code Generation',
      description: 'Generate quadruples and triples for conditional while-loops.',
      dueDate: '2026-05-01',
      maxMarks: 50,
      attachments: ['IR_Spec.pdf'],
    });

    assert.ok(newAsg.id);
    assert.equal(newAsg.maxMarks, 50);

    // Empty title must fail
    await assert.rejects(
      async () => {
        await FacultyService.createAssignment({
          subjectId: '00000000-0000-0000-0000-000000000351',
          subjectCode: 'CS601',
          subjectName: 'Compiler Design',
          sectionName: 'Section A',
          title: '',
          description: '',
          dueDate: '2026-05-01',
          maxMarks: 50,
        });
      },
      /TITLE_REQUIRED/
    );
  });

  await t.test('Grade student submission with boundary validation', async () => {
    const res = await FacultyService.gradeSubmission({
      assignmentId: 'asg-01',
      submissionId: 'sub-02',
      marks: 44.0,
      feedback: 'Very thorough test suite and clean lexical scanner.',
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'Graded');
    assert.equal(res.marks, 44.0);

    // Out of bounds marks must fail
    await assert.rejects(
      async () => {
        await FacultyService.gradeSubmission({
          assignmentId: 'asg-01',
          submissionId: 'sub-02',
          marks: 75.0, // Exceeds max 50
        });
      },
      /INVALID_MARKS/
    );
  });

  await t.test('Upload version-controlled course handout', async () => {
    const handout = await FacultyService.uploadHandout({
      subjectId: '00000000-0000-0000-0000-000000000351',
      subjectCode: 'CS601',
      subjectName: 'Compiler Design',
      sectionName: 'Section A',
      title: 'Canonical LR(1) Parsing Tables & Lookahead Propagation',
      description: 'Comprehensive slides and step-by-step table computation manual.',
      fileName: 'CS601_LR1_Guide_v2.pdf',
      fileSizeBytes: 4200000,
      fileType: 'PDF',
      version: 'v2.2',
    });

    assert.ok(handout.id);
    assert.equal(handout.version, 'v2.2');
    assert.equal(handout.isArchived, false);

    // Archive handout
    const arch = await FacultyService.archiveHandout(handout.id);
    assert.equal(arch.success, true);
  });

  await t.test('Create and manage student project groups', async () => {
    const grp = await FacultyService.createGroup({
      name: 'Decentralized Proof-of-Attendance Capstone Team',
      category: 'Project',
      description: 'Building zero-knowledge verifiable credentials for university attendance.',
      sectionName: 'Section A',
      memberStudentIds: [
        '00000000-0000-0000-0000-000000000030',
        '00000000-0000-0000-0000-000000000031',
      ],
    });

    assert.ok(grp.id);
    assert.equal(grp.members.length, 2);
    assert.equal(grp.members[0].role, 'Lead');
    assert.equal(grp.members[1].role, 'Member');
  });
});
