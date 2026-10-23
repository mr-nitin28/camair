/**
 * Faculty Domain Service — Authoritative Data Layer for Faculty Workflows
 * Uses pure domain calculations from @/lib/calculations and connects to Supabase
 * with deterministic fallback to seed data when Supabase remote connection is unavailable.
 * Supports keyboard roll-call attendance for 150+ students, spreadsheet marks entry,
 * split-pane approvals & doubts queues, and course resources.
 */

import {
  calculateAttendanceMetrics,
  calculateGradeFromMarks,
  type AttendanceItem,
  type AttendanceMetrics,
  type UGCGrade,
  type GradeCalculationResult,
} from '../calculations/index.ts';
import { CrossModuleSynchronizer } from './cross-module-store.ts';
import { NotificationService, USER_IDS } from './notification-service.ts';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
export type LeaveStatus = 'submitted' | 'under_review' | 'clarification_requested' | 'approved' | 'rejected' | 'withdrawn';
export type DoubtStatus = 'open' | 'answered' | 'resolved' | 'reopened';
export type AssessmentStatus = 'draft' | 'submitted' | 'reviewed' | 'published';

export interface FacultyProfileData {
  id: string;
  employeeCode: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  departmentCode: string;
  designation: string;
  cabin: string;
  academicSession: string;
}

export interface TeachingScheduleItem {
  id: string;
  sessionId: string;
  sessionDate: string;
  slotNumber: number;
  time: string;
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  room: string;
  type: 'Class' | 'Lab' | 'Seminar' | 'Meeting';
  status: 'scheduled' | 'submitted' | 'locked';
  enrolledCount: number;
  markedCount: number;
  deepLink: string;
  isNext?: boolean;
}

export interface AttendanceTaskItem {
  sessionId: string;
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  date: string;
  slotNumber: number;
  time: string;
  room: string;
  status: 'scheduled' | 'submitted' | 'locked';
  totalStudents: number;
  markedStudents: number;
  deepLink: string;
  isOverdue?: boolean;
}

export interface FacultyConsoleSummary {
  faculty: FacultyProfileData;
  metrics: {
    assignedSectionsCount: number;
    assignedSubjectsCount: number;
    totalScopedStudents: number;
    pendingAttendanceSessions: number;
    pendingLeavesCount: number;
    unansweredDoubtsCount: number;
    pendingGradingCount: number;
  };
  todaySchedule: TeachingScheduleItem[];
  attendanceTasks: AttendanceTaskItem[];
  pendingLeavesSummary: {
    totalPending: number;
    items: {
      id: string;
      studentName: string;
      rollNo: string;
      leaveType: string;
      dates: string;
      reason: string;
      isUrgent: boolean;
    }[];
  };
  unansweredDoubtsSummary: {
    totalUnanswered: number;
    items: {
      id: string;
      studentName: string;
      subjectCode: string;
      title: string;
      timeAgo: string;
      category: string;
    }[];
  };
  gradingDeadlines: {
    id: string;
    assessmentName: string;
    subjectCode: string;
    sectionName: string;
    dueDate: string;
    pendingEvaluations: number;
    totalSubmissions: number;
    status: AssessmentStatus;
  }[];
}

export interface ScopedStudent {
  id: string;
  enrollmentNo: string;
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  programme: string;
  semester: number;
  section: string;
  batch: string;
  attendancePercentage: number;
  isShortage: boolean;
  cgpa: number;
  sgpa: number;
  status: 'active' | 'at_risk' | 'on_leave';
  advisor: string;
  backlogsCount: number;
  contactAddress: string;
}

export interface StudentDirectoryFilter {
  search?: string;
  section?: string;
  batch?: string;
  status?: 'all' | 'active' | 'at_risk' | 'on_leave';
}

export interface AttendanceRosterStudent {
  id: string;
  studentId: string;
  enrollmentNo: string;
  rollNo: string;
  name: string;
  avatarUrl?: string;
  status: AttendanceStatus | 'Unmarked';
  currentAttendanceRate: number;
}

export interface AttendanceRevision {
  revisionNumber: number;
  reason: string;
  timestamp: string;
  performedBy: string;
  recordsCount: number;
}

export interface AttendanceSessionData {
  sessionId: string;
  teachingAssignmentId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  sectionId: string;
  sectionName: string;
  date: string;
  slotNumber: number;
  room: string;
  timeSlot: string;
  status: 'scheduled' | 'submitted' | 'locked';
  revisionCount: number;
  submittedAt: string | null;
  students: AttendanceRosterStudent[];
  revisions: AttendanceRevision[];
}

export interface SubmitAttendanceParams {
  sessionId: string;
  records: { student_id: string; status: AttendanceStatus }[];
  reason?: string;
  idempotencyKey?: string;
}

export interface AssessmentRecordItem {
  id: string;
  studentId: string;
  enrollmentNo: string;
  rollNo: string;
  studentName: string;
  marksObtained: number | null;
  maxMarks: number;
  percentage: number;
  grade: UGCGrade;
  gradePoints: number;
  isAbsent: boolean;
  comments?: string;
}

export interface MarksDiffItem {
  studentId: string;
  rollNo: string;
  studentName: string;
  originalMarks: number | null;
  proposedMarks: number | null;
  originalGrade: string;
  proposedGrade: string;
  delta: number;
  status: 'unchanged' | 'modified' | 'new';
}

export interface CsvImportError {
  row: number;
  column: string;
  value: string;
  reason: string;
}

export interface CsvImportResult {
  success: boolean;
  parsedCount: number;
  records: { rollNo: string; marks: number }[];
  errors: CsvImportError[];
}

export interface FacultyLeaveQueueItem {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  department: string;
  section: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: LeaveStatus;
  currentAttendancePercent: number;
  projectedAttendancePercent: number;
  isAttendanceRisk: boolean;
  decisionComment: string | null;
  submittedAt: string;
}

export interface DoubtMessageItem {
  id: string;
  senderRole: 'Student' | 'Faculty' | 'Admin';
  senderName: string;
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  timestamp: string;
}

export interface FacultyDoubtQueueItem {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  section: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  description: string;
  category: string;
  status: DoubtStatus;
  reopenCount: number;
  maxReopensAllowed: number;
  messages: DoubtMessageItem[];
  createdAt: string;
  lastReplyAt: string;
}

export interface FacultyAssignmentRecord {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  totalSubmissions: number;
  gradedCount: number;
  pendingCount: number;
  attachments: string[];
  createdAt: string;
}

export interface AssignmentSubmissionItem {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  submittedAt: string;
  status: 'Submitted' | 'Graded' | 'Late';
  marksObtained: number | null;
  maxMarks: number;
  feedback: string | null;
  attachmentName?: string;
}

export interface FacultyHandoutRecord {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  title: string;
  description: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: 'PDF' | 'Slide Deck' | 'Workbook' | 'Lab Manual' | 'Doc';
  version: string;
  isArchived: boolean;
  downloadCount: number;
  uploadedAt: string;
}

