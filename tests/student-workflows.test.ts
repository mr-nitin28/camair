import test from 'node:test';
import assert from 'node:assert/strict';
import {
  StudentService,
  type LeaveRequestRecord,
  type DoubtTicketRecord,
} from '../src/lib/services/student-service.ts';
import {
  calculateAttendanceMetrics,
  calculateSGPA,
  calculateCGPA,
  calculateFeeBalance,
  formatMinorUnits,
} from '../src/lib/calculations/index.ts';

test('Student Workflows: Dashboard Overview & Authoritative Calculations', async (t) => {
  await t.test('Dashboard summary returns accurate student profile and today strip', async () => {
    const summary = await StudentService.getDashboardSummary();

    assert.equal(summary.student.enrollmentNo, 'EN2023CSE042');
    assert.equal(summary.student.name, 'Aarav Patel');
    assert.equal(summary.student.semester, 6);
    assert.ok(summary.todayStrip.classesToday.length > 0);
    assert.ok(summary.todayStrip.nextClass !== null);
    assert.equal(summary.todayStrip.nextClass?.subjectCode, 'CS601');
    assert.ok(typeof summary.todayStrip.pendingItemsCount === 'number');
  });

  await t.test('Attendance ring uses institutional threshold (75%) and calculates recovery/buffer correctly', async () => {
    const summary = await StudentService.getDashboardSummary();
    const overall = summary.attendanceSummary.overall;

    assert.equal(overall.thresholdPercent, 75.0);
    assert.ok(overall.percentage >= 0 && overall.percentage <= 100);
    assert.equal(overall.totalSessions, overall.attendedSessions + overall.absentSessions);

    if (overall.isShortage) {
      assert.ok(overall.classesNeededToRecover > 0);
    } else {
      assert.ok(overall.classesAllowedToMiss >= 0);
    }

    // Verify per-subject summaries
    assert.ok(summary.attendanceSummary.subjects.length >= 5);
    for (const sub of summary.attendanceSummary.subjects) {
      assert.ok(sub.credits > 0);
      assert.ok(sub.metrics.percentage >= 0 && sub.metrics.percentage <= 100);
      assert.equal(sub.metrics.thresholdPercent, 75.0);
    }
  });

  await t.test('Fee summary strictly computes double-entry balance and formats currency in INR', async () => {
    const summary = await StudentService.getDashboardSummary();
    const fee = summary.feeSummary;

    assert.equal(fee.balance.assignedMinorUnits, 7500000); // ₹75,000.00
    assert.equal(fee.balance.concessionMinorUnits, 500000); // ₹5,000.00
    assert.equal(fee.balance.netPayableMinorUnits, 7000000); // ₹70,000.00
    assert.equal(fee.balance.verifiedPaidMinorUnits, 4000000); // ₹40,000.00
    assert.equal(fee.balance.outstandingBalanceMinorUnits, 3000000); // ₹30,000.00
    assert.equal(fee.balance.isFullyPaid, false);

    assert.match(fee.formattedBalance, /₹|INR/);
    assert.match(fee.formattedBalance, /30,000/);
  });

  await t.test('SGPA & CGPA trend reflects authoritative calculation formulas', async () => {
    const summary = await StudentService.getDashboardSummary();
    const acad = summary.academicSummary;

    assert.ok(acad.currentSgpa >= 0 && acad.currentSgpa <= 10.0);
    assert.ok(acad.cgpa >= 0 && acad.cgpa <= 10.0);
    assert.ok(acad.trend.length >= 5);
    assert.equal(acad.totalCreditsEarned, 124);
  });
});

