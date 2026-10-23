/**
 * Cross-Module Authoritative Synchronizer & Canonical State Layer
 * Implements a single authoritative in-memory store shared across Student,
 * Faculty, and Admin modules with transactional consistency, state machine guards,
 * automatic outbox event enqueuing, and zero stale/duplicate state.
 * Strictly adheres to Master Prompt Section 16, Section 6, and Section 13.
 */

import {
  calculateAttendanceMetrics,
  calculateSGPA,
  calculateCGPA,
  calculateFeeBalance,
  calculateGradeFromMarks,
  formatMinorUnits,
  type AttendanceItem,
  type AttendanceMetrics,
  type CourseGradeEntry,
  type FeeBalanceMetrics,
  type PaymentItem,
  type UGCGrade,
} from '../calculations/index.ts';

import {
  NotificationService,
  INSTITUTION_A_ID,
  USER_IDS,
} from './notification-service.ts';

// ---------------------------------------------------------------------------
// 1. CANONICAL TYPES
// ---------------------------------------------------------------------------

export type LeaveStatus = 'submitted' | 'under_review' | 'clarification_requested' | 'approved' | 'rejected' | 'withdrawn';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
export type AssessmentStatus = 'draft' | 'submitted' | 'reviewed' | 'published' | 'correction_pending';
export type DoubtStatus = 'open' | 'answered' | 'resolved' | 'reopened';

export interface CanonicalLeaveTimelineStep {
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: string;
}

export interface CanonicalLeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  department: string;
  section: string;
  leaveType: 'Medical' | 'Personal' | 'On Duty' | 'Academic Event';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  attachmentName?: string;
  attachmentUrl?: string;
  currentAttendancePercent: number;
  projectedAttendancePercent: number;
  isAttendanceRisk: boolean;
  approverName?: string;
  decisionComment?: string | null;
  clarificationComment?: string | null;
  actionedBy?: string | null;
  actionedAt?: string | null;
  submittedAt: string;
  updatedAt: string;
  canWithdraw: boolean;
  timeline: CanonicalLeaveTimelineStep[];
}

export interface CanonicalAttendanceLog {
  id: string;
  date: string;
  slotNumber: number;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  status: AttendanceStatus;
  facultyName: string;
  sessionId: string;
}

export interface CanonicalAttendanceSession {
  sessionId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  facultyName: string;
  sectionName: string;
  date: string;
  slotNumber: number;
  time: string;
  room: string;
  status: 'scheduled' | 'submitted' | 'locked';
  records: { studentId: string; rollNo: string; studentName: string; status: AttendanceStatus }[];
}

export interface CanonicalAssessmentRecord {
  studentId: string;
  rollNo: string;
  studentName: string;
  marksObtained: number | null;
  maxMarks: number;
  percentage: number;
  grade: UGCGrade;
  gradePoints: number;
  isAbsent: boolean;
}

export interface CanonicalAssessment {
  id: string;
  name: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  facultyName: string;
  type: 'midterm' | 'final_theory' | 'final_practical' | 'internal' | 'assignment';
  status: AssessmentStatus;
  maxMarks: number;
  weightagePercent: number;
  dueDate: string;
  publishedAt: string | null;
  records: CanonicalAssessmentRecord[];
}

export interface CanonicalPaymentReceipt {
  id: string;
  assignmentId: string;
  studentId: string;
  amountMinorUnits: number;
  paymentMethod: 'UPI' | 'NetBanking' | 'Challan' | 'DD' | 'Cash';
  idempotencyKey: string;
  transactionReference: string;
  paidAt: string;
  status: 'verified' | 'initiated' | 'failed' | 'refunded';
  receiptNumber: string;
}

export interface CanonicalStudentFeeAssignment {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  departmentCode: string;
  structureName: string;
  semesterNumber: number;
  academicYear: string;
  assignedAmountMinorUnits: number;
  concessionAmountMinorUnits: number;
  dueDate: string;
  breakdown: {
    tuitionFeeMinorUnits: number;
    labFeeMinorUnits: number;
    libraryFeeMinorUnits: number;
    examFeeMinorUnits: number;
  };
  payments: CanonicalPaymentReceipt[];
}

export interface CanonicalDoubtMessage {
  id: string;
  doubtId: string;
  senderId: string;
  senderName: string;
  senderRole: 'Student' | 'Faculty' | 'Admin';
  message: string;
  attachmentName?: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface CanonicalDoubtTicket {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  section: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  facultyName: string;
  title: string;
  initialQuestion: string;
  status: DoubtStatus;
  reopenCount: number;
  maxReopensAllowed: number;
  canReopen: boolean;
  createdAt: string;
  updatedAt: string;
  messages: CanonicalDoubtMessage[];
}

export interface CanonicalAnnouncement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'Critical' | 'High' | 'Normal';
  author: string;
  targetAudience: 'All Students' | 'Faculty Only' | 'Department' | 'General';
  departmentCode?: string;
  createdAt: string;
  isRead?: boolean;
}

// ---------------------------------------------------------------------------
// 2. INITIAL SEED FACTORY
// ---------------------------------------------------------------------------