export interface StudentGroupRecord {
  id: string;
  name: string;
  category: 'Project' | 'Lab Batch' | 'Advisory' | 'Study Cohort';
  description: string;
  mentorName: string;
  sectionName: string;
  members: {
    id: string;
    studentId: string;
    name: string;
    rollNo: string;
    role: 'Lead' | 'Member';
  }[];
  milestonesCount: number;
  completedMilestones: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Seed Data Initialization (Deterministic 160+ Students & Scoped Resources)
// ---------------------------------------------------------------------------

const SEED_FACULTY_ID = '00000000-0000-0000-0000-000000000020';
const SEED_INSTITUTION_ID = '00000000-0000-0000-0000-000000000001';

const FIRST_NAMES = [
  'Aarav', 'Diya', 'Rohan', 'Ananya', 'Ishaan', 'Sneha', 'Kabir', 'Aditi',
  'Vikram', 'Meera', 'Arjun', 'Pooja', 'Tanvi', 'Karan', 'Neha', 'Rhea',
  'Aryan', 'Siddharth', 'Nisha', 'Rahul', 'Dev', 'Tara', 'Aditya', 'Maya',
];

const LAST_NAMES = [
  'Patel', 'Kaur', 'Verma', 'Sharma', 'Deshmukh', 'Reddy', 'Iyer', 'Nair',
  'Mehta', 'Gupta', 'Singh', 'Chopra', 'Malhotra', 'Bose', 'Chatterjee', 'Joshi',
];

// Deterministically generate 160 students for high-speed roll call & scoped queries
function generateScopedStudents(): ScopedStudent[] {
  const students: ScopedStudent[] = [];
  
  // Specific required seeds
  students.push({
    id: '00000000-0000-0000-0000-000000000030',
    enrollmentNo: 'EN2023CSE042',
    rollNo: '23CSE042',
    name: 'Aarav Patel',
    email: 'aarav.patel@mit.edu',
    phone: '+91 99999 00030',
    department: 'Computer Science & Engineering',
    programme: 'B.Tech Computer Science',
    semester: 6,
    section: 'Section A',
    batch: '2023-2027',
    attendancePercentage: 85.71,
    isShortage: false,
    cgpa: 8.75,
    sgpa: 8.90,
    status: 'active',
    advisor: 'Dr. Vikram Mehta',
    backlogsCount: 0,
    contactAddress: 'Hostel Block C, Room 304, Campus Main',
  });

  students.push({
    id: '00000000-0000-0000-0000-000000000031',
    enrollmentNo: 'EN2023CSE043',
    rollNo: '23CSE043',
    name: 'Diya Kaur',
    email: 'diya.kaur@mit.edu',
    phone: '+91 99999 00031',
    department: 'Computer Science & Engineering',
    programme: 'B.Tech Computer Science',
    semester: 6,
    section: 'Section A',
    batch: '2023-2027',
    attendancePercentage: 71.43,
    isShortage: true,
    cgpa: 7.80,
    sgpa: 8.10,
    status: 'at_risk',
    advisor: 'Dr. Vikram Mehta',
    backlogsCount: 1,
    contactAddress: 'Hostel Block A, Room 112, Campus Main',
  });

  // Generate students 3 to 162 (skipping 42 and 43 to avoid collision with seeded Aarav and Diya)
  for (let i = 3; i <= 162; i++) {
    if (i === 42 || i === 43) continue;
    const pad = i.toString().padStart(3, '0');
    const fIdx = (i * 7) % FIRST_NAMES.length;
    const lIdx = (i * 11) % LAST_NAMES.length;
    const isSectionB = i > 82;
    const section = isSectionB ? 'Section B' : 'Section A';
    const rollNo = `23CSE${pad}`;
    const enrollmentNo = `EN2023CSE${pad}`;
    const name = `${FIRST_NAMES[fIdx]} ${LAST_NAMES[lIdx]}`;
    const email = `${FIRST_NAMES[fIdx].toLowerCase()}.${LAST_NAMES[lIdx].toLowerCase()}${i}@mit.edu`;
    
    // Deterministic attendance percentage between 65% and 98%
    const rawAtt = 65 + ((i * 17) % 34);
    const isShortage = rawAtt < 75.0;
    const cgpa = Math.round((6.8 + ((i * 13) % 30) * 0.1) * 100) / 100;
    const sgpa = Math.round((7.0 + ((i * 19) % 29) * 0.1) * 100) / 100;

    students.push({
      id: `00000000-0000-0000-0000-${pad.padStart(12, '0')}`,
      enrollmentNo,
      rollNo,
      name,
      email,
      phone: `+91 98765 ${pad.padEnd(5, '0')}`,
      department: 'Computer Science & Engineering',
      programme: 'B.Tech Computer Science',
      semester: 6,
      section,
      batch: '2023-2027',
      attendancePercentage: rawAtt,
      isShortage,
      cgpa,
      sgpa,
      status: isShortage ? 'at_risk' : 'active',
      advisor: i % 4 === 0 ? 'Dr. Vikram Mehta' : 'Prof. Ananya Deshmukh',
      backlogsCount: isShortage ? (i % 2 === 0 ? 1 : 2) : 0,
      contactAddress: `Campus Hostel ${isSectionB ? 'Block D' : 'Block B'}, Room ${100 + (i % 50)}`,
    });
  }

  return students;
}

const GLOBAL_SCOPED_STUDENTS = generateScopedStudents();

// ---------------------------------------------------------------------------
// Local Memory Stores for Faculty State (Online/Offline Resilience)
// ---------------------------------------------------------------------------

let sessionsStore: Record<string, AttendanceSessionData> = {};

function initSessionsStore() {
  const session1Id = '00000000-0000-0000-0000-000000000501';
  const session2Id = '00000000-0000-0000-0000-000000000502';
  const todaySessionId = '00000000-0000-0000-0000-000000000503';

  // Session 1 (Historical submitted session with revisions)
  const roster1: AttendanceRosterStudent[] = GLOBAL_SCOPED_STUDENTS.slice(0, 60).map((s, idx) => ({
    id: s.id,
    studentId: s.id,
    enrollmentNo: s.enrollmentNo,
    rollNo: s.rollNo,
    name: s.name,
    status: idx === 1 || idx === 14 ? 'Absent' : idx === 5 ? 'Late' : 'Present',
    currentAttendanceRate: s.attendancePercentage,
  }));

  sessionsStore[session1Id] = {
    sessionId: session1Id,
    teachingAssignmentId: '00000000-0000-0000-0000-000000000361',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    sectionId: '00000000-0000-0000-0000-000000000341',
    sectionName: 'Section A',
    date: '2026-03-01',
    slotNumber: 1,
    room: 'Room 304, Tech Wing',
    timeSlot: '09:00 AM - 10:30 AM',
    status: 'submitted',
    revisionCount: 1,
    submittedAt: '2026-03-01T10:35:00Z',
    students: roster1,
    revisions: [
      {
        revisionNumber: 1,
        reason: 'Initial session submission at lecture conclusion',
        timestamp: '2026-03-01T10:35:00Z',
        performedBy: 'Dr. Vikram Mehta',
        recordsCount: roster1.length,
      },
    ],
  };

  // Session 2 (Scheduled future session)
  const roster2: AttendanceRosterStudent[] = GLOBAL_SCOPED_STUDENTS.slice(0, 60).map((s) => ({
    id: s.id,
    studentId: s.id,
    enrollmentNo: s.enrollmentNo,
    rollNo: s.rollNo,
    name: s.name,
    status: 'Unmarked',
    currentAttendanceRate: s.attendancePercentage,
  }));

  sessionsStore[session2Id] = {
    sessionId: session2Id,
    teachingAssignmentId: '00000000-0000-0000-0000-000000000361',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    sectionId: '00000000-0000-0000-0000-000000000341',
    sectionName: 'Section A',
    date: '2026-03-02',
    slotNumber: 1,
    room: 'Room 304, Tech Wing',
    timeSlot: '09:00 AM - 10:30 AM',
    status: 'scheduled',
    revisionCount: 0,
    submittedAt: null,
    students: roster2,
    revisions: [],
  };

  // Session 3: Today's High-Speed Roll Call Session with 150+ students (Section A + B Cohort)
  const fullRoster: AttendanceRosterStudent[] = GLOBAL_SCOPED_STUDENTS.map((s) => ({
    id: s.id,
    studentId: s.id,
    enrollmentNo: s.enrollmentNo,
    rollNo: s.rollNo,
    name: s.name,
    status: 'Unmarked',
    currentAttendanceRate: s.attendancePercentage,
  }));

  sessionsStore[todaySessionId] = {
    sessionId: todaySessionId,
    teachingAssignmentId: '00000000-0000-0000-0000-000000000361',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design (Lecture & Lab Cohort)',
    sectionId: '00000000-0000-0000-0000-000000000341',
    sectionName: 'Section A & B (Combined)',
    date: new Date().toISOString().split('T')[0],
    slotNumber: 2,
    room: 'Auditorium Hall 2',
    timeSlot: '10:45 AM - 12:15 PM',
    status: 'scheduled',
    revisionCount: 0,
    submittedAt: null,
    students: fullRoster,
    revisions: [],
  };
}

initSessionsStore();

// Undo snapshots history for attendance submissions
const sessionPreviousSnapshots = new Map<string, {
  status: 'scheduled' | 'submitted' | 'locked';
  revisionCount: number;
  submittedAt: string | null;
  students: AttendanceRosterStudent[];
  revisions: AttendanceRevision[];
}[]>();

// Assessments & Marks Store
let assessmentsStore: Record<string, {
  id: string;
  name: string;
  type: string;
  subjectCode: string;
  subjectName: string;
  maxMarks: number;
  weightage: number;
  status: AssessmentStatus;
  records: AssessmentRecordItem[];
}> = {
  '00000000-0000-0000-0000-000000000411': {
    id: '00000000-0000-0000-0000-000000000411',
    name: 'Mid-Term Exam',
    type: 'midterm',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    maxMarks: 50.0,
    weightage: 30.0,
    status: 'published',
    records: GLOBAL_SCOPED_STUDENTS.slice(0, 60).map((s, idx) => {
      const marks = idx === 0 ? 44.5 : idx === 1 ? 37.0 : Math.round((28 + ((idx * 17) % 22)) * 10) / 10;
      const g = calculateGradeFromMarks(marks, 50.0);
      return {
        id: `res-${s.id}`,
        studentId: s.id,
        enrollmentNo: s.enrollmentNo,
        rollNo: s.rollNo,
        studentName: s.name,
        marksObtained: marks,
        maxMarks: 50.0,
        percentage: g.percentage,
        grade: g.grade,
        gradePoints: g.gradePoints,
        isAbsent: false,
      };
    }),
  },
  '00000000-0000-0000-0000-000000000412': {
    id: '00000000-0000-0000-0000-000000000412',
    name: 'End-Term Theory Evaluation',
    type: 'final_theory',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    maxMarks: 100.0,
    weightage: 50.0,
    status: 'submitted',
    records: GLOBAL_SCOPED_STUDENTS.slice(0, 60).map((s, idx) => {
      const marks = idx === 0 ? 88.0 : idx === 1 ? 75.0 : Math.round((55 + ((idx * 19) % 40)) * 10) / 10;
      const g = calculateGradeFromMarks(marks, 100.0);
      return {
        id: `res-end-${s.id}`,
        studentId: s.id,
        enrollmentNo: s.enrollmentNo,
        rollNo: s.rollNo,
        studentName: s.name,
        marksObtained: marks,
        maxMarks: 100.0,
        percentage: g.percentage,
        grade: g.grade,
        gradePoints: g.gradePoints,
        isAbsent: false,
      };
    }),
  },
  '00000000-0000-0000-0000-000000000413': {
    id: '00000000-0000-0000-0000-000000000413',
    name: 'Quiz 1 & Lexical Analysis Sprint',
    type: 'assignment',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    maxMarks: 20.0,
    weightage: 10.0,
    status: 'draft',
    records: GLOBAL_SCOPED_STUDENTS.slice(0, 60).map((s, idx) => {
      const marks = idx === 0 ? 18.0 : idx === 1 ? 14.5 : Math.round((10 + ((idx * 7) % 10)) * 10) / 10;
      const g = calculateGradeFromMarks(marks, 20.0);
      return {
        id: `res-quiz-${s.id}`,
        studentId: s.id,
        enrollmentNo: s.enrollmentNo,
        rollNo: s.rollNo,
        studentName: s.name,
        marksObtained: marks,
        maxMarks: 20.0,
        percentage: g.percentage,
        grade: g.grade,
        gradePoints: g.gradePoints,
        isAbsent: false,
      };
    }),
  },
};

// Leave Requests Store
let leavesStore: FacultyLeaveQueueItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000701',
    studentId: '00000000-0000-0000-0000-000000000030',
    studentName: 'Aarav Patel',
    rollNo: '23CSE042',
    department: 'Computer Science & Engineering',
    section: 'Section A',
    leaveType: 'Medical Leave',
    startDate: '2026-03-10',
    endDate: '2026-03-12',
    daysCount: 3,
    reason: 'Medical Leave: Viral Fever prescribed bed rest with hospital consultation note.',
    attachmentUrl: '/documents/medical_cert_aarav.pdf',
    attachmentName: 'medical_cert_aarav.pdf',
    status: 'submitted',
    currentAttendancePercent: 85.71,
    projectedAttendancePercent: 83.20,
    isAttendanceRisk: false,
    decisionComment: null,
    submittedAt: '2026-03-08T09:30:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000702',
    studentId: '00000000-0000-0000-0000-000000000031',
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
    isAttendanceRisk: true, // Warning: currently below 75% threshold!
    decisionComment: null,
    submittedAt: '2026-03-22T11:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000703',
    studentId: GLOBAL_SCOPED_STUDENTS[4].id,
    studentName: GLOBAL_SCOPED_STUDENTS[4].name,
    rollNo: GLOBAL_SCOPED_STUDENTS[4].rollNo,
    department: 'Computer Science & Engineering',
    section: 'Section A',
    leaveType: 'Personal Leave',
    startDate: '2026-02-18',
    endDate: '2026-02-19',
    daysCount: 2,
    reason: 'Family emergency and sister marriage ceremony in hometown.',
    attachmentUrl: null,
    attachmentName: null,
    status: 'approved',
    currentAttendancePercent: 82.5,
    projectedAttendancePercent: 82.5,
    isAttendanceRisk: false,
    decisionComment: 'Approved. Student instructed to collect lab catch-up notes from class rep.',
    submittedAt: '2026-02-14T08:00:00Z',
  },
];