test('Student Workflows: Academics, Attendance Roster & Published Exams', async (t) => {
  await t.test('Attendance history returns itemized logs with status indicators', async () => {
    const details = await StudentService.getAttendanceDetails();

    assert.ok(details.historyLogs.length > 0);
    for (const log of details.historyLogs) {
      assert.ok(['Present', 'Absent', 'Late', 'Excused'].includes(log.status));
      assert.ok(log.slotNumber >= 1);
      assert.ok(log.date.length > 0);
    }
  });

  await t.test('Exam results return student profile, enrolled pending evaluations, and published assessments ONLY', async () => {
    const exams = await StudentService.getExamResults();

    // Student profile & enrollment
    assert.ok(exams.studentProfile);
    assert.equal(exams.studentProfile.name, 'Aarav Patel');
    assert.equal(exams.studentProfile.rollNo, '23CSE042');
    assert.equal(exams.studentProfile.enrolmentNo, 'EN2023CSE042');
    assert.equal(exams.studentProfile.currentSemester, 6);
    assert.equal(exams.studentProfile.gradingScale, 'UGC 10-Point Scale');

    // Enrolled subjects pending evaluation (separate from published grades)
    assert.ok(exams.enrolledPendingSubjects.length > 0);
    for (const pending of exams.enrolledPendingSubjects) {
      assert.equal(pending.status, 'evaluation_pending');
      assert.ok(pending.credits > 0);
      assert.ok(pending.facultyName.length > 0);
    }

    assert.ok(exams.semesters.length >= 2);

    // Semester 6: Ongoing, unpublished end-term
    const sem6 = exams.semesters.find((s) => s.semesterNumber === 6);
    assert.ok(sem6);
    assert.equal(sem6.isPublished, false);
    assert.ok(sem6.unreleasedNotice && sem6.unreleasedNotice.length > 0);
    // All returned results must have status === 'published'
    for (const res of sem6.results) {
      assert.equal(res.status, 'published');
    }

    // Semester 5: Completed and verified
    const sem5 = exams.semesters.find((s) => s.semesterNumber === 5);
    assert.ok(sem5);
    assert.equal(sem5.isPublished, true);
    assert.ok(sem5.results.length >= 6);
    for (const res of sem5.results) {
      assert.equal(res.status, 'published');
      assert.ok(res.marksObtained >= 0 && res.marksObtained <= res.maxMarks);
    }

    // Backlog history tracking
    assert.ok(exams.backlogHistory.length > 0);
    assert.equal(exams.backlogHistory[0].status, 'cleared');
  });
});

test('Student Workflows: Learning Resources & Handouts Vault', async (t) => {
  await t.test('Resources can be searched by keyword, course, semester, and subject', async () => {
    const all = await StudentService.getResources();
    assert.ok(all.length >= 5);

    // Filter by subject
    const cdOnly = await StudentService.getResources({ subjectId: 'CS601' });
    assert.ok(cdOnly.length > 0);
    assert.ok(cdOnly.every((r) => r.subjectCode === 'CS601'));

    // Filter by course
    const cseOnly = await StudentService.getResources({ course: 'B.Tech CSE' });
    assert.ok(cseOnly.length > 0);
    assert.ok(cseOnly.every((r) => r.course === 'B.Tech CSE'));

    // Filter by semester
    const sem6Only = await StudentService.getResources({ semester: 6 });
    assert.ok(sem6Only.length > 0);
    assert.ok(sem6Only.every((r) => r.semester === 6));

    // Search by title keyword
    const searchAStar = await StudentService.getResources({ search: 'Heuristic' });
    assert.ok(searchAStar.length > 0);
    assert.ok(searchAStar[0].title.includes('Heuristic'));

    // Verify metadata properties
    const sample = all[0];
    assert.ok(sample.fileName.length > 0);
    assert.ok(sample.fileSizeBytes > 0);
    assert.ok(typeof sample.isUpdated === 'boolean');
    assert.ok(typeof sample.version === 'string');
  });
});