function buildInitialLeaves(): CanonicalLeaveRequest[] {
  return [
    {
      id: '00000000-0000-0000-0000-000000000701',
      studentId: USER_IDS.studentA1,
      studentName: 'Aarav Patel',
      rollNo: '23CSE042',
      department: 'Computer Science & Engineering',
      section: 'Section A',
      leaveType: 'Medical',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      daysCount: 3,
      reason: 'Medical Leave: Viral Fever prescribed bed rest with hospital consultation note.',
      status: 'submitted',
      attachmentName: 'medical_cert_aarav.pdf',
      attachmentUrl: '/documents/medical_cert_aarav.pdf',
      currentAttendancePercent: 85.71,
      projectedAttendancePercent: 83.2,
      isAttendanceRisk: false,
      approverName: 'Prof. Vikram Mehta (Faculty Advisor)',
      decisionComment: null,
      clarificationComment: null,
      submittedAt: '2026-03-08T09:30:00Z',
      updatedAt: '2026-03-08T09:30:00Z',
      canWithdraw: true,
      timeline: [
        { title: 'Leave Application Submitted', description: 'Application received by department portal', status: 'completed', timestamp: 'Mar 08, 2026' },
        { title: 'Faculty Advisor Review', description: 'Pending verification by Prof. Vikram Mehta', status: 'current' },
        { title: 'Final Resolution', description: 'Decision recorded and attendance adjusted', status: 'upcoming' },
      ],
    },
    {
      id: '00000000-0000-0000-0000-000000000702',
      studentId: USER_IDS.studentA2,
      studentName: 'Diya Kaur',
      rollNo: '23CSE043',
      department: 'Computer Science & Engineering',
      section: 'Section A',
      leaveType: 'Academic Event',
      startDate: '2026-03-25',
      endDate: '2026-03-27',
      daysCount: 3,
      reason: 'Presenting technical paper at ACM Regional Student Symposium on Distributed Systems.',
      attachmentUrl: '/documents/acm_symposium_invite.pdf',
      attachmentName: 'acm_symposium_invite.pdf',
      status: 'submitted',
      currentAttendancePercent: 71.43,
      projectedAttendancePercent: 67.85,
      isAttendanceRisk: true,
      approverName: 'Prof. Vikram Mehta',
      decisionComment: null,
      clarificationComment: null,
      submittedAt: '2026-03-22T11:00:00Z',
      updatedAt: '2026-03-22T11:00:00Z',
      canWithdraw: true,
      timeline: [
        { title: 'Application Submitted', description: 'Technical paper invite attached', status: 'completed', timestamp: 'Mar 22, 2026' },
        { title: 'Attendance Warning Flagged', description: 'Student attendance is 71.43% (< 75% policy threshold)', status: 'current' },
        { title: 'Department Approval', description: 'Awaiting faculty advisor sign-off', status: 'upcoming' },
      ],
    },
    {
      id: 'leave-prev-1',
      studentId: USER_IDS.studentA1,
      studentName: 'Aarav Patel',
      rollNo: '23CSE042',
      department: 'Computer Science & Engineering',
      section: 'Section A',
      leaveType: 'On Duty',
      startDate: '2026-02-14',
      endDate: '2026-02-16',
      daysCount: 3,
      reason: 'Representing institute at National Smart India Hackathon zonal round.',
      status: 'approved',
      attachmentName: 'hackathon_selection_letter.pdf',
      currentAttendancePercent: 88.0,
      projectedAttendancePercent: 88.0,
      isAttendanceRisk: false,
      approverName: 'Dr. Rajesh Sharma (Head of Department)',
      decisionComment: 'Approved. Attendance marked as On Duty (OD). All lab submissions must be turned in by Feb 20.',
      actionedBy: 'hod@campusos.dev',
      actionedAt: '2026-02-10T12:00:00Z',
      submittedAt: '2026-02-08T10:00:00Z',
      updatedAt: '2026-02-10T12:00:00Z',
      canWithdraw: false,
      timeline: [
        { title: 'Application Submitted', description: 'Selection letter attached', status: 'completed', timestamp: 'Feb 08, 2026' },
        { title: 'Advisor Endorsement', description: 'Forwarded by Prof. Vikram Mehta', status: 'completed', timestamp: 'Feb 09, 2026' },
        { title: 'Approved by HoD', description: 'Dr. Rajesh Sharma approved On-Duty credit', status: 'completed', timestamp: 'Feb 10, 2026' },
      ],
    },
    {
      id: 'leave-prev-2',
      studentId: USER_IDS.studentA1,
      studentName: 'Aarav Patel',
      rollNo: '23CSE042',
      department: 'Computer Science & Engineering',
      section: 'Section A',
      leaveType: 'Personal',
      startDate: '2026-01-20',
      endDate: '2026-01-21',
      daysCount: 2,
      reason: 'Family wedding event in hometown.',
      status: 'withdrawn',
      currentAttendancePercent: 88.0,
      projectedAttendancePercent: 88.0,
      isAttendanceRisk: false,
      submittedAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-01-16T14:30:00Z',
      canWithdraw: false,
      timeline: [
        { title: 'Application Submitted', description: 'Submitted by student', status: 'completed', timestamp: 'Jan 15, 2026' },
        { title: 'Withdrawn by Student', description: 'Trip cancelled by student prior to review', status: 'completed', timestamp: 'Jan 16, 2026' },
      ],
    },
  ];
}