// Doubts Store
let doubtsStore: FacultyDoubtQueueItem[] = [
  {
    id: 'dbt-101',
    studentId: '00000000-0000-0000-0000-000000000030',
    studentName: 'Aarav Patel',
    rollNo: '23CSE042',
    section: 'Section A',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    title: 'Shift-Reduce Conflict in Dangling Else Parsing',
    description: 'When writing LR(1) grammar for if-else, how does Bison resolve the dangling else ambiguity by default, and does precedence specification alter AST production?',
    category: 'Grammar Ambiguity & LR Tables',
    status: 'open',
    reopenCount: 0,
    maxReopensAllowed: 2,
    messages: [
      {
        id: 'msg-1',
        senderRole: 'Student',
        senderName: 'Aarav Patel',
        text: 'Sir, during LR(1) table construction for nested if-then-else statements, state 14 exhibits a Shift-Reduce conflict between shifting ELSE and reducing conditional_stmt. Does default shift behavior guarantee binding to nearest if?',
        attachmentName: 'lr1_table_snippet.y',
        timestamp: '2026-03-23T14:10:00Z',
      },
    ],
    createdAt: '2026-03-23T14:10:00Z',
    lastReplyAt: '2026-03-23T14:10:00Z',
  },
  {
    id: 'dbt-102',
    studentId: '00000000-0000-0000-0000-000000000031',
    studentName: 'Diya Kaur',
    rollNo: '23CSE043',
    section: 'Section A',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    title: 'Clarification on LL(1) First & Follow Set for Epsilon Transitions',
    description: 'When non-terminal A derives epsilon, does Follow(A) automatically propagate into First set of trailing tokens during non-deterministic parsing?',
    category: 'Parsing Algorithms',
    status: 'answered',
    reopenCount: 0,
    maxReopensAllowed: 2,
    messages: [
      {
        id: 'msg-2a',
        senderRole: 'Student',
        senderName: 'Diya Kaur',
        text: 'Could you please clarify if epsilon derivation in First(Y) requires adding First(Z) or Follow(X) when computing table entries M[A, a]?',
        timestamp: '2026-03-20T10:00:00Z',
      },
      {
        id: 'msg-2b',
        senderRole: 'Faculty',
        senderName: 'Dr. Vikram Mehta',
        text: 'When computing First(Y_1 Y_2 ... Y_k), if epsilon is in First(Y_1), you include (First(Y_2) - {epsilon}). Only if all Y_i derive epsilon do you add epsilon to the aggregate First set. Review slides 28-32 in Handout v2.1.',
        timestamp: '2026-03-20T16:45:00Z',
      },
    ],
    createdAt: '2026-03-20T10:00:00Z',
    lastReplyAt: '2026-03-20T16:45:00Z',
  },
];