test('Student Workflows: Leave Request Submission & State Machine Lifecycle', async (t) => {
  await t.test('Leave request validates date boundaries and minimum reason length', async () => {
    // 1. Invalid date range (end before start)
    await assert.rejects(
      async () => {
        await StudentService.submitLeaveRequest({
          leaveType: 'Medical',
          startDate: '2026-05-10',
          endDate: '2026-05-01',
          reason: 'Severe fever and prescribed medical rest',
        });
      },
      /INVALID_LEAVE_DATES/
    );

    // 2. Short reason (< 10 characters)
    await assert.rejects(
      async () => {
        await StudentService.submitLeaveRequest({
          leaveType: 'Personal',
          startDate: '2026-05-01',
          endDate: '2026-05-03',
          reason: 'Too brief',
        });
      },
      /INVALID_LEAVE_REASON/
    );
  });

  await t.test('Student can submit validated leave request and withdraw active request cleanly', async () => {
    // 1. Submit leave request
    const submitted = await StudentService.submitLeaveRequest({
      leaveType: 'Academic Event',
      startDate: '2026-05-02',
      endDate: '2026-05-04',
      reason: 'Attending IEEE Student Technical Paper Presentation',
      attachmentName: 'ieee_invitation_letter.pdf',
    });

    assert.equal(submitted.status, 'submitted');
    assert.equal(submitted.canWithdraw, true);
    assert.ok(submitted.timeline.length >= 2);

    // 2. Withdraw the leave request
    const withdrawSuccess = await StudentService.withdrawLeaveRequest(submitted.id);
    assert.equal(withdrawSuccess, true);
    assert.equal(submitted.status, 'withdrawn');
    assert.equal(submitted.canWithdraw, false);

    // Verify timeline cleanliness: no dangling 'current' or 'upcoming' steps
    const hasDanglingCurrent = submitted.timeline.some((s) => s.status === 'current');
    const hasDanglingUpcoming = submitted.timeline.some((s) => s.status === 'upcoming');
    assert.equal(hasDanglingCurrent, false, 'Withdrawn request should not have current steps');
    assert.equal(hasDanglingUpcoming, false, 'Withdrawn request should not have upcoming steps');

    const lastStep = submitted.timeline[submitted.timeline.length - 1];
    assert.equal(lastStep.title, 'Withdrawn by Student');
    assert.equal(lastStep.status, 'completed');

    // 3. Attempting to withdraw again must be rejected by state machine
    await assert.rejects(
      async () => {
        await StudentService.withdrawLeaveRequest(submitted.id);
      },
      /LEAVE_REQUEST_ALREADY_RESOLVED/
    );
  });
});

test('Student Workflows: Threaded Doubts & Reopen Limit Policy', async (t) => {
  await t.test('Student can post doubt, reply in thread, and obey 2-reopen policy cap', async () => {
    // 1. Create doubt
    const doubt = await StudentService.createDoubt({
      subjectId: '00000000-0000-0000-0000-000000000351',
      title: 'Shift-Reduce Conflict in Dangling Else',
      question: 'How does Yacc/Bison resolve the dangling else grammar ambiguity by default?',
      attachmentName: 'grammar_snippet.y',
    });

    assert.equal(doubt.status, 'open');
    assert.equal(doubt.reopenCount, 0);
    assert.equal(doubt.maxReopensAllowed, 2);
    assert.equal(doubt.messages.length, 1);

    // Reopening an 'open' doubt must be rejected (only resolved tickets can be reopened)
    await assert.rejects(
      async () => {
        await StudentService.reopenDoubt(doubt.id, 'Trying to reopen an open doubt');
      },
      /DOUBT_NOT_RESOLVED/
    );

    // 2. Add message to thread
    const reply = await StudentService.sendDoubtMessage(
      doubt.id,
      'I verified in the manual that shift takes precedence over reduce.'
    );
    assert.equal(reply.message, 'I verified in the manual that shift takes precedence over reduce.');
    assert.equal(doubt.messages.length, 2);

    // Reopening an 'answered' doubt must also be rejected
    doubt.status = 'answered';
    await assert.rejects(
      async () => {
        await StudentService.reopenDoubt(doubt.id, 'Trying to reopen an answered doubt');
      },
      /DOUBT_NOT_RESOLVED/
    );

    // 3. Simulate resolving and reopening
    doubt.status = 'resolved';
    assert.equal(doubt.reopenCount, 0);

    // First reopen: Allowed
    await StudentService.reopenDoubt(doubt.id, 'Need clarification on operator precedence table');
    assert.equal(doubt.status, 'reopened');
    assert.equal(doubt.reopenCount, 1);

    // Second reopen: Allowed
    doubt.status = 'resolved';
    await StudentService.reopenDoubt(doubt.id, 'One final edge case on unary minus');
    assert.equal(doubt.reopenCount, 2);

    // Third reopen: Rejected by policy
    doubt.status = 'resolved';
    await assert.rejects(
      async () => {
        await StudentService.reopenDoubt(doubt.id, 'Third question');
      },
      /DOUBT_REOPEN_LIMIT_EXCEEDED/
    );
  });
});