function buildInitialAttendanceLogs(): CanonicalAttendanceLog[] {
  const subjects = [
    { id: '00000000-0000-0000-0000-000000000351', code: 'CS601', name: 'Compiler Design', faculty: 'Prof. Vikram Mehta' },
    { id: '00000000-0000-0000-0000-000000000352', code: 'CS602', name: 'Computer Networks', faculty: 'Prof. Ananya Deshmukh' },
    { id: '00000000-0000-0000-0000-000000000353', code: 'CS603', name: 'Artificial Intelligence', faculty: 'Dr. Vikrant Roy' },
    { id: 'sub-604', code: 'CS604', name: 'Software Architecture', faculty: 'Prof. Shruti Sen' },
    { id: 'sub-605L', code: 'CS605L', name: 'Compiler Design Lab', faculty: 'Prof. Vikram Mehta' },
  ];

  return [
    { id: 'att-1', date: '2026-03-24', slotNumber: 1, subjectId: subjects[0].id, subjectCode: 'CS601', subjectName: 'Compiler Design', status: 'Present', facultyName: 'Prof. Vikram Mehta', sessionId: '00000000-0000-0000-0000-000000000501' },
    { id: 'att-2', date: '2026-03-24', slotNumber: 2, subjectId: subjects[1].id, subjectCode: 'CS602', subjectName: 'Computer Networks', status: 'Present', facultyName: 'Prof. Ananya Deshmukh', sessionId: '00000000-0000-0000-0000-000000000502' },
    { id: 'att-3', date: '2026-03-23', slotNumber: 1, subjectId: subjects[2].id, subjectCode: 'CS603', subjectName: 'Artificial Intelligence', status: 'Present', facultyName: 'Dr. Vikrant Roy', sessionId: 'att-sess-3' },
    { id: 'att-4', date: '2026-03-23', slotNumber: 2, subjectId: subjects[3].id, subjectCode: 'CS604', subjectName: 'Software Architecture', status: 'Late', facultyName: 'Prof. Shruti Sen', sessionId: 'att-sess-4' },
    { id: 'att-5', date: '2026-03-22', slotNumber: 1, subjectId: subjects[0].id, subjectCode: 'CS601', subjectName: 'Compiler Design', status: 'Present', facultyName: 'Prof. Vikram Mehta', sessionId: 'att-sess-5' },
    { id: 'att-6', date: '2026-03-22', slotNumber: 3, subjectId: subjects[4].id, subjectCode: 'CS605L', subjectName: 'Compiler Design Lab', status: 'Present', facultyName: 'Prof. Vikram Mehta', sessionId: 'att-sess-6' },
    { id: 'att-7', date: '2026-03-21', slotNumber: 1, subjectId: subjects[1].id, subjectCode: 'CS602', subjectName: 'Computer Networks', status: 'Absent', facultyName: 'Prof. Ananya Deshmukh', sessionId: 'att-sess-7' },
    { id: 'att-8', date: '2026-03-21', slotNumber: 2, subjectId: subjects[2].id, subjectCode: 'CS603', subjectName: 'Artificial Intelligence', status: 'Present', facultyName: 'Dr. Vikrant Roy', sessionId: 'att-sess-8' },
    { id: 'att-9', date: '2026-03-20', slotNumber: 1, subjectId: subjects[0].id, subjectCode: 'CS601', subjectName: 'Compiler Design', status: 'Present', facultyName: 'Prof. Vikram Mehta', sessionId: 'att-sess-9' },
    { id: 'att-10', date: '2026-03-20', slotNumber: 2, subjectId: subjects[3].id, subjectCode: 'CS604', subjectName: 'Software Architecture', status: 'Present', facultyName: 'Prof. Shruti Sen', sessionId: 'att-sess-10' },
    { id: 'att-11', date: '2026-03-19', slotNumber: 1, subjectId: subjects[1].id, subjectCode: 'CS602', subjectName: 'Computer Networks', status: 'Present', facultyName: 'Prof. Ananya Deshmukh', sessionId: 'att-sess-11' },
    { id: 'att-12', date: '2026-03-19', slotNumber: 2, subjectId: subjects[2].id, subjectCode: 'CS603', subjectName: 'Artificial Intelligence', status: 'Present', facultyName: 'Dr. Vikrant Roy', sessionId: 'att-sess-12' },
    { id: 'att-13', date: '2026-03-18', slotNumber: 1, subjectId: subjects[0].id, subjectCode: 'CS601', subjectName: 'Compiler Design', status: 'Excused', facultyName: 'Prof. Vikram Mehta', sessionId: 'att-sess-13' },
    { id: 'att-14', date: '2026-03-18', slotNumber: 2, subjectId: subjects[1].id, subjectCode: 'CS602', subjectName: 'Computer Networks', status: 'Present', facultyName: 'Prof. Ananya Deshmukh', sessionId: 'att-sess-14' },
    { id: 'att-15', date: '2026-03-17', slotNumber: 1, subjectId: subjects[4].id, subjectCode: 'CS605L', subjectName: 'Compiler Design Lab', status: 'Present', facultyName: 'Prof. Vikram Mehta', sessionId: 'att-sess-15' },
    { id: 'att-16', date: '2026-03-17', slotNumber: 2, subjectId: subjects[3].id, subjectCode: 'CS604', subjectName: 'Software Architecture', status: 'Absent', facultyName: 'Prof. Shruti Sen', sessionId: 'att-sess-16' },
  ];
}