// Assignments Store
let assignmentsStore: FacultyAssignmentRecord[] = [
  {
    id: 'asg-01',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    sectionName: 'Section A & B',
    title: 'Lexical Analyzer & Finite Automaton Engine in C/Rust',
    description: 'Implement a lexical analyzer generating tokens for a subset of C language (identifiers, numbers, keywords, arithmetic operators). Output symbol table JSON.',
    dueDate: '2026-04-10',
    maxMarks: 50,
    totalSubmissions: 58,
    gradedCount: 42,
    pendingCount: 16,
    attachments: ['CS601_Assignment1_Spec.pdf', 'test_tokens_sample.c'],
    createdAt: '2026-03-15T09:00:00Z',
  },
  {
    id: 'asg-02',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    sectionName: 'Section A',
    title: 'Bottom-Up LR(1) Parser Table Construction',
    description: 'Construct canonical LR(1) items collection and action/goto lookup tables for the specified expression grammar with shift-reduce resolution.',
    dueDate: '2026-04-20',
    maxMarks: 40,
    totalSubmissions: 24,
    gradedCount: 0,
    pendingCount: 24,
    attachments: ['CS601_Assignment2_Grammar.pdf'],
    createdAt: '2026-03-22T11:00:00Z',
  },
];

let assignmentSubmissionsStore: Record<string, AssignmentSubmissionItem[]> = {
  'asg-01': [
    {
      id: 'sub-01',
      assignmentId: 'asg-01',
      studentId: '00000000-0000-0000-0000-000000000030',
      studentName: 'Aarav Patel',
      rollNo: '23CSE042',
      submittedAt: '2026-04-02T16:20:00Z',
      status: 'Graded',
      marksObtained: 48,
      maxMarks: 50,
      feedback: 'Excellent clean regex token scanner implementation. Symbol table hash lookup is O(1) and error handling is exemplary.',
      attachmentName: 'aarav_lexer_c_submission.zip',
    },
    {
      id: 'sub-02',
      assignmentId: 'asg-01',
      studentId: '00000000-0000-0000-0000-000000000031',
      studentName: 'Diya Kaur',
      rollNo: '23CSE043',
      submittedAt: '2026-04-05T19:40:00Z',
      status: 'Submitted',
      marksObtained: null,
      maxMarks: 50,
      feedback: null,
      attachmentName: 'diya_kaur_lexical_scanner.zip',
    },
    {
      id: 'sub-03',
      assignmentId: 'asg-01',
      studentId: GLOBAL_SCOPED_STUDENTS[3].id,
      studentName: GLOBAL_SCOPED_STUDENTS[3].name,
      rollNo: GLOBAL_SCOPED_STUDENTS[3].rollNo,
      submittedAt: '2026-04-06T11:15:00Z',
      status: 'Submitted',
      marksObtained: null,
      maxMarks: 50,
      feedback: null,
      attachmentName: 'ananya_assignment1.tar.gz',
    },
  ],
};

// Handouts & Notes Store
let handoutsStore: FacultyHandoutRecord[] = [
  {
    id: 'note-01',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    sectionName: 'Section A & B',
    title: 'Lexical Analysis, Thompson Construction & DFA Minimization',
    description: 'Comprehensive slides and hand-worked proofs for Thompson construction, subset construction, and Hopcroft table minimization algorithm.',
    fileName: 'CS601_Lexical_Analysis_v2.pdf',
    fileSizeBytes: 4250000,
    fileType: 'PDF',
    version: 'v2.1',
    isArchived: false,
    downloadCount: 142,
    uploadedAt: '2026-03-22T08:30:00Z',
  },
  {
    id: 'note-02',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    sectionName: 'Section A',
    title: 'LR(1) and LALR(1) Parsing Table Synthesis Guide',
    description: 'Detailed manual step-by-step walkthrough on computing closure items, lookahead propagation, and parsing table conflict resolution.',
    fileName: 'CS601_LALR_Parsing_Guide_v1.pdf',
    fileSizeBytes: 3120000,
    fileType: 'PDF',
    version: 'v1.4',
    isArchived: false,
    downloadCount: 98,
    uploadedAt: '2026-03-18T14:15:00Z',
  },
  {
    id: 'note-03',
    subjectId: '00000000-0000-0000-0000-000000000351',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    sectionName: 'Lab Batches L1 & L2',
    title: 'Flex & Bison Toolchain Lab Manual and Starter Kit',
    description: 'Complete setup guide for compiling Flex lexer and Bison LALR parser on Linux/macOS/Windows WSL with Makefile templates.',
    fileName: 'CS601L_Flex_Bison_Starter.zip',
    fileSizeBytes: 8900000,
    fileType: 'Lab Manual',
    version: 'v1.0',
    isArchived: false,
    downloadCount: 165,
    uploadedAt: '2026-03-05T10:00:00Z',
  },
];