test('Student Workflows: Campus Activities & RSVP Management', async (t) => {
  await t.test('Activities can be fetched, RSVP toggled, and capacity cap enforced', async () => {
    const activities = await StudentService.getActivities();
    assert.ok(activities.length >= 4);

    const target = activities.find((a) => !a.isRegistered);
    assert.ok(target, 'Should find at least one unregistered activity');

    const initialCount = target.registeredCount;

    // 1. Register for activity
    const regSuccess = await StudentService.registerForActivity(target.id, true);
    assert.equal(regSuccess, true);
    assert.equal(target.isRegistered, true);
    assert.equal(target.registeredCount, initialCount + 1);

    // 2. Cancel RSVP
    const cancelSuccess = await StudentService.registerForActivity(target.id, false);
    assert.equal(cancelSuccess, true);
    assert.equal(target.isRegistered, false);
    assert.equal(target.registeredCount, initialCount);

    // 3. Enforce capacity limit
    const fullActivity = { ...target, registeredCount: target.capacity };
    // Temporarily set target to full capacity
    target.registeredCount = target.capacity;
    await assert.rejects(
      async () => {
        await StudentService.registerForActivity(target.id, true);
      },
      /ACTIVITY_CAPACITY_FULL/
    );
    // Reset back
    target.registeredCount = initialCount;
  });
});

test('Student Workflows: Read-Only Fee Ledger & Receipt Integrity', async (t) => {
  await t.test('Fee ledger displays itemized breakdown, verified receipts, and zero client tampering', async () => {
    const ledger = await StudentService.getFeeLedger();

    assert.equal(ledger.programmeName, 'B.Tech Computer Science & Engineering');
    assert.equal(ledger.semesterNumber, 6);

    // Itemized breakdown arithmetic
    const breakdownTotal =
      ledger.breakdown.tuitionFeeMinorUnits +
      ledger.breakdown.labFeeMinorUnits +
      ledger.breakdown.libraryFeeMinorUnits +
      ledger.breakdown.examFeeMinorUnits;
    assert.equal(breakdownTotal, ledger.assignedAmountMinorUnits);

    // Concession and balance math
    const expectedNet = ledger.assignedAmountMinorUnits - ledger.concessionAmountMinorUnits;
    assert.equal(ledger.balanceMetrics.netPayableMinorUnits, expectedNet);

    const expectedOutstanding = expectedNet - ledger.balanceMetrics.verifiedPaidMinorUnits;
    assert.equal(ledger.balanceMetrics.outstandingBalanceMinorUnits, expectedOutstanding);

    // Receipts
    assert.ok(ledger.payments.length > 0);
    const receipt = ledger.payments[0];
    assert.equal(receipt.status, 'verified');
    assert.ok(receipt.receiptNumber.startsWith('REC-'));
    assert.ok(receipt.gatewayReference.length > 0);
  });
});