function buildInitialAssessments(): CanonicalAssessment[] {
  return [
    {
      id: '00000000-0000-0000-0000-000000000411',
      name: 'Compiler Design Mid-Term Examination',
      subjectId: '00000000-0000-0000-0000-000000000351',
      subjectCode: 'CS601',
      subjectName: 'Compiler Design',
      facultyId: USER_IDS.facultyA1,
      facultyName: 'Dr. Vikram Mehta',
      type: 'midterm',
      status: 'published',
      maxMarks: 50,
      weightagePercent: 30,
      dueDate: '2026-03-15',
      publishedAt: '2026-03-16T10:00:00Z',
      records: [
        {
          studentId: USER_IDS.studentA1,
          rollNo: '23CSE042',
          studentName: 'Aarav Patel',
          marksObtained: 45,
          maxMarks: 50,
          percentage: 90.0,
          grade: 'A+',
          gradePoints: 9.0,
          isAbsent: false,
        },
        {
          studentId: USER_IDS.studentA2,
          rollNo: '23CSE043',
          studentName: 'Diya Kaur',
          marksObtained: 41,
          maxMarks: 50,
          percentage: 82.0,
          grade: 'A',
          gradePoints: 8.0,
          isAbsent: false,
        },
      ],
    },
    {
      id: '00000000-0000-0000-0000-000000000412',
      name: 'Compiler Design End-Term Examination',
      subjectId: '00000000-0000-0000-0000-000000000351',
      subjectCode: 'CS601',
      subjectName: 'Compiler Design',
      facultyId: USER_IDS.facultyA1,
      facultyName: 'Dr. Vikram Mehta',
      type: 'final_theory',
      status: 'submitted',
      maxMarks: 100,
      weightagePercent: 50,
      dueDate: '2026-04-10',
      publishedAt: null,
      records: [
        {
          studentId: USER_IDS.studentA1,
          rollNo: '23CSE042',
          studentName: 'Aarav Patel',
          marksObtained: 92,
          maxMarks: 100,
          percentage: 92.0,
          grade: 'O',
          gradePoints: 10.0,
          isAbsent: false,
        },
        {
          studentId: USER_IDS.studentA2,
          rollNo: '23CSE043',
          studentName: 'Diya Kaur',
          marksObtained: 86,
          maxMarks: 100,
          percentage: 86.0,
          grade: 'A+',
          gradePoints: 9.0,
          isAbsent: false,
        },
      ],
    },
    {
      id: '00000000-0000-0000-0000-000000000413',
      name: 'Compiler Design Quiz 2: Parsing',
      subjectId: '00000000-0000-0000-0000-000000000351',
      subjectCode: 'CS601',
      subjectName: 'Compiler Design',
      facultyId: USER_IDS.facultyA1,
      facultyName: 'Dr. Vikram Mehta',
      type: 'internal',
      status: 'draft',
      maxMarks: 20,
      weightagePercent: 10,
      dueDate: '2026-04-20',
      publishedAt: null,
      records: [
        {
          studentId: USER_IDS.studentA1,
          rollNo: '23CSE042',
          studentName: 'Aarav Patel',
          marksObtained: null,
          maxMarks: 20,
          percentage: 0,
          grade: 'F',
          gradePoints: 0,
          isAbsent: false,
        },
      ],
    },
  ];
}

function buildInitialFeeAssignment(): CanonicalStudentFeeAssignment {
  return {
    id: '00000000-0000-0000-0000-000000000611',
    studentId: USER_IDS.studentA1,
    studentName: 'Aarav Patel',
    rollNo: 'EN2023CSE042',
    departmentCode: 'CSE',
    structureName: 'Semester 6 Academic, Lab & Library Fee',
    semesterNumber: 6,
    academicYear: '2025-2026',
    assignedAmountMinorUnits: 7500000, // ₹75,000.00
    concessionAmountMinorUnits: 500000, // ₹5,000.00
    dueDate: '2026-03-31',
    breakdown: {
      tuitionFeeMinorUnits: 5500000,
      labFeeMinorUnits: 1200000,
      libraryFeeMinorUnits: 400000,
      examFeeMinorUnits: 400000,
    },
    payments: [
      {
        id: '00000000-0000-0000-0000-000000000621',
        assignmentId: '00000000-0000-0000-0000-000000000611',
        studentId: USER_IDS.studentA1,
        amountMinorUnits: 4000000, // ₹40,000.00
        paymentMethod: 'UPI',
        idempotencyKey: 'IDEMP-20260301-A1',
        transactionReference: 'UPI-REF-20260301-9988',
        paidAt: '2026-03-01T14:32:00Z',
        status: 'verified',
        receiptNumber: 'REC-2026-CSE-00421',
      },
    ],
  };
}

function buildInitialDoubts(): CanonicalDoubtTicket[] {
  return [
    {
      id: 'dbt-101',
      studentId: USER_IDS.studentA1,
      studentName: 'Aarav Patel',
      rollNo: '23CSE042',
      section: 'Section A',
      subjectId: '00000000-0000-0000-0000-000000000351',
      subjectCode: 'CS601',
      subjectName: 'Compiler Design',
      facultyId: USER_IDS.facultyA1,
      facultyName: 'Prof. Vikram Mehta',
      title: 'Shift-Reduce Conflict in Dangling Else Parsing',
      initialQuestion: 'When writing LR(1) grammar for if-else, how does Bison resolve the dangling else ambiguity by default, and does precedence specification alter AST production?',
      status: 'open',
      reopenCount: 0,
      maxReopensAllowed: 2,
      canReopen: false,
      createdAt: '2026-03-23T14:10:00Z',
      updatedAt: '2026-03-23T14:10:00Z',
      messages: [
        {
          id: 'msg-1',
          doubtId: 'dbt-101',
          senderId: USER_IDS.studentA1,
          senderName: 'Aarav Patel',
          senderRole: 'Student',
          message: 'When writing LR(1) grammar for if-else, how does Bison resolve the dangling else ambiguity by default, and does precedence specification alter AST production?',
          attachmentName: 'lr1_table_snippet.y',
          createdAt: '2026-03-23T14:10:00Z',
        },
      ],
    },
  ];
}