// Student Groups Store
let studentGroupsStore: StudentGroupRecord[] = [
  {
    id: 'grp-01',
    name: 'Compiler Optimization & LLVM JIT Research Team',
    category: 'Project',
    description: 'B.Tech Capstone Project Team building an ahead-of-time bytecode optimizer and LLVM JIT backend for toy procedural language.',
    mentorName: 'Dr. Vikram Mehta',
    sectionName: 'Section A',
    members: [
      { id: 'm1', studentId: '00000000-0000-0000-0000-000000000030', name: 'Aarav Patel', rollNo: '23CSE042', role: 'Lead' },
      { id: 'm2', studentId: '00000000-0000-0000-0000-000000000031', name: 'Diya Kaur', rollNo: '23CSE043', role: 'Member' },
      { id: 'm3', studentId: GLOBAL_SCOPED_STUDENTS[4].id, name: GLOBAL_SCOPED_STUDENTS[4].name, rollNo: GLOBAL_SCOPED_STUDENTS[4].rollNo, role: 'Member' },
      { id: 'm4', studentId: GLOBAL_SCOPED_STUDENTS[5].id, name: GLOBAL_SCOPED_STUDENTS[5].name, rollNo: GLOBAL_SCOPED_STUDENTS[5].rollNo, role: 'Member' },
    ],
    milestonesCount: 5,
    completedMilestones: 3,
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'grp-02',
    name: 'CSE Section A — Academic Mentorship Advisory Cohort',
    category: 'Advisory',
    description: 'Bi-weekly faculty advisory cohort tracking academic performance, attendance recovery plans, and career placement preparation.',
    mentorName: 'Dr. Vikram Mehta',
    sectionName: 'Section A',
    members: GLOBAL_SCOPED_STUDENTS.slice(0, 15).map((s, idx) => ({
      id: `adv-${s.id}`,
      studentId: s.id,
      name: s.name,
      rollNo: s.rollNo,
      role: idx === 0 ? 'Lead' : 'Member',
    })),
    milestonesCount: 4,
    completedMilestones: 2,
    createdAt: '2026-01-10T09:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Faculty Domain Service Public API
// ---------------------------------------------------------------------------

export const FacultyService = {
  /**
   * Fetches full dashboard console summary with active deep-links to sessions,
   * leaves, doubts, and grading tasks.
   */
  async getConsoleSummary(facultyId: string = SEED_FACULTY_ID): Promise<FacultyConsoleSummary> {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySession = sessionsStore['00000000-0000-0000-0000-000000000503'];

    const faculty: FacultyProfileData = {
      id: facultyId,
      employeeCode: 'FAC-CS-001',
      name: 'Dr. Vikram Mehta',
      firstName: 'Vikram',
      lastName: 'Mehta',
      email: 'faculty@campusos.dev',
      phone: '+91 99999 00020',
      department: 'Computer Science & Engineering',
      departmentCode: 'CSE',
      designation: 'Associate Professor & Academic Proctor',
      cabin: 'Faculty Block A, Room 302',
      academicSession: '2025-2026',
    };

    const todaySchedule: TeachingScheduleItem[] = [
      {
        id: 'sch-1',
        sessionId: todaySession.sessionId,
        sessionDate: todayStr,
        slotNumber: 2,
        time: '10:45 AM - 12:15 PM',
        subjectCode: 'CS601',
        subjectName: 'Compiler Design',
        sectionName: 'Section A & B (Combined)',
        room: 'Auditorium Hall 2',
        type: 'Class',
        status: todaySession.status,
        enrolledCount: todaySession.students.length,
        markedCount: todaySession.students.filter((s) => s.status !== 'Unmarked').length,
        deepLink: `/faculty/attendance?sessionId=${todaySession.sessionId}&date=${todayStr}&subjectId=${todaySession.subjectId}`,
        isNext: true,
      },
      {
        id: 'sch-2',
        sessionId: '00000000-0000-0000-0000-000000000502',
        sessionDate: todayStr,
        slotNumber: 3,
        time: '02:00 PM - 04:00 PM',
        subjectCode: 'CS605L',
        subjectName: 'Compiler Design Lab',
        sectionName: 'Lab Batch L1',
        room: 'Computer Lab 3, Tech Wing',
        type: 'Lab',
        status: 'scheduled',
        enrolledCount: 30,
        markedCount: 0,
        deepLink: `/faculty/attendance?sessionId=00000000-0000-0000-0000-000000000502&date=${todayStr}&subjectId=00000000-0000-0000-0000-000000000351`,
        isNext: false,
      },
      {
        id: 'sch-3',
        sessionId: 'sch-sync-capstone',
        sessionDate: todayStr,
        slotNumber: 4,
        time: '04:30 PM - 05:30 PM',
        subjectCode: 'CAPSTONE',
        subjectName: 'LLVM JIT Capstone Review',
        sectionName: 'Project Team Grp-01',
        room: 'Faculty Cabin 302',
        type: 'Meeting',
        status: 'scheduled',
        enrolledCount: 4,
        markedCount: 4,
        deepLink: `/faculty/groups`,
        isNext: false,
      },
    ];

    const attendanceTasks: AttendanceTaskItem[] = [
      {
        sessionId: todaySession.sessionId,
        subjectCode: 'CS601',
        subjectName: 'Compiler Design',
        sectionName: 'Section A & B',
        date: todayStr,
        slotNumber: 2,
        time: '10:45 AM - 12:15 PM',
        room: 'Auditorium Hall 2',
        status: todaySession.status,
        totalStudents: todaySession.students.length,
        markedStudents: todaySession.students.filter((s) => s.status !== 'Unmarked').length,
        deepLink: `/faculty/attendance?sessionId=${todaySession.sessionId}&date=${todayStr}&subjectId=${todaySession.subjectId}`,
        isOverdue: false,
      },
      {
        sessionId: '00000000-0000-0000-0000-000000000501',
        subjectCode: 'CS601',
        subjectName: 'Compiler Design (Revision Review)',
        sectionName: 'Section A',
        date: '2026-03-01',
        slotNumber: 1,
        time: '09:00 AM - 10:30 AM',
        room: 'Room 304, Tech Wing',
        status: 'submitted',
        totalStudents: 60,
        markedStudents: 60,
        deepLink: `/faculty/attendance?sessionId=00000000-0000-0000-0000-000000000501&date=2026-03-01&subjectId=00000000-0000-0000-0000-000000000351`,
      },
    ];

    const pendingLeaves = leavesStore.filter((l) => l.status === 'submitted');
    const pendingDoubts = doubtsStore.filter((d) => d.status === 'open');

    return {
      faculty,
      metrics: {
        assignedSectionsCount: 2,
        assignedSubjectsCount: 2,
        totalScopedStudents: GLOBAL_SCOPED_STUDENTS.length,
        pendingAttendanceSessions: attendanceTasks.filter((t) => t.status === 'scheduled').length,
        pendingLeavesCount: pendingLeaves.length,
        unansweredDoubtsCount: pendingDoubts.length,
        pendingGradingCount: 40,
      },
      todaySchedule,
      attendanceTasks,
      pendingLeavesSummary: {
        totalPending: pendingLeaves.length,
        items: pendingLeaves.map((l) => ({
          id: l.id,
          studentName: l.studentName,
          rollNo: l.rollNo,
          leaveType: l.leaveType,
          dates: `${l.startDate} to ${l.endDate} (${l.daysCount}d)`,
          reason: l.reason,
          isUrgent: l.isAttendanceRisk,
        })),
      },
      unansweredDoubtsSummary: {
        totalUnanswered: pendingDoubts.length,
        items: pendingDoubts.map((d) => ({
          id: d.id,
          studentName: d.studentName,
          subjectCode: d.subjectCode,
          title: d.title,
          timeAgo: '1 day ago',
          category: d.category,
        })),
      },
      gradingDeadlines: [
        {
          id: 'asg-01',
          assessmentName: 'Lexical Analyzer Sprint',
          subjectCode: 'CS601',
          sectionName: 'Section A & B',
          dueDate: '2026-04-10',
          pendingEvaluations: 16,
          totalSubmissions: 58,
          status: 'submitted',
        },
        {
          id: '00000000-0000-0000-0000-000000000413',
          assessmentName: 'Quiz 1 Marks Entry',
          subjectCode: 'CS601',
          sectionName: 'Section A',
          dueDate: '2026-04-12',
          pendingEvaluations: 24,
          totalSubmissions: 60,
          status: 'draft',
        },
      ],
    };
  },

  /**
   * Scoped student directory queries — returns only students within the
   * faculty member's department and assigned sections/advisory scope.
   */
  async getScopedStudents(
    facultyId: string = SEED_FACULTY_ID,
    filters: StudentDirectoryFilter = {}
  ): Promise<ScopedStudent[]> {
    let result = [...GLOBAL_SCOPED_STUDENTS];

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q) ||
          s.enrollmentNo.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }

    if (filters.section && filters.section !== 'All') {
      result = result.filter((s) => s.section === filters.section);
    }

    if (filters.batch && filters.batch !== 'All') {
      result = result.filter((s) => s.batch === filters.batch);
    }

    if (filters.status && filters.status !== 'all') {
      result = result.filter((s) => s.status === filters.status);
    }

    return result;
  },

  /**
   * Fetches full attendance session data for high-speed roll call screen.
   */
  async getAttendanceSession(sessionId?: string): Promise<AttendanceSessionData> {
    const targetId = sessionId || '00000000-0000-0000-0000-000000000503';
    const session = sessionsStore[targetId] || sessionsStore['00000000-0000-0000-0000-000000000503'];
    return JSON.parse(JSON.stringify(session));
  },

  /**
   * Atomic attendance submission conforming to transactional RPC `rpc_submit_attendance_session`.
   * Enforces mandatory revision reason when modifying an already submitted session.
   */
  async submitAttendanceSession(params: SubmitAttendanceParams): Promise<{
    success: boolean;
    sessionId: string;
    revisionNumber: number;
    submittedAt: string;
    message: string;
  }> {
    const session = sessionsStore[params.sessionId];
    if (!session) {
      throw new Error('ATTENDANCE_SESSION_NOT_FOUND');
    }

    if (session.status === 'locked') {
      throw new Error('ATTENDANCE_SESSION_LOCKED: Locked session cannot be modified');
    }

    // Correction flow: mandatory revision reason required when modifying an already submitted session
    if (session.status === 'submitted') {
      if (!params.reason || params.reason.trim().length < 5) {
        throw new Error('CORRECTION_REASON_REQUIRED: Modifying submitted attendance requires documented reason (min 5 characters)');
      }
    }

    // Save previous snapshot for undo toast support
    const previousSnapshot = {
      status: session.status,
      revisionCount: session.revisionCount,
      submittedAt: session.submittedAt,
      students: JSON.parse(JSON.stringify(session.students)),
      revisions: JSON.parse(JSON.stringify(session.revisions)),
    };
    if (!sessionPreviousSnapshots.has(params.sessionId)) {
      sessionPreviousSnapshots.set(params.sessionId, []);
    }
    sessionPreviousSnapshots.get(params.sessionId)!.push(previousSnapshot);

    // Apply marks to session roster
    const map = new Map<string, AttendanceStatus>();
    params.records.forEach((r) => {
      const sid = r.student_id || (r as unknown as { studentId?: string }).studentId;
      if (sid) map.set(sid, r.status);
    });

    session.students.forEach((s) => {
      if (map.has(s.studentId)) {
        s.status = map.get(s.studentId)!;
      }
    });

    const newRevisionCount = session.revisionCount + 1;
    const nowIso = new Date().toISOString();

    session.status = 'submitted';
    session.revisionCount = newRevisionCount;
    session.submittedAt = session.submittedAt || nowIso;

    session.revisions.unshift({
      revisionNumber: newRevisionCount,
      reason: params.reason || params.idempotencyKey || 'Attendance submitted by faculty',
      timestamp: nowIso,
      performedBy: 'Dr. Vikram Mehta',
      recordsCount: params.records.length,
    });

    CrossModuleSynchronizer.recordAttendanceSessionSubmission({
      sessionId: session.sessionId,
      subjectId: session.subjectId,
      subjectCode: session.subjectCode,
      subjectName: session.subjectName,
      date: session.date,
      slotNumber: session.slotNumber,
      facultyName: 'Dr. Vikram Mehta',
      records: params.records.map((r) => ({
        studentId: r.student_id || (r as unknown as { studentId?: string }).studentId || '',
        status: r.status,
      })),
    });

    return {
      success: true,
      sessionId: session.sessionId,
      revisionNumber: newRevisionCount,
      submittedAt: nowIso,
      message: `Successfully submitted attendance session for ${params.records.length} students (Rev ${newRevisionCount}).`,
    };
  },

  /**
   * Reverts the most recent attendance submission within the undo grace window.
   * Restores session status, revision history, and student rosters back to previous state.
   */
  async undoAttendanceSubmission(sessionId: string): Promise<{
    success: boolean;
    sessionId: string;
    status: 'scheduled' | 'submitted' | 'locked';
    revisionCount: number;
    message: string;
  }> {
    const session = sessionsStore[sessionId];
    if (!session) {
      throw new Error('ATTENDANCE_SESSION_NOT_FOUND');
    }

    if (session.status === 'locked') {
      throw new Error('ATTENDANCE_SESSION_LOCKED: Cannot undo locked attendance session');
    }

    const history = sessionPreviousSnapshots.get(sessionId);
    if (!history || history.length === 0) {
      // Fallback: If no explicit snapshot, safely revert revision 1 back to scheduled
      if (session.status === 'submitted') {
        session.status = 'scheduled';
        session.revisionCount = Math.max(0, session.revisionCount - 1);
        session.submittedAt = null;
        if (session.revisions.length > 0) {
          session.revisions.shift();
        }
        return {
          success: true,
          sessionId: session.sessionId,
          status: session.status,
          revisionCount: session.revisionCount,
          message: 'Attendance submission reverted to scheduled draft.',
        };
      }
      throw new Error('NO_PREVIOUS_SUBMISSION_STATE: No submission to undo');
    }

    const previous = history.pop()!;
    session.status = previous.status;
    session.revisionCount = previous.revisionCount;
    session.submittedAt = previous.submittedAt;
    session.students = previous.students;
    session.revisions = previous.revisions;

    return {
      success: true,
      sessionId: session.sessionId,
      status: session.status,
      revisionCount: session.revisionCount,
      message: 'Attendance submission successfully undone and reverted to draft.',
    };
  },

  /**
   * Fetches marks entry grid for a specific assessment.
   */
  async getMarksGrid(assessmentId?: string) {
    const id = assessmentId || '00000000-0000-0000-0000-000000000413';
    const assessment = assessmentsStore[id] || assessmentsStore['00000000-0000-0000-0000-000000000413'];
    return JSON.parse(JSON.stringify(assessment));
  },

  /**
   * Parses CSV / Excel paste text with strict cell-level validation ($0 \le marks \le max$).
   * Returns diagnostic error report with exact row, column, and reason.
   */
  parseMarksCsv(csvContent: string, maxMarks: number): CsvImportResult {
    if (!csvContent || !csvContent.trim()) {
      return { success: false, parsedCount: 0, records: [], errors: [{ row: 0, column: 'all', value: '', reason: 'CSV content is empty' }] };
    }

    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const errors: CsvImportError[] = [];
    const records: { rollNo: string; marks: number }[] = [];

    // Helper to strip quotes
    const cleanCell = (s: string) => s.replace(/^["']|["']$/g, '').trim();

    // Check if header exists and identify column indices
    let startIndex = 0;
    let rollColIdx = 0;
    let marksColIdx = 1;

    const firstRowParts = lines[0].split(/[,\t]/).map(cleanCell);
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('roll') ||
      firstLineLower.includes('mark') ||
      firstLineLower.includes('student') ||
      firstLineLower.includes('score');

    if (hasHeader) {
      startIndex = 1;
      const detectedRoll = firstRowParts.findIndex((p) => {
        const l = p.toLowerCase();
        return l.includes('roll') || l.includes('enrol') || l.includes('id');
      });
      const detectedMarks = firstRowParts.findIndex((p) => {
        const l = p.toLowerCase();
        return l.includes('mark') || l.includes('score') || l.includes('grade');
      });

      if (detectedRoll !== -1) rollColIdx = detectedRoll;
      if (detectedMarks !== -1) marksColIdx = detectedMarks;
      else if (firstRowParts.length >= 3) marksColIdx = firstRowParts.length - 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const lineNum = i + 1;
      const row = lines[i];
      // Split on comma or tab (for Excel paste)
      const parts = row.split(/[,\t]/).map(cleanCell);

      if (parts.length < 2) {
        errors.push({
          row: lineNum,
          column: 'format',
          value: row,
          reason: 'Expected at least 2 columns: Roll Number and Marks',
        });
        continue;
      }

      // If no explicit header detected but 3+ columns exist and default marks column is not a valid number,
      // fallback to the last column if it is numeric marks
      let effectiveMarksCol = marksColIdx;
      if (!hasHeader && parts.length >= 3 && isNaN(parseFloat(parts[effectiveMarksCol]))) {
        if (!isNaN(parseFloat(parts[parts.length - 1]))) {
          effectiveMarksCol = parts.length - 1;
        }
      }

      const rollNo = (parts[rollColIdx] || '').toUpperCase();
      const rawMarks = parts[effectiveMarksCol] || '';

      if (!rollNo || rollNo.length < 3) {
        errors.push({
          row: lineNum,
          column: 'roll_no',
          value: parts[rollColIdx] || '',
          reason: 'Invalid or missing roll number format',
        });
        continue;
      }

      const marksNum = parseFloat(rawMarks);
      if (isNaN(marksNum)) {
        errors.push({
          row: lineNum,
          column: 'marks',
          value: rawMarks,
          reason: `Value "${rawMarks}" is not a valid number`,
        });
        continue;
      }

      if (marksNum < 0) {
        errors.push({
          row: lineNum,
          column: 'marks',
          value: rawMarks,
          reason: `Marks cannot be negative (${marksNum} < 0)`,
        });
        continue;
      }

      if (marksNum > maxMarks) {
        errors.push({
          row: lineNum,
          column: 'marks',
          value: rawMarks,
          reason: `Marks ${marksNum} exceed maximum allowed marks (${maxMarks})`,
        });
        continue;
      }

      records.push({ rollNo, marks: marksNum });
    }

    return {
      success: errors.length === 0,
      parsedCount: records.length,
      records,
      errors,
    };
  },

  /**
   * Generates diff view comparing existing records with proposed modifications
   */
  calculateMarksDiff(
    originalRecords: AssessmentRecordItem[],
    proposedUpdates: { studentId?: string; rollNo: string; marks: number }[],
    maxMarks: number
  ): MarksDiffItem[] {
    const diffs: MarksDiffItem[] = [];
    const origMap = new Map<string, AssessmentRecordItem>();
    originalRecords.forEach((r) => origMap.set(r.rollNo.toUpperCase(), r));

    for (const update of proposedUpdates) {
      const orig = origMap.get(update.rollNo.toUpperCase());
      const newGrade = calculateGradeFromMarks(update.marks, maxMarks);

      if (!orig) {
        diffs.push({
          studentId: update.studentId || '',
          rollNo: update.rollNo,
          studentName: 'Student not found in roster',
          originalMarks: null,
          proposedMarks: update.marks,
          originalGrade: '—',
          proposedGrade: newGrade.grade,
          delta: update.marks,
          status: 'new',
        });
        continue;
      }

      const isModified = orig.marksObtained !== update.marks;
      diffs.push({
        studentId: orig.studentId,
        rollNo: orig.rollNo,
        studentName: orig.studentName,
        originalMarks: orig.marksObtained,
        proposedMarks: update.marks,
        originalGrade: orig.grade,
        proposedGrade: newGrade.grade,
        delta: Math.round(((update.marks || 0) - (orig.marksObtained || 0)) * 100) / 100,
        status: isModified ? 'modified' : 'unchanged',
      });
    }

    return diffs;
  },

  /**
   * Saves marks as draft or submits to examination cell for review
   */
  async updateAssessmentMarks(params: {
    assessmentId: string;
    records: { studentId: string; marks: number }[];
    status?: AssessmentStatus;
  }) {
    const assessment = assessmentsStore[params.assessmentId];
    if (!assessment) {
      throw new Error('ASSESSMENT_NOT_FOUND');
    }

    if (assessment.status === 'published') {
      throw new Error('ASSESSMENT_ALREADY_PUBLISHED: Published results cannot be altered by faculty');
    }

    const marksMap = new Map<string, number>();
    params.records.forEach((r) => marksMap.set(r.studentId, r.marks));

    assessment.records.forEach((rec) => {
      if (marksMap.has(rec.studentId)) {
        const marks = marksMap.get(rec.studentId)!;
        if (marks < 0 || marks > assessment.maxMarks) {
          throw new Error(`INVALID_MARKS: ${marks} outside boundary [0, ${assessment.maxMarks}]`);
        }
        const g = calculateGradeFromMarks(marks, assessment.maxMarks);
        rec.marksObtained = marks;
        rec.percentage = g.percentage;
        rec.grade = g.grade;
        rec.gradePoints = g.gradePoints;
      }
    });

    if (params.status) {
      assessment.status = params.status;
    }

    CrossModuleSynchronizer.submitAssessmentMarks({
      assessmentId: assessment.id,
      status: (params.status as any) || undefined,
      records: params.records,
    });

    return {
      success: true,
      assessmentId: assessment.id,
      status: assessment.status,
      updatedCount: params.records.length,
    };
  },

  async submitAssessmentMarks(params: {
    assessmentId: string;
    records: { studentId: string; marks: number }[];
    status?: AssessmentStatus;
  }) {
    return this.updateAssessmentMarks(params);
  },

  /**
   * Fetches leave applications queue with split-pane details and attendance impact analysis
   */
  async getLeaveRequestsQueue(
    facultyId: string = SEED_FACULTY_ID,
    filterStatus?: string
  ): Promise<FacultyLeaveQueueItem[]> {
    for (const c of CrossModuleSynchronizer.getLeaves()) {
      const existing = leavesStore.find((l) => l.id === c.id);
      if (existing) {
        existing.status = c.status;
        existing.decisionComment = c.decisionComment || null;
      } else {
        leavesStore.unshift({
          id: c.id,
          studentId: c.studentId,
          studentName: c.studentName,
          rollNo: c.rollNo,
          department: c.department,
          section: c.section,
          leaveType: c.leaveType === 'Medical' ? 'Medical Leave' : c.leaveType === 'Personal' ? 'Personal Leave' : c.leaveType,
          startDate: c.startDate,
          endDate: c.endDate,
          daysCount: c.daysCount,
          reason: c.reason,
          attachmentUrl: c.attachmentUrl || null,
          attachmentName: c.attachmentName || null,
          status: c.status,
          currentAttendancePercent: c.currentAttendancePercent,
          projectedAttendancePercent: c.projectedAttendancePercent,
          isAttendanceRisk: c.isAttendanceRisk,
          decisionComment: c.decisionComment || null,
          submittedAt: c.submittedAt,
        });
      }
    }

    if (!filterStatus || filterStatus === 'All') {
      return [...leavesStore];
    }
    return leavesStore.filter((l) => l.status === filterStatus);
  },

  /**
   * Transitions leave request state via `rpc_transition_leave_request`.
   * Enforces mandatory decision comment for approved or rejected transitions.
   */
  async actionLeaveRequest(
    paramsOrLeaveId: string | { leaveId: string; status: LeaveStatus; decisionComment?: string },
    legacyStatus?: LeaveStatus,
    legacyDecisionComment?: string
  ) {
    let leaveId: string;
    let status: LeaveStatus;
    let decisionComment: string | undefined;

    if (typeof paramsOrLeaveId === 'string') {
      leaveId = paramsOrLeaveId;
      status = legacyStatus!;
      decisionComment = legacyDecisionComment;
    } else {
      leaveId = paramsOrLeaveId.leaveId;
      status = paramsOrLeaveId.status;
      decisionComment = paramsOrLeaveId.decisionComment;
    }

    let leave = leavesStore.find((l) => l.id === leaveId);
    const canonical = CrossModuleSynchronizer.getLeaveById(leaveId);

    if (!leave && !canonical) {
      throw new Error('LEAVE_REQUEST_NOT_FOUND');
    }

    const currentStatus = leave ? leave.status : canonical!.status;
    if (currentStatus === 'approved' || currentStatus === 'rejected' || currentStatus === 'withdrawn') {
      throw new Error('LEAVE_REQUEST_ALREADY_RESOLVED');
    }

    if (status === 'approved' || status === 'rejected') {
      if (!decisionComment || decisionComment.trim().length === 0) {
        throw new Error('DECISION_COMMENT_REQUIRED: Mandatory decision comment required for approving or rejecting leave');
      }
    }

    if (canonical) {
      CrossModuleSynchronizer.actionLeaveRequest({
        leaveId,
        status: status as any,
        decisionComment: decisionComment || '',
        actorRole: 'Faculty',
        actorName: 'Dr. Vikram Mehta',
      });
    }

    if (leave) {
      leave.status = status;
      leave.decisionComment = decisionComment?.trim() || null;
    }

    return {
      success: true,
      id: leaveId,
      leaveId,
      status,
      newStatus: status,
      decisionComment: decisionComment?.trim() || null,
      canWithdraw: false,
    };
  },

  /**
   * Fetches doubt inbox tickets with split-pane support
   */
  async getDoubtsQueue(
    facultyId: string = SEED_FACULTY_ID,
    filterStatus?: string
  ): Promise<FacultyDoubtQueueItem[]> {
    for (const c of CrossModuleSynchronizer.getDoubts()) {
      const existing = doubtsStore.find((d) => d.id === c.id);
      if (existing) {
        existing.status = c.status;
        existing.reopenCount = c.reopenCount;
        existing.messages = c.messages.map((m) => ({
          id: m.id,
          senderRole: m.senderRole,
          senderName: m.senderName,
          text: m.message,
          attachmentUrl: m.attachmentUrl,
          attachmentName: m.attachmentName,
          timestamp: m.createdAt,
        }));
        existing.lastReplyAt = c.updatedAt;
      } else {
        doubtsStore.unshift({
          id: c.id,
          studentId: c.studentId,
          studentName: c.studentName,
          rollNo: c.rollNo,
          section: c.section,
          subjectId: c.subjectId,
          subjectCode: c.subjectCode,
          subjectName: c.subjectName,
          title: c.title,
          description: c.initialQuestion,
          category: 'General Academic',
          status: c.status,
          reopenCount: c.reopenCount,
          maxReopensAllowed: c.maxReopensAllowed,
          messages: c.messages.map((m) => ({
            id: m.id,
            senderRole: m.senderRole,
            senderName: m.senderName,
            text: m.message,
            attachmentUrl: m.attachmentUrl,
            attachmentName: m.attachmentName,
            timestamp: m.createdAt,
          })),
          createdAt: c.createdAt,
          lastReplyAt: c.updatedAt,
        });
      }
    }

    if (!filterStatus || filterStatus === 'All') {
      return [...doubtsStore];
    }
    return doubtsStore.filter((d) => d.status === filterStatus);
  },

  /**
   * Answers a doubt ticket with faculty explanation or attachment
   */
  async replyToDoubt(params: {
    doubtId: string;
    replyText: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) {
    const doubt = doubtsStore.find((d) => d.id === params.doubtId);
    const canonical = CrossModuleSynchronizer.getDoubtById(params.doubtId);

    if (!doubt && !canonical) {
      throw new Error('DOUBT_TICKET_NOT_FOUND');
    }

    if (!params.replyText || params.replyText.trim().length === 0) {
      throw new Error('REPLY_TEXT_CANNOT_BE_EMPTY');
    }

    const nowIso = new Date().toISOString();
    if (doubt) {
      doubt.messages.push({
        id: `msg-${Date.now()}`,
        senderRole: 'Faculty',
        senderName: 'Dr. Vikram Mehta',
        text: params.replyText.trim(),
        attachmentUrl: params.attachmentUrl,
        attachmentName: params.attachmentName,
        timestamp: nowIso,
      });
      doubt.status = 'answered';
      doubt.lastReplyAt = nowIso;
    }

    if (canonical) {
      CrossModuleSynchronizer.replyToDoubt({
        doubtId: params.doubtId,
        senderRole: 'Faculty',
        message: params.replyText,
        attachmentName: params.attachmentName,
        attachmentUrl: params.attachmentUrl,
      });
    }

    return {
      success: true,
      doubtId: params.doubtId,
      status: 'answered' as DoubtStatus,
      messageCount: doubt ? doubt.messages.length : (canonical ? canonical.messages.length : 1),
    };
  },

  /**
   * Resolves a doubt ticket
   */
  async resolveDoubt(doubtId: string) {
    const doubt = doubtsStore.find((d) => d.id === doubtId);
    const canonical = CrossModuleSynchronizer.getDoubtById(doubtId);

    if (!doubt && !canonical) {
      throw new Error('DOUBT_TICKET_NOT_FOUND');
    }

    if (doubt) doubt.status = 'resolved';
    if (canonical) CrossModuleSynchronizer.resolveDoubt(doubtId);

    return {
      success: true,
      doubtId,
      status: 'resolved' as DoubtStatus,
    };
  },

  async createAnnouncement(input: {
    title: string;
    content: string;
    category?: string;
    priority?: 'Critical' | 'High' | 'Normal';
    targetAudience?: 'All Students' | 'Faculty Only' | 'Department' | 'General';
    departmentCode?: string;
  }) {
    return CrossModuleSynchronizer.createAnnouncement({
      ...input,
      author: 'Dr. Vikram Mehta',
    });
  },

  async getAnnouncements(): Promise<{
    id: string;
    title: string;
    content: string;
    category: 'Institution' | 'Department' | 'Examination' | 'Coursework';
    department_id: string;
    targetScope: string;
    priority: 'Low' | 'Normal' | 'High' | 'Critical';
    reachCount: number;
    created_at: string;
  }[]> {
    const canonical = CrossModuleSynchronizer.getAnnouncements();
    return canonical.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      category: (c.category as 'Institution' | 'Department' | 'Examination' | 'Coursework') || 'Coursework',
      department_id: '00000000-0000-0000-0000-000000000301',
      targetScope: c.targetAudience,
      priority: c.priority === 'High' ? 'High' : c.priority === 'Critical' ? 'Critical' : 'Normal',
      reachCount: 150,
      created_at: c.createdAt,
    }));
  },

  /**
   * Reopens a doubt obeying 2-reopen policy cap
   */
  async reopenDoubt(doubtId: string, reason: string) {
    const doubt = doubtsStore.find((d) => d.id === doubtId);
    if (!doubt) {
      throw new Error('DOUBT_TICKET_NOT_FOUND');
    }

    if (doubt.status !== 'resolved') {
      throw new Error('DOUBT_NOT_RESOLVED: Only resolved tickets can be reopened');
    }

    if (doubt.reopenCount >= doubt.maxReopensAllowed) {
      throw new Error(`REOPEN_LIMIT_EXCEEDED: Cannot exceed ${doubt.maxReopensAllowed} reopens for this ticket`);
    }

    doubt.reopenCount += 1;
    doubt.status = 'reopened';
    doubt.messages.push({
      id: `msg-${Date.now()}`,
      senderRole: 'Student',
      senderName: doubt.studentName,
      text: `Reopened Ticket (Attempt ${doubt.reopenCount}/${doubt.maxReopensAllowed}): ${reason}`,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      doubtId: doubt.id,
      reopenCount: doubt.reopenCount,
      status: doubt.status,
    };
  },

  /**
   * Assignments and Submissions Desk
   */
  async getAssignments(facultyId: string = SEED_FACULTY_ID): Promise<FacultyAssignmentRecord[]> {
    return [...assignmentsStore];
  },

  async createAssignment(params: {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    sectionName: string;
    title: string;
    description: string;
    dueDate: string;
    maxMarks: number;
    attachments?: string[];
  }): Promise<FacultyAssignmentRecord> {
    if (!params.title || params.title.trim().length === 0) {
      throw new Error('TITLE_REQUIRED');
    }
    if (params.maxMarks <= 0) {
      throw new Error('MAX_MARKS_MUST_BE_POSITIVE');
    }

    const newRecord: FacultyAssignmentRecord = {
      id: `asg-${Date.now()}`,
      subjectId: params.subjectId,
      subjectCode: params.subjectCode,
      subjectName: params.subjectName,
      sectionName: params.sectionName,
      title: params.title.trim(),
      description: params.description,
      dueDate: params.dueDate,
      maxMarks: params.maxMarks,
      totalSubmissions: 0,
      gradedCount: 0,
      pendingCount: 0,
      attachments: params.attachments || [],
      createdAt: new Date().toISOString(),
    };

    assignmentsStore.unshift(newRecord);
    return newRecord;
  },

  async getAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmissionItem[]> {
    return assignmentSubmissionsStore[assignmentId] || [];
  },

  async gradeSubmission(params: {
    assignmentId: string;
    submissionId: string;
    marks: number;
    feedback?: string;
  }) {
    const list = assignmentSubmissionsStore[params.assignmentId] || [];
    const sub = list.find((s) => s.id === params.submissionId);
    if (!sub) {
      throw new Error('SUBMISSION_NOT_FOUND');
    }

    if (params.marks < 0 || params.marks > sub.maxMarks) {
      throw new Error(`INVALID_MARKS: Marks must be between 0 and ${sub.maxMarks}`);
    }

    sub.marksObtained = params.marks;
    sub.feedback = params.feedback?.trim() || null;
    sub.status = 'Graded';

    return {
      success: true,
      submissionId: sub.id,
      marks: sub.marksObtained,
      status: sub.status,
    };
  },

  /**
   * Course Notes & Handouts Vault
   */
  async getHandouts(facultyId: string = SEED_FACULTY_ID): Promise<FacultyHandoutRecord[]> {
    return handoutsStore.filter((h) => !h.isArchived);
  },

  async uploadHandout(params: {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    sectionName: string;
    title: string;
    description: string;
    fileName: string;
    fileSizeBytes: number;
    fileType: 'PDF' | 'Slide Deck' | 'Workbook' | 'Lab Manual' | 'Doc';
    version: string;
  }): Promise<FacultyHandoutRecord> {
    if (!params.title || !params.fileName) {
      throw new Error('TITLE_AND_FILE_REQUIRED');
    }

    const newHandout: FacultyHandoutRecord = {
      id: `note-${Date.now()}`,
      subjectId: params.subjectId,
      subjectCode: params.subjectCode,
      subjectName: params.subjectName,
      sectionName: params.sectionName,
      title: params.title.trim(),
      description: params.description,
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes || 2500000,
      fileType: params.fileType,
      version: params.version || 'v1.0',
      isArchived: false,
      downloadCount: 0,
      uploadedAt: new Date().toISOString(),
    };

    handoutsStore.unshift(newHandout);
    return newHandout;
  },

  async archiveHandout(handoutId: string) {
    const h = handoutsStore.find((note) => note.id === handoutId);
    if (!h) {
      throw new Error('HANDOUT_NOT_FOUND');
    }
    h.isArchived = true;
    return { success: true, handoutId: h.id };
  },

  /**
   * Student Groups & Advisories Management
   */
  async getGroups(facultyId: string = SEED_FACULTY_ID): Promise<StudentGroupRecord[]> {
    return [...studentGroupsStore];
  },

  async createGroup(params: {
    name: string;
    category: 'Project' | 'Lab Batch' | 'Advisory' | 'Study Cohort';
    description: string;
    sectionName: string;
    memberStudentIds: string[];
  }): Promise<StudentGroupRecord> {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('GROUP_NAME_REQUIRED');
    }

    const members = params.memberStudentIds.map((id, idx) => {
      const student = GLOBAL_SCOPED_STUDENTS.find((s) => s.id === id);
      return {
        id: `m-${id}`,
        studentId: id,
        name: student ? student.name : 'Enrolled Student',
        rollNo: student ? student.rollNo : '23CSE000',
        role: idx === 0 ? ('Lead' as const) : ('Member' as const),
      };
    });

    const newGroup: StudentGroupRecord = {
      id: `grp-${Date.now()}`,
      name: params.name.trim(),
      category: params.category,
      description: params.description,
      mentorName: 'Dr. Vikram Mehta',
      sectionName: params.sectionName,
      members,
      milestonesCount: 4,
      completedMilestones: 0,
      createdAt: new Date().toISOString(),
    };

    studentGroupsStore.unshift(newGroup);
    return newGroup;
  },
};
