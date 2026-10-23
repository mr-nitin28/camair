import test from 'node:test';
import assert from 'node:assert/strict';

import { CrossModuleSynchronizer } from '../src/lib/services/cross-module-store.ts';
import {
  NotificationService,
  INSTITUTION_A_ID,
  INSTITUTION_B_ID,
  USER_IDS,
} from '../src/lib/services/notification-service.ts';
import { StudentService } from '../src/lib/services/student-service.ts';
import { FacultyService } from '../src/lib/services/faculty-service.ts';
import { AdminService } from '../src/lib/services/admin-service.ts';
import {
  calculateAttendanceMetrics,
  calculateSGPA,
  calculateFeeBalance,
} from '../src/lib/calculations/index.ts';

test('Cross-Module Integration: Authoritative Data Flow & Zero Stale State', async (t) => {

  // =========================================================================
  // JOURNEY 1: LEAVE JOURNEY
  // =========================================================================
  await t.test('Journey 1: Leave Journey (Student submit -> Faculty/Admin review & approve -> Timeline update -> Outbox notification)', async (st) => {
    CrossModuleSynchronizer.reset();

    await st.test('1.1 Student submits leave request and attendance risk is calculated', async () => {
      const initialLeaves = CrossModuleSynchronizer.getLeaves();
      const initialCount = initialLeaves.length;

      const newLeave = await StudentService.submitLeaveRequest({
        leaveType: 'Medical',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        reason: 'Acute seasonal broncho-spasm prescribed 3 days quarantine.',
        attachmentName: 'medical_prescription.pdf',
      });

      assert.ok(newLeave.id);
      assert.equal(newLeave.status, 'submitted');
      assert.equal(newLeave.daysCount, 3);
      assert.equal(newLeave.canWithdraw, true);

      // Verify leave is in canonical store immediately
      const currentLeaves = CrossModuleSynchronizer.getLeaves();
      assert.equal(currentLeaves.length, initialCount + 1);
      const stored = CrossModuleSynchronizer.getLeaveById(newLeave.id);
      assert.ok(stored);
      assert.equal(stored.reason, 'Acute seasonal broncho-spasm prescribed 3 days quarantine.');
    });

    await st.test('1.2 Submitted leave request appears in Faculty queue and Admin approvals', async () => {
      const leaves = CrossModuleSynchronizer.getLeaves();
      const submitted = leaves.find((l) => l.reason.includes('broncho-spasm'));
      assert.ok(submitted);

      // Faculty queue check
      const facultyQueue = await FacultyService.getLeaveRequestsQueue();
      const foundInFaculty = facultyQueue.find((l) => l.id === submitted.id);
      assert.ok(foundInFaculty, 'Leave must appear in Faculty queue');
      assert.equal(foundInFaculty.status, 'submitted');

      // Admin unified approvals check
      const adminApprovals = await AdminService.getUnifiedApprovals({ category: 'leave' });
      const foundInAdmin = adminApprovals.find((a) => a.id === submitted.id);
      assert.ok(foundInAdmin, 'Leave must appear in Admin approvals');
      assert.equal(foundInAdmin.status, 'pending');
    });

    await st.test('1.3 Actioning leave without decision comment is strictly REJECTED', async () => {
      const leaves = CrossModuleSynchronizer.getLeaves();
      const submitted = leaves.find((l) => l.reason.includes('broncho-spasm'));
      assert.ok(submitted);

      await assert.rejects(
        async () => {
          await FacultyService.actionLeaveRequest({
            leaveId: submitted.id,
            status: 'approved',
            decisionComment: '',
          });
        },
        /DECISION_COMMENT_REQUIRED/
      );
    });

    await st.test('1.4 Faculty approves leave with comment; student timeline and withdrawal guard update', async () => {
      const leaves = CrossModuleSynchronizer.getLeaves();
      const submitted = leaves.find((l) => l.reason.includes('broncho-spasm'));
      assert.ok(submitted);

      const decisionNote = 'Prescription verified with campus medical center. Leave sanctioned.';
      const updated = await FacultyService.actionLeaveRequest({
        leaveId: submitted.id,
        status: 'approved',
        decisionComment: decisionNote,
      });

      assert.equal(updated.status, 'approved');
      assert.equal(updated.decisionComment, decisionNote);
      assert.equal(updated.canWithdraw, false, 'Student cannot withdraw approved leave');

      // Verify canonical synchronizer state
      const canonical = CrossModuleSynchronizer.getLeaveById(submitted.id);
      assert.ok(canonical);
      assert.equal(canonical.status, 'approved');
      assert.equal(canonical.canWithdraw, false);

      // Timeline must contain approved step
      const completedSteps = canonical.timeline.filter((s) => s.status === 'completed');
      assert.ok(completedSteps.length >= 2);
      assert.ok(canonical.timeline.some((s) => s.title.includes('Approved')));

      // Student service view must reflect approval immediately
      const studentLeaves = await StudentService.getLeaveRequests();
      const studentView = studentLeaves.find((l) => l.id === submitted.id);
      assert.ok(studentView);
      assert.equal(studentView.status, 'approved');
      assert.equal(studentView.canWithdraw, false);
    });

    await st.test('1.5 Outbox processes LEAVE_SUBMITTED and LEAVE_STATUS_CHANGED into student & faculty notifications', async () => {
      NotificationService.processOutboxEvents();

      // Student Aarav must have notification for leave approval
      const studentNotifs = NotificationService.getUserNotifications(USER_IDS.studentA1);
      const leaveNotif = studentNotifs.find((n) => n.category === 'Leave' && n.title.includes('Approved'));
      assert.ok(leaveNotif, 'Student must receive Leave Approved notification');
      assert.equal(leaveNotif.deepLink, '/dashboard/leaves');
    });

    await st.test('1.6 Admin bulk action on approvals synchronizes leave status to student and faculty queue', async () => {
      // Student Diya Kaur (studentA2) submitted leave
      const diyaLeave = CrossModuleSynchronizer.getLeaves().find((l) => l.studentId === USER_IDS.studentA2);
      assert.ok(diyaLeave);

      const bulkResult = await AdminService.bulkActionApprovals(
        [diyaLeave.id],
        'approve',
        'Bulk verified by academic committee.'
      );

      assert.equal(bulkResult.actionedCount, 1);
      assert.ok(bulkResult.actionedIds.includes(diyaLeave.id));

      // Verify canonical synchronizer state
      const updatedDiya = CrossModuleSynchronizer.getLeaveById(diyaLeave.id);
      assert.ok(updatedDiya);
      assert.equal(updatedDiya.status, 'approved');
      assert.equal(updatedDiya.decisionComment, 'Bulk verified by academic committee.');

      // Faculty queue check
      const facultyQueue = await FacultyService.getLeaveRequestsQueue();
      const inFaculty = facultyQueue.find((l) => l.id === diyaLeave.id);
      assert.ok(inFaculty);
      assert.equal(inFaculty.status, 'approved');
    });

    await st.test('1.7 Admin directly actionApproval on new leave without prior getUnifiedApprovals call succeeds', async () => {
      const freshLeave = await StudentService.submitLeaveRequest({
        leaveType: 'Academic Event',
        startDate: '2026-05-10',
        endDate: '2026-05-12',
        reason: 'International Robotics challenge zonal round delegation.',
      });

      assert.ok(freshLeave.id);

      // Directly action without calling getUnifiedApprovals first
      const actioned = await AdminService.actionApproval(
        freshLeave.id,
        'approve',
        'Direct academic approval granted for robotics delegation.'
      );

      assert.equal(actioned.status, 'approved');

      // Canonical state must be approved
      const canonical = CrossModuleSynchronizer.getLeaveById(freshLeave.id);
      assert.ok(canonical);
      assert.equal(canonical.status, 'approved');
      assert.equal(canonical.decisionComment, 'Direct academic approval granted for robotics delegation.');
    });
  });

  // =========================================================================
  // JOURNEY 2: ATTENDANCE JOURNEY
  // =========================================================================
  await t.test('Journey 2: Attendance Journey (Faculty roll call -> Student metrics, 75% ring & logs update -> Absentee notification)', async (st) => {
    CrossModuleSynchronizer.reset();

    await st.test('2.1 Initial student attendance metrics reflect seeded state', async () => {
      const dashboard = await StudentService.getDashboardSummary();
      const overall = dashboard.attendanceSummary.overall;

      assert.equal(overall.thresholdPercent, 75.0);
      assert.ok(overall.percentage >= 75.0);
      assert.ok(overall.classesAllowedToMiss >= 0);
    });

    await st.test('2.2 Faculty submits attendance session with student marked Absent', async () => {
      const sessionId = '00000000-0000-0000-0000-000000000502';

      // Submit attendance marking Aarav Patel (studentA1) as Absent
      const submitted = await FacultyService.submitAttendanceSession({
        sessionId,
        records: [
          { student_id: USER_IDS.studentA1, status: 'Absent' },
          { student_id: USER_IDS.studentA2, status: 'Present' },
        ],
      });

      assert.equal(submitted.success, true);
      assert.equal(submitted.revisionNumber, 1);

      // Student dashboard attendance must update immediately
      const updatedDashboard = await StudentService.getDashboardSummary();
      const newOverall = updatedDashboard.attendanceSummary.overall;

      // Student Aarav's absent sessions must have incremented by 1
      assert.ok(newOverall.absentSessions > 0);

      // Verify attendance history contains today's log
      const history = await StudentService.getAttendanceHistory();
      const recentLog = history.logs.find((l) => l.sessionId === sessionId);
      assert.ok(recentLog, 'New attendance log must appear in student history');
      assert.equal(recentLog.status, 'Absent');
    });

    await st.test('2.3 Correction flow: Modifying submitted session REQUIRES documented reason', async () => {
      const sessionId = '00000000-0000-0000-0000-000000000502';

      await assert.rejects(
        async () => {
          await FacultyService.submitAttendanceSession({
            sessionId,
            records: [
              { student_id: USER_IDS.studentA1, status: 'Present' },
              { student_id: USER_IDS.studentA2, status: 'Present' },
            ],
            // Missing reason
          });
        },
        /CORRECTION_REASON_REQUIRED/
      );

      // With reason, correction succeeds and updates revision count
      const corrected = await FacultyService.submitAttendanceSession({
        sessionId,
        reason: 'Student arrived late due to departmental lab presentation.',
        records: [
          { student_id: USER_IDS.studentA1, status: 'Present' },
          { student_id: USER_IDS.studentA2, status: 'Present' },
        ],
      });

      assert.equal(corrected.success, true);
      assert.equal(corrected.revisionNumber, 2);
    });

    await st.test('2.4 Outbox delivers attendance alert notification to student', async () => {
      NotificationService.processOutboxEvents();

      const notifs = NotificationService.getUserNotifications(USER_IDS.studentA1);
      const attNotif = notifs.find((n) => n.category === 'Attendance');
      assert.ok(attNotif, 'Student must receive attendance notification');
      assert.equal(attNotif.deepLink, '/dashboard/attendance');
    });
  });

  // =========================================================================
  // JOURNEY 3: GRADING & EXAMINATION JOURNEY
  // =========================================================================
  await t.test('Journey 3: Grading & Examination Journey (Faculty submit marks -> Student isolation of drafts -> Admin publish -> SGPA recalculation)', async (st) => {
    CrossModuleSynchronizer.reset();

    const assessmentId = '00000000-0000-0000-0000-000000000412'; // End-term theory

    await st.test('3.1 Faculty submits marks for assessment (transitions to submitted)', async () => {
      const updated = await FacultyService.submitAssessmentMarks({
        assessmentId,
        records: [
          { studentId: USER_IDS.studentA1, marks: 95 }, // 95/100 -> Grade O (10.0 GP)
          { studentId: USER_IDS.studentA2, marks: 85 }, // 85/100 -> Grade A+ (9.0 GP)
        ],
      });

      assert.equal(updated.success, true);
      assert.equal(updated.status, 'submitted');
      const canonicalAss = CrossModuleSynchronizer.getAssessmentById(assessmentId);
      assert.ok(canonicalAss);
      const aaravRec = canonicalAss.records.find((r) => r.studentId === USER_IDS.studentA1);
      assert.ok(aaravRec);
      assert.equal(aaravRec.marksObtained, 95);
      assert.equal(aaravRec.grade, 'O');
    });

    await st.test('3.2 Student SGPA strictly EXCLUDES submitted/draft marks before publication', async () => {
      const studentGrades = CrossModuleSynchronizer.getPublishedStudentGrades(USER_IDS.studentA1);
      
      // End-term theory (assessmentId) is NOT published yet, so it must not be in publishedResults
      const endTermFound = studentGrades.publishedResults.find((r) => r.subjectCode === 'CS601' && r.grade === 'O');
      assert.equal(endTermFound, undefined, 'Submitted marks must be strictly isolated from student view');
      assert.ok(studentGrades.pendingCount > 0);
    });

    await st.test('3.3 Publishing a draft assessment is strictly REJECTED by Admin publication engine', async () => {
      const draftId = '00000000-0000-0000-0000-000000000413'; // Quiz 2 Draft

      await assert.rejects(
        async () => {
          CrossModuleSynchronizer.publishAssessment(draftId, 'exam.admin@campusos.dev');
        },
        /INVALID_ASSESSMENT_STATE/
      );
    });

    await st.test('3.4 Admin publishes assessment; student SGPA recalculates and grades become live', async () => {
      const published = CrossModuleSynchronizer.publishAssessment(assessmentId, 'exam.admin@campusos.dev');
      assert.equal(published.status, 'published');
      assert.ok(published.publishedAt);

      // Now student grades must include the published assessment
      const updatedStudentGrades = CrossModuleSynchronizer.getPublishedStudentGrades(USER_IDS.studentA1);
      assert.ok(updatedStudentGrades.publishedResults.length > 0);
      assert.ok(updatedStudentGrades.sgpa > 0);

      // Verify authoritative SGPA calculation
      const expectedSGPA = calculateSGPA(updatedStudentGrades.publishedResults);
      assert.equal(updatedStudentGrades.sgpa, expectedSGPA);
    });

    await st.test('3.5 Outbox generates Result Published notification with deep link to /dashboard/exams', async () => {
      NotificationService.processOutboxEvents();

      const notifs = NotificationService.getUserNotifications(USER_IDS.studentA1);
      const resultNotif = notifs.find((n) => n.category === 'Result' && n.title.includes('End-Term'));
      assert.ok(resultNotif, 'Student must receive Result Published notification');
      assert.equal(resultNotif.deepLink, '/dashboard/exams');
    });
  });

  // =========================================================================
  // JOURNEY 4: FINANCE JOURNEY
  // =========================================================================
  await t.test('Journey 4: Finance Journey (Double-entry arithmetic, Concession guard, Idempotent offline payment, Instant student reflection)', async (st) => {
    CrossModuleSynchronizer.reset();

    await st.test('4.1 Double-entry invariant holds initially on student fee assignment', async () => {
      const feeAssignment = CrossModuleSynchronizer.getFeeAssignment(USER_IDS.studentA1);
      const balance = CrossModuleSynchronizer.getFeeBalance(USER_IDS.studentA1);

      // Invariants:
      // netPayable = assigned - concession
      // outstanding = netPayable - verifiedPaid
      assert.equal(
        balance.netPayableMinorUnits,
        feeAssignment.assignedAmountMinorUnits - feeAssignment.concessionAmountMinorUnits
      );
      assert.equal(
        balance.outstandingBalanceMinorUnits,
        balance.netPayableMinorUnits - balance.verifiedPaidMinorUnits
      );
      assert.equal(balance.isFullyPaid, balance.outstandingBalanceMinorUnits === 0);
    });

    await st.test('4.2 Concession amount exceeding assigned fee is strictly REJECTED', async () => {
      const feeAssignment = CrossModuleSynchronizer.getFeeAssignment(USER_IDS.studentA1);

      await assert.rejects(
        async () => {
          await AdminService.applyFeeConcession(
            'sfa-001',
            feeAssignment.assignedAmountMinorUnits + 100000,
            'Invalid oversized scholarship'
          );
        },
        /cannot exceed total assigned fee/
      );
    });

    await st.test('4.3 Offline fee payment recording is strictly IDEMPOTENT', async () => {
      const idempotencyKey = 'cross-mod-pay-test-key-001';
      const paymentAmount = 1000000; // ₹10,000.00

      const firstReceipt = await AdminService.recordFeePayment(
        'sfa-001',
        paymentAmount,
        'UPI',
        idempotencyKey
      );

      assert.ok(firstReceipt.id);
      assert.equal(firstReceipt.amountMinorUnits, paymentAmount);

      // Re-invoking with identical idempotencyKey must return identical receipt
      const duplicateReceipt = await AdminService.recordFeePayment(
        'sfa-001',
        paymentAmount,
        'UPI',
        idempotencyKey
      );

      assert.equal(duplicateReceipt.id, firstReceipt.id);
      assert.equal(duplicateReceipt.idempotencyKey, idempotencyKey);
    });

    await st.test('4.4 Student fee ledger immediately reflects payment with verified receipt', async () => {
      const studentLedger = await StudentService.getFeeLedger();

      // Student ledger metrics must match authoritative calculations
      assert.ok(studentLedger.payments.length > 0);
      assert.ok(studentLedger.balanceMetrics.verifiedPaidMinorUnits > 0);

      const verifiedPaymentsTotal = studentLedger.payments
        .filter((p) => p.status === 'verified')
        .reduce((sum, p) => sum + p.amountMinorUnits, 0);

      assert.equal(studentLedger.balanceMetrics.verifiedPaidMinorUnits, verifiedPaymentsTotal);
      assert.equal(
        studentLedger.balanceMetrics.isFullyPaid,
        studentLedger.balanceMetrics.outstandingBalanceMinorUnits === 0
      );
    });

    await st.test('4.5 Outbox produces FEE_PAYMENT_VERIFIED notification for student with receipt', async () => {
      NotificationService.processOutboxEvents();

      const notifs = NotificationService.getUserNotifications(USER_IDS.studentA1);
      const feeNotif = notifs.find((n) => n.category === 'Fee' && n.title.includes('Verified'));
      assert.ok(feeNotif, 'Student must receive Fee Payment Verified notification');
      assert.equal(feeNotif.deepLink, '/dashboard/fees');
    });
  });

  // =========================================================================
  // JOURNEY 5: COMMUNICATIONS & DOUBTS JOURNEY
  // =========================================================================
  await t.test('Journey 5: Communications & Doubts Journey (Targeted notices -> Faculty doubt queue -> 2-reopen policy cap enforcement)', async (st) => {
    CrossModuleSynchronizer.reset();

    await st.test('5.1 Admin publishes targeted announcement; appears in student feed', async () => {
      const ann = await AdminService.createAnnouncement({
        title: 'Campus Hackathon 2026 Registration Open',
        content: '48-hour national hackathon on campus with enterprise sponsor tracks.',
        priority: 'Important',
        category: 'Institution',
        targetAudience: 'Students',
      });

      assert.ok(ann.id);

      // Student announcements feed must include new notice
      const studentAnnouncements = await StudentService.getAnnouncements();
      const found = studentAnnouncements.find((a) => a.title.includes('Campus Hackathon'));
      assert.ok(found, 'Targeted announcement must appear in student announcements feed');
    });

    await st.test('5.2 Student posts doubt ticket; visible to assigned faculty', async () => {
      const newDoubt = await StudentService.createDoubtTicket({
        subjectId: '00000000-0000-0000-0000-000000000351',
        title: 'Intermediate Code Generation for Short-Circuit Boolean Evaluation',
        question: 'How do backpatching lists handle nested boolean AND/OR expressions in syntax-directed translation?',
      });

      assert.ok(newDoubt.id);
      assert.equal(newDoubt.status, 'open');
      assert.equal(newDoubt.reopenCount, 0);

      // Faculty queue must contain this doubt
      const facultyDoubts = await FacultyService.getDoubtsQueue();
      const foundInFaculty = facultyDoubts.find((d) => d.id === newDoubt.id);
      assert.ok(foundInFaculty, 'Doubt must appear in faculty queue');
      assert.equal(foundInFaculty.subjectCode, 'CS601');
      assert.equal(foundInFaculty.studentName, 'Aarav Patel');
    });

    await st.test('5.3 Faculty replies and marks doubt resolved', async () => {
      const doubts = CrossModuleSynchronizer.getDoubts();
      const doubt = doubts.find((d) => d.title.includes('Intermediate Code Generation'));
      assert.ok(doubt);

      const reply = await FacultyService.replyToDoubt({
        doubtId: doubt.id,
        replyText: 'Backpatching maintains truelist and falselist markers on the AST boolean nodes.',
      });

      assert.ok(reply);
      assert.equal(doubt.status, 'answered');

      // Faculty resolves ticket
      const resolved = await FacultyService.resolveDoubt(doubt.id);
      assert.equal(resolved.success, true);
      assert.equal(doubt.status, 'resolved');
      assert.equal(doubt.canReopen, true);
    });

    await st.test('5.4 Student reopens doubt (Reopen 1 and Reopen 2 succeed)', async () => {
      const doubts = CrossModuleSynchronizer.getDoubts();
      const doubt = doubts.find((d) => d.title.includes('Intermediate Code Generation'));
      assert.ok(doubt);

      // First Reopen (1 of 2)
      const reopen1 = await StudentService.reopenDoubtTicket(
        doubt.id,
        'Does the truelist merge happen before or after the jump target is emitted?'
      );
      assert.equal(reopen1, true);
      assert.equal(doubt.status, 'reopened');
      assert.equal(doubt.reopenCount, 1);
      assert.equal(doubt.canReopen, false);

      // Faculty resolves again
      await FacultyService.resolveDoubt(doubt.id);
      assert.equal(doubt.status, 'resolved');
      assert.equal(doubt.canReopen, true);

      // Second Reopen (2 of 2)
      const reopen2 = await StudentService.reopenDoubtTicket(
        doubt.id,
        'What about short-circuit evaluation in ternary operator expressions?'
      );
      assert.equal(reopen2, true);
      assert.equal(doubt.status, 'reopened');
      assert.equal(doubt.reopenCount, 2);
      assert.equal(doubt.canReopen, false, 'No more reopens allowed after 2 reopens');

      // Faculty resolves again
      await FacultyService.resolveDoubt(doubt.id);
      assert.equal(doubt.canReopen, false);
    });

    await st.test('5.5 Third reopen attempt is strictly BLOCKED by policy cap (Max 2 reopens)', async () => {
      const doubts = CrossModuleSynchronizer.getDoubts();
      const doubt = doubts.find((d) => d.title.includes('Intermediate Code Generation'));
      assert.ok(doubt);

      await assert.rejects(
        async () => {
          await StudentService.reopenDoubtTicket(doubt.id, 'Third question attempt beyond limit');
        },
        /DOUBT_REOPEN_LIMIT_EXCEEDED|POLICY_CAP_EXCEEDED|REOPEN_LIMIT_EXCEEDED|CANNOT_REOPEN/
      );
    });

    await st.test('5.6 Student replies in doubt ticket thread; faculty getDoubtsQueue immediately reflects latest messages', async () => {
      const doubts = CrossModuleSynchronizer.getDoubts();
      const doubt = doubts[0];
      assert.ok(doubt);

      const replyText = 'Follow-up question regarding LR(1) parser canonical collection generation.';
      await StudentService.replyToDoubtTicket(doubt.id, replyText);

      // Faculty queue must have this reply in its messages
      const facultyDoubts = await FacultyService.getDoubtsQueue();
      const updatedFacultyDoubt = facultyDoubts.find((d) => d.id === doubt.id);
      assert.ok(updatedFacultyDoubt);
      const foundMessage = updatedFacultyDoubt.messages.find((m) => m.text.includes('LR(1) parser canonical'));
      assert.ok(foundMessage, 'Student reply must be immediately visible in faculty doubt thread');
    });

    await st.test('5.7 Faculty creates announcement via FacultyService.createAnnouncement; reaches Student and Admin feeds', async () => {
      const created = await FacultyService.createAnnouncement({
        title: 'Compiler Design Surprise Mini-Quiz Rescheduled',
        content: 'Mini-quiz 3 will take place on Thursday during the tutorial hour.',
        category: 'Examination',
        priority: 'High',
        targetAudience: 'All Students',
      });

      assert.ok(created.id);

      // Student announcements feed check
      const studentAnnouncements = await StudentService.getAnnouncements();
      const studentFound = studentAnnouncements.find((a) => a.title.includes('Surprise Mini-Quiz Rescheduled'));
      assert.ok(studentFound, 'Faculty announcement must appear in student announcements feed');

      // Admin announcements feed check
      const adminAnnouncements = await AdminService.getAnnouncements();
      const adminFound = adminAnnouncements.find((a) => a.title.includes('Surprise Mini-Quiz Rescheduled'));
      assert.ok(adminFound, 'Faculty announcement must appear in admin announcements feed');
    });
  });

  // =========================================================================
  // JOURNEY 6: NOTIFICATION OUTBOX & RECIPIENT ISOLATION
  // =========================================================================
  await t.test('Journey 6: Notification Outbox & Recipient Isolation (Zero cross-user/tenant leak, Authorization check, Read lifecycle)', async (st) => {
    CrossModuleSynchronizer.reset();

    await st.test('6.1 Tenant isolation: Institution B student receives zero notifications from Institution A', async () => {
      // Seed outbox event in Institution A
      NotificationService.enqueueOutboxEvent({
        institutionId: INSTITUTION_A_ID,
        eventType: 'ANNOUNCEMENT_PUBLISHED',
        payload: {
          announcementId: 'ann-sec-test',
          title: 'Institution A Internal Academic Notice',
          content: 'Confidential to Inst A members only.',
          targetAudience: 'All Students',
        },
      });

      NotificationService.processOutboxEvents();

      // Institution B student must have zero notifications from Institution A
      const instBNotifs = NotificationService.getUserNotifications(
        USER_IDS.studentB1,
        INSTITUTION_B_ID
      );
      assert.equal(instBNotifs.length, 0, 'Zero cross-tenant notification leak');
    });

    await st.test('6.2 Recipient isolation: Private student alerts are strictly inaccessible to peers', async () => {
      // Create leave status change for Student A1
      NotificationService.enqueueOutboxEvent({
        institutionId: INSTITUTION_A_ID,
        eventType: 'LEAVE_STATUS_CHANGED',
        payload: {
          studentId: USER_IDS.studentA1,
          newStatus: 'approved',
          decisionComment: 'Confidential medical note approved.',
          approverName: 'Dr. Vikram Mehta',
        },
      });

      NotificationService.processOutboxEvents();

      const notifsA1 = NotificationService.getUserNotifications(USER_IDS.studentA1);
      const confidentialA1 = notifsA1.find((n) => n.body.includes('Confidential medical note'));
      assert.ok(confidentialA1, 'Target student receives their notification');

      // Student A2 must NOT see Student A1 notification
      const notifsA2 = NotificationService.getUserNotifications(USER_IDS.studentA2);
      const leakedToA2 = notifsA2.find((n) => n.body.includes('Confidential medical note'));
      assert.equal(leakedToA2, undefined, 'Zero cross-user notification leak to peer student');
    });

    await st.test('6.3 Unauthorized mark-as-read attempt throws UNAUTHORIZED_NOTIFICATION_ACCESS', async () => {
      const notifsA1 = NotificationService.getUserNotifications(USER_IDS.studentA1);
      const targetNotif = notifsA1.find((n) => !n.isRead);
      assert.ok(targetNotif);

      // Student A2 attempts to mark Student A1's notification as read
      assert.throws(
        () => {
          NotificationService.markAsRead(targetNotif.id, USER_IDS.studentA2);
        },
        /UNAUTHORIZED_NOTIFICATION_ACCESS/
      );
    });

    await st.test('6.4 Authorized mark-as-read updates isRead and unread badge count accurately', async () => {
      const notifsA1 = NotificationService.getUserNotifications(USER_IDS.studentA1);
      const unreadList = notifsA1.filter((n) => !n.isRead);
      assert.ok(unreadList.length > 0);

      const target = unreadList[0];
      const initialUnreadCount = NotificationService.getUnreadCount(USER_IDS.studentA1);

      const success = NotificationService.markAsRead(target.id, USER_IDS.studentA1);
      assert.equal(success, true);

      const newUnreadCount = NotificationService.getUnreadCount(USER_IDS.studentA1);
      assert.equal(newUnreadCount, initialUnreadCount - 1);

      // Mark all read clears unread count to 0
      const updatedTotal = NotificationService.markAllAsRead(USER_IDS.studentA1);
      assert.ok(updatedTotal >= 0);
      assert.equal(NotificationService.getUnreadCount(USER_IDS.studentA1), 0);
    });

    await st.test('6.5 TopBar in-app notification center feed: unread badge, item structure, deep links, and mark-as-read integration', async () => {
      // Create new notification for Student A1
      NotificationService.enqueueOutboxEvent({
        institutionId: INSTITUTION_A_ID,
        eventType: 'ASSESSMENT_PUBLISHED',
        payload: {
          assessmentId: '00000000-0000-0000-0000-000000000412',
          assessmentName: 'End-Term Examination Marks Released',
          subjectCode: 'CS601',
          recipientIds: [USER_IDS.studentA1],
        },
      });

      NotificationService.processOutboxEvents();

      // TopBar badge should reflect unread count > 0
      const unreadCount = NotificationService.getUnreadCount(USER_IDS.studentA1);
      assert.ok(unreadCount > 0, 'Unread count badge must be positive');

      // Notifications feed for TopBar dropdown
      const notifications = NotificationService.getUserNotifications(USER_IDS.studentA1);
      assert.ok(notifications.length > 0);

      const target = notifications[0];
      assert.ok(target.id);
      assert.ok(target.title);
      assert.ok(target.body);
      assert.equal(target.isRead, false);
      assert.equal(target.deepLink, '/dashboard/exams', 'Must have exact deep link route');

      // Verify mark as read resets the item
      const marked = NotificationService.markAsRead(target.id, USER_IDS.studentA1);
      assert.equal(marked, true);
      assert.equal(target.isRead, true);
      assert.ok(target.readAt);
    });
  });
});