function buildInitialAnnouncements(): CanonicalAnnouncement[] {
  return [
    {
      id: 'ann-1',
      title: 'End-Term Examination Schedule Released (Spring 2026)',
      content: 'The official end-term datesheet for 4th, 6th, and 8th semester B.Tech courses has been published. Download the hall ticket starting April 15, 2026.',
      category: 'Exam',
      priority: 'High',
      author: 'Office of the Controller of Examinations',
      targetAudience: 'All Students',
      createdAt: '2026-03-22T09:30:00Z',
      isRead: false,
    },
    {
      id: 'ann-2',
      title: 'Annual TechFest "InnovateX 2026" Call for Project Submissions',
      content: 'Submissions are invited for the annual flagship technical exhibition across IoT, AI Systems, Embedded Hardware, and Cloud Native domains. Cash prizes up to ₹2.5 Lakhs.',
      category: 'Event',
      priority: 'Normal',
      author: 'Dean of Student Affairs',
      targetAudience: 'All Students',
      createdAt: '2026-03-20T14:15:00Z',
      isRead: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// 3. CANONICAL STORE HOLDER
// ---------------------------------------------------------------------------

let canonicalLeaves = buildInitialLeaves();
let canonicalAttendanceLogs = buildInitialAttendanceLogs();
let canonicalAssessments = buildInitialAssessments();
let canonicalFeeAssignment = buildInitialFeeAssignment();
let canonicalDoubts = buildInitialDoubts();
let canonicalAnnouncements = buildInitialAnnouncements();

// ---------------------------------------------------------------------------
// 4. CROSS-MODULE SYNCHRONIZER CLASS
// ---------------------------------------------------------------------------

export class CrossModuleSynchronizer {
  /**
   * Resets entire canonical store to default seeded state.
   */
  public static reset(): void {
    canonicalLeaves = buildInitialLeaves();
    canonicalAttendanceLogs = buildInitialAttendanceLogs();
    canonicalAssessments = buildInitialAssessments();
    canonicalFeeAssignment = buildInitialFeeAssignment();
    canonicalDoubts = buildInitialDoubts();
    canonicalAnnouncements = buildInitialAnnouncements();
    NotificationService.reset();
  }

  // =========================================================================
  // JOURNEY 1: LEAVE JOURNEY
  // =========================================================================

  public static getLeaves(): CanonicalLeaveRequest[] {
    return [...canonicalLeaves];
  }

  public static getLeaveById(leaveId: string): CanonicalLeaveRequest | undefined {
    return canonicalLeaves.find((l) => l.id === leaveId);
  }

  public static submitLeaveRequest(input: {
    studentId?: string;
    studentName?: string;
    rollNo?: string;
    department?: string;
    section?: string;
    leaveType: 'Medical' | 'Personal' | 'On Duty' | 'Academic Event';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentName?: string;
    attachmentUrl?: string;
  }): CanonicalLeaveRequest {
    if (!input.startDate || !input.endDate) {
      throw new Error('LEAVE_DATES_REQUIRED: Start date and end date are mandatory');
    }
    if (new Date(input.endDate) < new Date(input.startDate)) {
      throw new Error('INVALID_LEAVE_DATES: End date cannot be earlier than start date');
    }
    if (!input.reason || input.reason.trim().length < 10) {
      throw new Error('INVALID_LEAVE_REASON: Reason must be at least 10 characters');
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

    const studentId = input.studentId || USER_IDS.studentA1;
    const studentName = input.studentName || 'Aarav Patel';
    const rollNo = input.rollNo || '23CSE042';

    const newRecord: CanonicalLeaveRequest = {
      id: `leave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId,
      studentName,
      rollNo,
      department: input.department || 'Computer Science & Engineering',
      section: input.section || 'Section A',
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      daysCount,
      reason: input.reason.trim(),
      status: 'submitted',
      attachmentName: input.attachmentName,
      attachmentUrl: input.attachmentUrl || (input.attachmentName ? `/documents/${input.attachmentName}` : undefined),
      currentAttendancePercent: 85.71,
      projectedAttendancePercent: Math.max(0, 85.71 - daysCount * 1.5),
      isAttendanceRisk: false,
      approverName: 'Prof. Vikram Mehta (Faculty Advisor)',
      decisionComment: null,
      clarificationComment: null,
      actionedBy: null,
      actionedAt: null,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canWithdraw: true,
      timeline: [
        {
          title: 'Leave Application Submitted',
          description: 'Application received and routed to faculty advisor',
          status: 'completed',
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        },
        {
          title: 'Faculty Advisor Review',
          description: 'Pending review by Prof. Vikram Mehta',
          status: 'current',
        },
        {
          title: 'Final Department Resolution',
          description: 'Decision recorded and attendance adjusted',
          status: 'upcoming',
        },
      ],
    };

    canonicalLeaves.unshift(newRecord);

    // Enqueue outbox notification
    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'LEAVE_SUBMITTED',
      payload: {
        leaveId: newRecord.id,
        studentId: newRecord.studentId,
        studentName: newRecord.studentName,
        rollNo: newRecord.rollNo,
        leaveType: newRecord.leaveType,
        startDate: newRecord.startDate,
        endDate: newRecord.endDate,
        facultyId: USER_IDS.facultyA1,
      },
    });

    return newRecord;
  }

  public static actionLeaveRequest(params: {
    leaveId: string;
    status: 'approved' | 'rejected' | 'clarification_requested';
    decisionComment: string;
    actorName?: string;
    actorRole?: 'Faculty' | 'Admin';
  }): CanonicalLeaveRequest {
    const leave = canonicalLeaves.find((l) => l.id === params.leaveId);
    if (!leave) {
      throw new Error('LEAVE_REQUEST_NOT_FOUND');
    }

    if (leave.status === 'approved' || leave.status === 'rejected' || leave.status === 'withdrawn') {
      throw new Error('LEAVE_REQUEST_ALREADY_RESOLVED');
    }

    if (!params.decisionComment || params.decisionComment.trim().length === 0) {
      throw new Error('DECISION_COMMENT_REQUIRED: Mandatory decision comment required for approving or rejecting leave');
    }

    const comment = params.decisionComment.trim();
    const actor = params.actorName || (params.actorRole === 'Admin' ? 'Academic Dean' : 'Prof. Vikram Mehta');

    leave.status = params.status;
    leave.updatedAt = new Date().toISOString();
    leave.actionedAt = new Date().toISOString();
    leave.actionedBy = actor;

    if (params.status === 'approved') {
      leave.decisionComment = comment;
      leave.canWithdraw = false;
      leave.timeline = [
        { title: 'Leave Application Submitted', status: 'completed' },
        { title: 'Faculty Advisor Endorsement', description: `Approved by ${actor}`, status: 'completed' },
        { title: 'Leave Approved', description: `Decision Note: "${comment}"`, status: 'completed', timestamp: 'Today' },
      ];
    } else if (params.status === 'rejected') {
      leave.decisionComment = comment;
      leave.canWithdraw = false;
      leave.timeline = [
        { title: 'Leave Application Submitted', status: 'completed' },
        { title: 'Application Rejected', description: `Reason: "${comment}"`, status: 'completed', timestamp: 'Today' },
      ];
    } else if (params.status === 'clarification_requested') {
      leave.clarificationComment = comment;
      leave.timeline = [
        { title: 'Leave Application Submitted', status: 'completed' },
        { title: 'Clarification Requested', description: `Action Required: "${comment}"`, status: 'current' },
        { title: 'Pending Resubmission', status: 'upcoming' },
      ];
    }

    // Enqueue outbox notification
    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'LEAVE_STATUS_CHANGED',
      payload: {
        leaveId: leave.id,
        studentId: leave.studentId,
        studentName: leave.studentName,
        newStatus: leave.status,
        decisionComment: leave.decisionComment || leave.clarificationComment,
        approverName: actor,
      },
    });

    return leave;
  }

  public static withdrawLeaveRequest(leaveId: string): boolean {
    const leave = canonicalLeaves.find((l) => l.id === leaveId);
    if (!leave) throw new Error('LEAVE_REQUEST_NOT_FOUND');

    if (leave.status === 'approved' || leave.status === 'rejected' || leave.status === 'withdrawn') {
      throw new Error('LEAVE_REQUEST_ALREADY_RESOLVED');
    }

    leave.status = 'withdrawn';
    leave.canWithdraw = false;
    leave.updatedAt = new Date().toISOString();
    leave.timeline = leave.timeline
      .map((step) => {
        if (step.status === 'current') {
          return {
            ...step,
            status: 'completed' as const,
            description: step.description ? `${step.description} (Superseded by withdrawal)` : 'Cancelled',
          };
        }
        return step;
      })
      .filter((step) => step.status !== 'upcoming');

    leave.timeline.push({
      title: 'Withdrawn by Student',
      description: 'Student cancelled application prior to final resolution',
      status: 'completed',
      timestamp: 'Just now',
    });

    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'LEAVE_STATUS_CHANGED',
      payload: {
        leaveId: leave.id,
        studentId: leave.studentId,
        studentName: leave.studentName,
        newStatus: 'withdrawn',
        approverName: leave.studentName,
      },
    });

    return true;
  }

  // =========================================================================
  // JOURNEY 2: ATTENDANCE JOURNEY
  // =========================================================================

  public static getAttendanceLogs(studentId: string = USER_IDS.studentA1): CanonicalAttendanceLog[] {
    return canonicalAttendanceLogs;
  }

  public static getAttendanceMetrics(studentId: string = USER_IDS.studentA1): AttendanceMetrics {
    const items: AttendanceItem[] = canonicalAttendanceLogs.map((log) => ({ status: log.status }));
    return calculateAttendanceMetrics(items, 75.0);
  }

  public static recordAttendanceSessionSubmission(params: {
    sessionId: string;
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    date: string;
    slotNumber: number;
    facultyName: string;
    records: { studentId: string; status: AttendanceStatus }[];
  }): void {
    for (const rec of params.records) {
      if (rec.studentId === USER_IDS.studentA1) {
        // Prepend new attendance record for student Aarav Patel
        const newLog: CanonicalAttendanceLog = {
          id: `att-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: params.date,
          slotNumber: params.slotNumber,
          subjectId: params.subjectId,
          subjectCode: params.subjectCode,
          subjectName: params.subjectName,
          status: rec.status,
          facultyName: params.facultyName,
          sessionId: params.sessionId,
        };
        canonicalAttendanceLogs.unshift(newLog);
      }
    }

    // Enqueue outbox notification
    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'ATTENDANCE_SUBMITTED',
      payload: {
        sessionId: params.sessionId,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        records: params.records,
      },
    });
  }

  // =========================================================================
  // JOURNEY 3: GRADING & EXAMINATION JOURNEY
  // =========================================================================

  public static getAssessments(): CanonicalAssessment[] {
    return [...canonicalAssessments];
  }

  public static getAssessmentById(assessmentId: string): CanonicalAssessment | undefined {
    return canonicalAssessments.find((a) => a.id === assessmentId);
  }

  public static submitAssessmentMarks(params: {
    assessmentId: string;
    status?: AssessmentStatus;
    records: { studentId: string; marks: number }[];
  }): CanonicalAssessment {
    const assessment = canonicalAssessments.find((a) => a.id === params.assessmentId);
    if (!assessment) throw new Error('ASSESSMENT_NOT_FOUND');

    for (const r of params.records) {
      if (r.marks < 0 || r.marks > assessment.maxMarks) {
        throw new Error(`INVALID_MARKS: ${r.marks} outside [0, ${assessment.maxMarks}]`);
      }
      const existing = assessment.records.find((rec) => rec.studentId === r.studentId);
      const gradeRes = calculateGradeFromMarks(r.marks, assessment.maxMarks);

      if (existing) {
        existing.marksObtained = r.marks;
        existing.percentage = gradeRes.percentage;
        existing.grade = gradeRes.grade;
        existing.gradePoints = gradeRes.gradePoints;
      } else {
        assessment.records.push({
          studentId: r.studentId,
          rollNo: r.studentId === USER_IDS.studentA1 ? '23CSE042' : '23CSE043',
          studentName: r.studentId === USER_IDS.studentA1 ? 'Aarav Patel' : 'Diya Kaur',
          marksObtained: r.marks,
          maxMarks: assessment.maxMarks,
          percentage: gradeRes.percentage,
          grade: gradeRes.grade,
          gradePoints: gradeRes.gradePoints,
          isAbsent: false,
        });
      }
    }

    if (params.status) {
      assessment.status = params.status;
    }

    return assessment;
  }

  public static publishAssessment(assessmentId: string, publisherEmail: string = 'exam.admin@campusos.dev'): CanonicalAssessment {
    const assessment = canonicalAssessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new Error('ASSESSMENT_NOT_FOUND');

    // State machine check: cannot publish draft assessment directly
    if (assessment.status === 'draft') {
      throw new Error('INVALID_ASSESSMENT_STATE: Cannot publish draft assessment. Must be submitted first.');
    }

    assessment.status = 'published';
    assessment.publishedAt = new Date().toISOString();

    // Enqueue outbox notification
    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'ASSESSMENT_PUBLISHED',
      payload: {
        assessmentId: assessment.id,
        name: assessment.name,
        subjectCode: assessment.subjectCode,
        subjectName: assessment.subjectName,
        publisherEmail,
        records: assessment.records.map((r) => ({
          studentId: r.studentId,
          marks: r.marksObtained,
          maxMarks: r.maxMarks,
          grade: r.grade,
        })),
      },
    });

    return assessment;
  }

  public static getPublishedStudentGrades(studentId: string = USER_IDS.studentA1): {
    publishedResults: CourseGradeEntry[];
    sgpa: number;
    pendingCount: number;
  } {
    // Strictly isolate published results from draft or submitted
    const publishedList: CourseGradeEntry[] = [];
    let pendingCount = 0;

    for (const a of canonicalAssessments) {
      if (a.status === 'published') {
        const studentRec = a.records.find((r) => r.studentId === studentId);
        if (studentRec && studentRec.marksObtained !== null) {
          publishedList.push({
            subjectCode: a.subjectCode,
            subjectName: a.subjectName,
            credits: a.subjectCode === 'CS601' ? 4 : 3,
            grade: studentRec.grade,
            gradePoints: studentRec.gradePoints,
          });
        }
      } else {
        pendingCount++;
      }
    }

    const sgpa = calculateSGPA(publishedList);
    return { publishedResults: publishedList, sgpa, pendingCount };
  }

  // =========================================================================
  // JOURNEY 4: FINANCE JOURNEY
  // =========================================================================

  public static getFeeAssignment(studentId: string = USER_IDS.studentA1): CanonicalStudentFeeAssignment {
    return canonicalFeeAssignment;
  }

  public static getFeeBalance(studentId: string = USER_IDS.studentA1): FeeBalanceMetrics {
    const payments: PaymentItem[] = canonicalFeeAssignment.payments.map((p) => ({
      amountMinorUnits: p.amountMinorUnits,
      status: p.status,
    }));
    return calculateFeeBalance(
      canonicalFeeAssignment.assignedAmountMinorUnits,
      canonicalFeeAssignment.concessionAmountMinorUnits,
      payments
    );
  }

  public static recordFeePayment(params: {
    studentId: string;
    amountMinorUnits: number;
    paymentMethod: 'UPI' | 'NetBanking' | 'Challan' | 'DD' | 'Cash';
    idempotencyKey: string;
    transactionReference: string;
    receiptNumber?: string;
  }): CanonicalPaymentReceipt {
    if (params.amountMinorUnits <= 0) {
      throw new Error('INVALID_PAYMENT_AMOUNT: Payment amount must be greater than zero');
    }

    // Idempotency guard: Return existing verified receipt if duplicate key is used
    const existing = canonicalFeeAssignment.payments.find((p) => p.idempotencyKey === params.idempotencyKey);
    if (existing) {
      return existing;
    }

    const receiptNo = params.receiptNumber || `REC-2026-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const newPayment: CanonicalPaymentReceipt = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assignmentId: canonicalFeeAssignment.id,
      studentId: params.studentId,
      amountMinorUnits: params.amountMinorUnits,
      paymentMethod: params.paymentMethod,
      idempotencyKey: params.idempotencyKey,
      transactionReference: params.transactionReference,
      paidAt: new Date().toISOString(),
      status: 'verified',
      receiptNumber: receiptNo,
    };

    canonicalFeeAssignment.payments.push(newPayment);

    // Enqueue outbox notification
    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'FEE_PAYMENT_VERIFIED',
      payload: {
        paymentId: newPayment.id,
        studentId: params.studentId,
        amountMinorUnits: params.amountMinorUnits,
        receiptNumber: newPayment.receiptNumber,
      },
    });

    return newPayment;
  }

  public static applyFeeConcession(params: {
    studentId: string;
    concessionAmountMinorUnits: number;
    reason: string;
  }): void {
    if (params.concessionAmountMinorUnits < 0) {
      throw new Error('INVALID_CONCESSION_AMOUNT: Concession cannot be negative');
    }
    canonicalFeeAssignment.concessionAmountMinorUnits = params.concessionAmountMinorUnits;
  }

  // =========================================================================
  // JOURNEY 5: COMMUNICATIONS & DOUBTS JOURNEY
  // =========================================================================

  public static getAnnouncements(): CanonicalAnnouncement[] {
    return [...canonicalAnnouncements];
  }

  public static createAnnouncement(input: {
    title: string;
    content: string;
    category?: string;
    priority?: 'Critical' | 'High' | 'Normal';
    author?: string;
    targetAudience?: 'All Students' | 'Faculty Only' | 'Department' | 'General';
    departmentCode?: string;
  }): CanonicalAnnouncement {
    const newAnn: CanonicalAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: input.title,
      content: input.content,
      category: input.category || 'General',
      priority: input.priority || 'Normal',
      author: input.author || 'Dean of Academic Affairs',
      targetAudience: input.targetAudience || 'All Students',
      departmentCode: input.departmentCode,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    canonicalAnnouncements.unshift(newAnn);

    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'ANNOUNCEMENT_PUBLISHED',
      payload: {
        announcementId: newAnn.id,
        title: newAnn.title,
        content: newAnn.content,
        targetAudience: newAnn.targetAudience,
      },
    });

    return newAnn;
  }

  public static getDoubts(): CanonicalDoubtTicket[] {
    return [...canonicalDoubts];
  }

  public static getDoubtById(doubtId: string): CanonicalDoubtTicket | undefined {
    return canonicalDoubts.find((d) => d.id === doubtId);
  }

  public static createDoubtTicket(input: {
    studentId?: string;
    studentName?: string;
    rollNo?: string;
    section?: string;
    subjectId: string;
    subjectCode?: string;
    subjectName?: string;
    facultyId?: string;
    facultyName?: string;
    title: string;
    question: string;
    attachmentName?: string;
  }): CanonicalDoubtTicket {
    const newDoubt: CanonicalDoubtTicket = {
      id: `dbt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId: input.studentId || USER_IDS.studentA1,
      studentName: input.studentName || 'Aarav Patel',
      rollNo: input.rollNo || '23CSE042',
      section: input.section || 'Section A',
      subjectId: input.subjectId,
      subjectCode: input.subjectCode || 'CS601',
      subjectName: input.subjectName || 'Compiler Design',
      facultyId: input.facultyId || USER_IDS.facultyA1,
      facultyName: input.facultyName || 'Dr. Vikram Mehta',
      title: input.title,
      initialQuestion: input.question,
      status: 'open',
      reopenCount: 0,
      maxReopensAllowed: 2,
      canReopen: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          doubtId: '',
          senderId: input.studentId || USER_IDS.studentA1,
          senderName: input.studentName || 'Aarav Patel',
          senderRole: 'Student',
          message: input.question,
          attachmentName: input.attachmentName,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    newDoubt.messages[0].doubtId = newDoubt.id;
    canonicalDoubts.unshift(newDoubt);

    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'DOUBT_CREATED',
      payload: {
        doubtId: newDoubt.id,
        studentName: newDoubt.studentName,
        subjectCode: newDoubt.subjectCode,
        title: newDoubt.title,
        facultyId: newDoubt.facultyId,
      },
    });

    return newDoubt;
  }

  public static replyToDoubt(params: {
    doubtId: string;
    senderId?: string;
    senderName?: string;
    senderRole: 'Student' | 'Faculty' | 'Admin';
    message: string;
    attachmentName?: string;
    attachmentUrl?: string;
  }): CanonicalDoubtMessage {
    const doubt = canonicalDoubts.find((d) => d.id === params.doubtId);
    if (!doubt) throw new Error('DOUBT_TICKET_NOT_FOUND');
    if (!params.message || params.message.trim().length === 0) {
      throw new Error('REPLY_TEXT_CANNOT_BE_EMPTY');
    }

    const newMsg: CanonicalDoubtMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      doubtId: doubt.id,
      senderId: params.senderId || (params.senderRole === 'Faculty' ? USER_IDS.facultyA1 : USER_IDS.studentA1),
      senderName: params.senderName || (params.senderRole === 'Faculty' ? 'Dr. Vikram Mehta' : 'Aarav Patel'),
      senderRole: params.senderRole,
      message: params.message.trim(),
      attachmentName: params.attachmentName,
      attachmentUrl: params.attachmentUrl,
      createdAt: new Date().toISOString(),
    };

    doubt.messages.push(newMsg);
    doubt.updatedAt = new Date().toISOString();
    if (params.senderRole === 'Faculty') {
      doubt.status = 'answered';
    }

    NotificationService.enqueueOutboxEvent({
      institutionId: INSTITUTION_A_ID,
      eventType: 'DOUBT_REPLIED',
      payload: {
        doubtId: doubt.id,
        senderRole: params.senderRole,
        senderName: newMsg.senderName,
        title: doubt.title,
        message: newMsg.message,
        studentId: doubt.studentId,
        facultyId: doubt.facultyId,
      },
    });

    return newMsg;
  }

  public static resolveDoubt(doubtId: string, replyMessage?: string): boolean {
    const doubt = canonicalDoubts.find((d) => d.id === doubtId);
    if (!doubt) throw new Error('DOUBT_TICKET_NOT_FOUND');

    doubt.status = 'resolved';
    doubt.canReopen = doubt.reopenCount < doubt.maxReopensAllowed;
    doubt.updatedAt = new Date().toISOString();

    if (replyMessage && replyMessage.trim().length > 0) {
      this.replyToDoubt({
        doubtId,
        senderRole: 'Faculty',
        message: replyMessage,
      });
    }

    return true;
  }

  public static reopenDoubt(doubtId: string, message: string): boolean {
    const doubt = canonicalDoubts.find((d) => d.id === doubtId);
    if (!doubt) throw new Error('DOUBT_TICKET_NOT_FOUND');

    if (doubt.status !== 'resolved') {
      throw new Error('DOUBT_NOT_RESOLVED: Only resolved tickets can be reopened');
    }

    if (doubt.reopenCount >= doubt.maxReopensAllowed) {
      throw new Error('DOUBT_REOPEN_LIMIT_EXCEEDED');
    }

    doubt.status = 'reopened';
    doubt.reopenCount += 1;
    doubt.canReopen = false; // Cannot reopen again until resolved
    doubt.updatedAt = new Date().toISOString();

    this.replyToDoubt({
      doubtId,
      senderRole: 'Student',
      message: `[Reopened Ticket]: ${message}`,
    });

    return true;
  }
}
