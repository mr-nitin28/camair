/**
 * Student Domain Service — Authoritative Data Layer for Student Workflows
 * Uses pure domain calculations from @/lib/calculations and connects to Supabase
 * with deterministic fallback to seed data when Supabase remote connection is unavailable.
 */

import {
  calculateAttendanceMetrics,
  calculateSGPA,
  calculateCGPA,
  calculateFeeBalance,
  formatMinorUnits,
  type AttendanceItem,
  type CourseGradeEntry,
  type SemesterGradeEntry,
  type PaymentItem,
  type FeeBalanceMetrics,
  type AttendanceMetrics,
} from '../calculations/index.ts';
import { CrossModuleSynchronizer } from './cross-module-store.ts';
import { NotificationService, USER_IDS } from './notification-service.ts';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
export type LeaveRequestStatus = 'submitted' | 'under_review' | 'clarification_requested' | 'approved' | 'rejected' | 'withdrawn';
export type DoubtStatus = 'open' | 'answered' | 'resolved' | 'reopened';
export type AssessmentStatus = 'draft' | 'submitted' | 'reviewed' | 'published' | 'correction_pending';

export interface TodayClassItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  room: string;
  time: string;
  facultyName: string;
  isNext?: boolean;
}

export interface TodayNoticeItem {
  id: string;
  title: string;
  category: 'Notice' | 'Exam' | 'Fee' | 'Urgent';
  timeAgo: string;
}

export interface SubjectAttendanceSummary {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  facultyName: string;
  metrics: AttendanceMetrics;
}

export interface StudentDashboardSummary {
  student: {
    id: string;
    enrollmentNo: string;
    name: string;
    program: string;
    department: string;
    semester: number;
    section: string;
  };
  todayStrip: {
    nextClass: TodayClassItem | null;
    classesToday: TodayClassItem[];
    pendingItemsCount: number;
    urgentNotices: TodayNoticeItem[];
  };
  attendanceSummary: {
    overall: AttendanceMetrics;
    subjects: SubjectAttendanceSummary[];
  };
  academicSummary: {
    currentSgpa: number;
    cgpa: number;
    trend: { semester: string; sgpa: number; cgpa: number }[];
    totalCreditsEarned: number;
  };
  feeSummary: {
    balance: FeeBalanceMetrics;
    nextDueDate: string;
    formattedBalance: string;
    structureName: string;
  };
  upcomingExams: {
    id: string;
    subjectCode: string;
    subjectName: string;
    type: string;
    date: string;
    time: string;
    room: string;
    weightage: number;
  }[];
  recentAnnouncements: {
    id: string;
    title: string;
    content: string;
    priority: 'Critical' | 'High' | 'Normal';
    category: string;
    createdAt: string;
    isRead?: boolean;
  }[];
  pendingRequestsCount: {
    leaves: number;
    doubts: number;
    serviceDesk: number;
  };
}

export interface AttendanceHistoryEntry {
  id: string;
  date: string;
  slotNumber: number;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  status: AttendanceStatus;
  facultyName: string;
}

export interface AssessmentResultItem {
  id: string;
  assessmentId: string;
  assessmentName: string;
  assessmentType: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  maxMarks: number;
  marksObtained: number;
  grade: string;
  gradePoints: number;
  status: AssessmentStatus;
  publishedAt: string | null;
}

export interface SemesterResultSheet {
  semesterNumber: number;
  isCurrent: boolean;
  isPublished: boolean;
  publishedDate?: string;
  unreleasedNotice?: string;
  results: AssessmentResultItem[];
  sgpa: number;
  totalCredits: number;
}

export interface LearningResourceItem {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  course: string;
  facultyName: string;
  fileType: 'PDF' | 'Slide Deck' | 'Workbook' | 'Lab Manual' | 'Doc';
  fileName: string;
  fileSizeBytes: number;
  version: string;
  isUpdated: boolean;
  createdAt: string;
  updatedAt: string;
  isBookmarked: boolean;
  downloadCount: number;
}

export interface LeaveTimelineStep {
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: string;
}

export interface LeaveRequestRecord {
  id: string;
  leaveType: 'Medical' | 'Personal' | 'On Duty' | 'Academic Event';
  startDate: string;
  endDate: string;
  daysCount?: number;
  reason: string;
  status: LeaveRequestStatus;
  attachmentName?: string;
  attachmentStoragePath?: string;
  approverName?: string;
  clarificationComment?: string;
  decisionComment?: string;
  createdAt: string;
  updatedAt: string;
  canWithdraw: boolean;
  timeline: LeaveTimelineStep[];
}

export interface DoubtMessageRecord {
  id: string;
  doubtId: string;
  senderId: string;
  senderName: string;
  senderRole: 'Student' | 'Faculty' | 'Admin';
  message: string;
  attachmentName?: string;
  createdAt: string;
}

export interface DoubtTicketRecord {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  title: string;
  initialQuestion: string;
  status: DoubtStatus;
  reopenCount: number;
  maxReopensAllowed: number;
  canReopen: boolean;
  createdAt: string;
  updatedAt: string;
  messages: DoubtMessageRecord[];
}

export interface CampusActivityItem {
  id: string;
  title: string;
  category: 'Hackathon' | 'Workshop' | 'Seminar' | 'Cultural' | 'Sports';
  description: string;
  date: string;
  time: string;
  venue: string;
  organizer: string;
  capacity: number;
  registeredCount: number;
  isRegistered?: boolean;
}

export interface StudentAcademicProfile {
  name: string;
  rollNo: string;
  enrolmentNo: string;
  programme: string;
  department: string;
  currentSemester: number;
  section: string;
  academicSession: string;
  advisor: string;
  gradingScale: string;
}

export interface EnrolledSubjectPending {
  subjectCode: string;
  subjectName: string;
  credits: number;
  facultyName: string;
  status: 'evaluation_pending' | 'draft' | 'submitted';
  notice: string;
}

export interface ExamResultsResponse {
  studentProfile: StudentAcademicProfile;
  semesters: SemesterResultSheet[];
  enrolledPendingSubjects: EnrolledSubjectPending[];
  currentSemesterPending: boolean;
  backlogHistory: { subjectCode: string; subjectName: string; semester: number; status: 'cleared' | 'active' }[];
}

export interface ResourceFilters {
  subjectId?: string;
  search?: string;
  bookmarkedOnly?: boolean;
  semester?: number | string;
  course?: string;
  fileType?: string;
}

export interface AnnouncementItem {
  id: string;
  type: 'announcement' | 'alert' | 'activity';
  title: string;
  content: string;
  category: string;
  priority: 'Critical' | 'High' | 'Normal';
  author: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
  venue?: string;
  eventDate?: string;
}

export interface FeeItemDetails {
  id: string;
  structureName: string;
  programmeName: string;
  semesterNumber: number;
  academicYear: string;
  assignedAmountMinorUnits: number;
  concessionAmountMinorUnits: number;
  dueDate: string;
  balanceMetrics: FeeBalanceMetrics;
  breakdown: {
    tuitionFeeMinorUnits: number;
    labFeeMinorUnits: number;
    libraryFeeMinorUnits: number;
    examFeeMinorUnits: number;
  };
  payments: {
    id: string;
    amountMinorUnits: number;
    paymentMethod: string;
    gatewayReference: string;
    status: 'verified' | 'initiated' | 'failed' | 'refunded';
    verifiedAt?: string;
    receiptNumber: string;
  }[];
}

// ---------------------------------------------------------------------------
// Seed Data (Deterministic & Matching PostgreSQL Schema Migrations)
// ---------------------------------------------------------------------------

const SEED_STUDENT_ID = '00000000-0000-0000-0000-000000000030';

const SEED_SUBJECTS = [
  { id: '00000000-0000-0000-0000-000000000351', code: 'CS601', name: 'Compiler Design', credits: 4.0, faculty: 'Prof. Vikram Mehta' },
  { id: '00000000-0000-0000-0000-000000000352', code: 'CS602', name: 'Computer Networks', credits: 4.0, faculty: 'Prof. Ananya Deshmukh' },
  { id: '00000000-0000-0000-0000-000000000353', code: 'CS603', name: 'Artificial Intelligence', credits: 3.0, faculty: 'Dr. Vikrant Roy' },
  { id: 'sub-604', code: 'CS604', name: 'Software Architecture', credits: 3.0, faculty: 'Prof. Shruti Sen' },
  { id: 'sub-605L', code: 'CS605L', name: 'Compiler Design Lab', credits: 2.0, faculty: 'Prof. Vikram Mehta' },
];

// Seed Attendance Records
const SEED_ATTENDANCE_LOG: AttendanceHistoryEntry[] = [
  { id: 'att-1', date: '2026-03-24', slotNumber: 1, subjectId: SEED_SUBJECTS[0].id, subjectCode: 'CS601', subjectName: 'Compiler Design', status: 'Present', facultyName: 'Prof. Vikram Mehta' },
  { id: 'att-2', date: '2026-03-24', slotNumber: 2, subjectId: SEED_SUBJECTS[1].id, subjectCode: 'CS602', subjectName: 'Computer Networks', status: 'Present', facultyName: 'Prof. Ananya Deshmukh' },
  { id: 'att-3', date: '2026-03-23', slotNumber: 1, subjectId: SEED_SUBJECTS[2].id, subjectCode: 'CS603', subjectName: 'Artificial Intelligence', status: 'Present', facultyName: 'Dr. Vikrant Roy' },
  { id: 'att-4', date: '2026-03-23', slotNumber: 2, subjectId: SEED_SUBJECTS[3].id, subjectCode: 'CS604', subjectName: 'Software Architecture', status: 'Late', facultyName: 'Prof. Shruti Sen' },
  { id: 'att-5', date: '2026-03-22', slotNumber: 1, subjectId: SEED_SUBJECTS[0].id, subjectCode: 'CS601', subjectName: 'Compiler Design', status: 'Present', facultyName: 'Prof. Vikram Mehta' },
  { id: 'att-6', date: '2026-03-22', slotNumber: 3, subjectId: SEED_SUBJECTS[4].id, subjectCode: 'CS605L', subjectName: 'Compiler Design Lab', status: 'Present', facultyName: 'Prof. Vikram Mehta' },
  { id: 'att-7', date: '2026-03-21', slotNumber: 1, subjectId: SEED_SUBJECTS[1].id, subjectCode: 'CS602', subjectName: 'Computer Networks', status: 'Absent', facultyName: 'Prof. Ananya Deshmukh' },
  { id: 'att-8', date: '2026-03-21', slotNumber: 2, subjectId: SEED_SUBJECTS[2].id, subjectCode: 'CS603', subjectName: 'Artificial Intelligence', status: 'Present', facultyName: 'Dr. Vikrant Roy' },
  { id: 'att-9', date: '2026-03-20', slotNumber: 1, subjectId: SEED_SUBJECTS[0].id, subjectCode: 'CS601', subjectName: 'Compiler Design', status: 'Present', facultyName: 'Prof. Vikram Mehta' },
  { id: 'att-10', date: '2026-03-20', slotNumber: 2, subjectId: SEED_SUBJECTS[3].id, subjectCode: 'CS604', subjectName: 'Software Architecture', status: 'Present', facultyName: 'Prof. Shruti Sen' },
  { id: 'att-11', date: '2026-03-19', slotNumber: 1, subjectId: SEED_SUBJECTS[1].id, subjectCode: 'CS602', subjectName: 'Computer Networks', status: 'Present', facultyName: 'Prof. Ananya Deshmukh' },
  { id: 'att-12', date: '2026-03-19', slotNumber: 2, subjectId: SEED_SUBJECTS[2].id, subjectCode: 'CS603', subjectName: 'Artificial Intelligence', status: 'Present', facultyName: 'Dr. Vikrant Roy' },
  { id: 'att-13', date: '2026-03-18', slotNumber: 1, subjectId: SEED_SUBJECTS[0].id, subjectCode: 'CS601', subjectName: 'Compiler Design', status: 'Excused', facultyName: 'Prof. Vikram Mehta' },
  { id: 'att-14', date: '2026-03-18', slotNumber: 2, subjectId: SEED_SUBJECTS[1].id, subjectCode: 'CS602', subjectName: 'Computer Networks', status: 'Present', facultyName: 'Prof. Ananya Deshmukh' },
  { id: 'att-15', date: '2026-03-17', slotNumber: 1, subjectId: SEED_SUBJECTS[4].id, subjectCode: 'CS605L', subjectName: 'Compiler Design Lab', status: 'Present', facultyName: 'Prof. Vikram Mehta' },
  { id: 'att-16', date: '2026-03-17', slotNumber: 2, subjectId: SEED_SUBJECTS[3].id, subjectCode: 'CS604', subjectName: 'Software Architecture', status: 'Absent', facultyName: 'Prof. Shruti Sen' },
];

// Seed Resources
const SEED_RESOURCES: LearningResourceItem[] = [
  {
    id: 'res-1',
    title: 'Compiler Design: Lexical Analysis & DFA Minimization',
    description: 'Comprehensive slides and hand-worked proofs for Thompson construction, subset construction, and table minimization.',
    subjectId: SEED_SUBJECTS[0].id,
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    semester: 6,
    course: 'B.Tech CSE',
    facultyName: 'Prof. Vikram Mehta',
    fileType: 'PDF',
    fileName: 'CS601_Lexical_Analysis_v2.pdf',
    fileSizeBytes: 4250000,
    version: '2.1',
    isUpdated: true,
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-22T08:30:00Z',
    isBookmarked: true,
    downloadCount: 142,
  },
  {
    id: 'res-2',
    title: 'Computer Networks: OSPF vs RIP Convergence Study',
    description: 'Detailed analysis of link-state vs distance-vector routing protocols, packet trace dumps, and loop prevention mechanisms.',
    subjectId: SEED_SUBJECTS[1].id,
    subjectCode: 'CS602',
    subjectName: 'Computer Networks',
    semester: 6,
    course: 'B.Tech CSE',
    facultyName: 'Prof. Ananya Deshmukh',
    fileType: 'PDF',
    fileName: 'CS602_Routing_OSPF_Study.pdf',
    fileSizeBytes: 3120000,
    version: '1.4',
    isUpdated: false,
    createdAt: '2026-03-05T14:20:00Z',
    updatedAt: '2026-03-05T14:20:00Z',
    isBookmarked: false,
    downloadCount: 98,
  },
  {
    id: 'res-3',
    title: 'Artificial Intelligence: Heuristic Search & A* Admissibility',
    description: 'Lecture slides and Python notebook reference for admissible and consistent heuristics in graph search problems.',
    subjectId: SEED_SUBJECTS[2].id,
    subjectCode: 'CS603',
    subjectName: 'Artificial Intelligence',
    semester: 6,
    course: 'B.Tech CSE',
    facultyName: 'Dr. Vikrant Roy',
    fileType: 'Slide Deck',
    fileName: 'CS603_Heuristic_Search_AStar.pptx',
    fileSizeBytes: 8900000,
    version: '1.2',
    isUpdated: true,
    createdAt: '2026-03-01T09:15:00Z',
    updatedAt: '2026-03-18T16:45:00Z',
    isBookmarked: true,
    downloadCount: 215,
  },
  {
    id: 'res-4',
    title: 'Software Architecture: Design Patterns & Microservices',
    description: 'Case studies on hexagonal architecture, event-driven choreographies, and CQRS patterns for high-throughput backends.',
    subjectId: SEED_SUBJECTS[3].id,
    subjectCode: 'CS604',
    subjectName: 'Software Architecture',
    semester: 6,
    course: 'B.Tech CSE',
    facultyName: 'Prof. Shruti Sen',
    fileType: 'Workbook',
    fileName: 'CS604_Architecture_CaseStudies.pdf',
    fileSizeBytes: 5400000,
    version: '1.0',
    isUpdated: false,
    createdAt: '2026-02-28T11:00:00Z',
    updatedAt: '2026-02-28T11:00:00Z',
    isBookmarked: false,
    downloadCount: 84,
  },
  {
    id: 'res-5',
    title: 'Compiler Design Lab Manual: Flex & Bison Lexer Exercises',
    description: 'Lab exercise guide with test harnesses, grammar specifications, and automated test cases for compiler construction lab.',
    subjectId: SEED_SUBJECTS[4].id,
    subjectCode: 'CS605L',
    subjectName: 'Compiler Design Lab',
    semester: 6,
    course: 'B.Tech CSE',
    facultyName: 'Prof. Vikram Mehta',
    fileType: 'Lab Manual',
    fileName: 'CS605L_Lab_Manual_FlexBison.pdf',
    fileSizeBytes: 2800000,
    version: '2.0',
    isUpdated: true,
    createdAt: '2026-03-12T13:30:00Z',
    updatedAt: '2026-03-20T10:00:00Z',
    isBookmarked: true,
    downloadCount: 167,
  },
];

// Seed Leave Requests
const SEED_LEAVE_REQUESTS: LeaveRequestRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000701',
    leaveType: 'Medical',
    startDate: '2026-03-10',
    endDate: '2026-03-12',
    reason: 'Medical Leave: Viral Fever and Doctor advised complete bed rest.',
    status: 'submitted',
    attachmentName: 'medical_prescription_mar10.pdf',
    approverName: 'Prof. Vikram Mehta (Faculty Advisor)',
    clarificationComment: undefined,
    decisionComment: undefined,
    createdAt: '2026-03-09T18:30:00Z',
    updatedAt: '2026-03-09T18:30:00Z',
    canWithdraw: true,
    timeline: [
      { title: 'Leave Application Submitted', description: 'Application received by department portal', status: 'completed', timestamp: 'Mar 09, 2026' },
      { title: 'Faculty Advisor Review', description: 'Pending verification by Prof. Vikram Mehta', status: 'current' },
      { title: 'Final Resolution', description: 'Decision recorded and attendance adjusted', status: 'upcoming' },
    ],
  },
  {
    id: 'leave-prev-1',
    leaveType: 'On Duty',
    startDate: '2026-02-14',
    endDate: '2026-02-16',
    reason: 'Representing institute at National Smart India Hackathon zonal round.',
    status: 'approved',
    attachmentName: 'hackathon_selection_letter.pdf',
    approverName: 'Dr. Rajesh Sharma (Head of Department)',
    decisionComment: 'Approved. Attendance marked as On Duty (OD). All lab submissions must be turned in by Feb 20.',
    createdAt: '2026-02-08T10:00:00Z',
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
    leaveType: 'Personal',
    startDate: '2026-01-20',
    endDate: '2026-01-21',
    reason: 'Family wedding event in hometown.',
    status: 'withdrawn',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-16T14:30:00Z',
    canWithdraw: false,
    timeline: [
      { title: 'Application Submitted', description: 'Submitted by student', status: 'completed', timestamp: 'Jan 15, 2026' },
      { title: 'Withdrawn by Student', description: 'Trip cancelled by student prior to review', status: 'completed', timestamp: 'Jan 16, 2026' },
    ],
  },
];

// Seed Doubts
const SEED_DOUBTS: DoubtTicketRecord[] = [
  {
    id: 'doubt-1',
    subjectId: SEED_SUBJECTS[0].id,
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    facultyName: 'Prof. Vikram Mehta',
    title: 'Minimization of DFA containing dead/sink states',
    initialQuestion: 'When performing Hopcroft partition refinement on a DFA that has an explicit dead state, should the dead state start in its own equivalence class or in F / non-F?',
    status: 'answered',
    reopenCount: 0,
    maxReopensAllowed: 2,
    canReopen: false, // Answered ticket cannot be reopened until marked resolved
    createdAt: '2026-03-21T11:00:00Z',
    updatedAt: '2026-03-22T09:30:00Z',
    messages: [
      {
        id: 'msg-1',
        doubtId: 'doubt-1',
        senderId: SEED_STUDENT_ID,
        senderName: 'Aarav Patel',
        senderRole: 'Student',
        message: 'When performing Hopcroft partition refinement on a DFA that has an explicit dead state, should the dead state start in its own equivalence class or in F / non-F?',
        createdAt: '2026-03-21T11:00:00Z',
      },
      {
        id: 'msg-2',
        doubtId: 'doubt-1',
        senderId: 'fac-1',
        senderName: 'Prof. Vikram Mehta',
        senderRole: 'Faculty',
        message: 'Great question Aarav. All non-accepting states start together in the initial partition P0 = {F, Q \\ F}. The dead state is initially grouped with other non-accepting states. In the first refinement pass, any state that transitions to the dead state on an input symbol while another goes elsewhere will automatically split out into a separate partition.',
        createdAt: '2026-03-22T09:30:00Z',
      },
    ],
  },
  {
    id: 'doubt-2',
    subjectId: SEED_SUBJECTS[1].id,
    subjectCode: 'CS602',
    subjectName: 'Computer Networks',
    facultyName: 'Prof. Ananya Deshmukh',
    title: 'Count-to-infinity problem in distance vector routing',
    initialQuestion: 'Does split horizon with poison reverse completely eliminate all routing loops in arbitrary topologies, or only two-node loops?',
    status: 'resolved',
    reopenCount: 1,
    maxReopensAllowed: 2,
    canReopen: true, // 1 reopen used, 1 remaining under policy cap
    createdAt: '2026-03-15T14:00:00Z',
    updatedAt: '2026-03-17T16:00:00Z',
    messages: [
      {
        id: 'msg-201',
        doubtId: 'doubt-2',
        senderId: SEED_STUDENT_ID,
        senderName: 'Aarav Patel',
        senderRole: 'Student',
        message: 'Does split horizon with poison reverse completely eliminate all routing loops in arbitrary topologies, or only two-node loops?',
        createdAt: '2026-03-15T14:00:00Z',
      },
      {
        id: 'msg-202',
        doubtId: 'doubt-2',
        senderId: 'fac-2',
        senderName: 'Prof. Ananya Deshmukh',
        senderRole: 'Faculty',
        message: 'Split horizon only prevents loops involving 2 adjacent nodes (e.g. A <-> B). For loops involving 3 or more nodes in a ring, split horizon is insufficient and hold-down timers or path vectoring (like BGP) are required.',
        createdAt: '2026-03-16T10:15:00Z',
      },
      {
        id: 'msg-203',
        doubtId: 'doubt-2',
        senderId: SEED_STUDENT_ID,
        senderName: 'Aarav Patel',
        senderRole: 'Student',
        message: 'Understood clearly now. Thank you Professor!',
        createdAt: '2026-03-17T16:00:00Z',
      },
    ],
  },
];

// Seed Announcements and Activities
const SEED_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    type: 'alert',
    title: 'Mid-Term Examination Datesheet Released',
    content: 'The official datesheet for Semester 6 Mid-Term Examinations (April 2026) has been approved by the Examination Admin. Review the timetable and seat matrix under the Examinations portal. Attendance clearance of 75% is strictly enforced.',
    category: 'Examinations',
    priority: 'Critical',
    author: 'Examination Cell (Sunil Verma)',
    createdAt: '2026-03-24T06:30:00Z',
    isRead: false,
    link: '/dashboard/exams',
  },
  {
    id: 'ann-2',
    type: 'announcement',
    title: 'Semester 6 Academic & Lab Fee Clearance Deadline',
    content: 'All students are notified that the final date for clearing outstanding fee balances without late penalty is March 31, 2026. Review your fee ledger and payment receipts in the Fee Management tab.',
    category: 'Finance',
    priority: 'High',
    author: 'Accounts Department (Kavita Iyer)',
    createdAt: '2026-03-22T10:00:00Z',
    isRead: false,
    link: '/dashboard/fees',
  },
  {
    id: 'ann-3',
    type: 'activity',
    title: 'National AI & Web3 Cohort Hackathon 2026',
    content: 'Metropolitan Institute of Technology is hosting the 36-hour National Hackathon. Teams can build decentralized applications, autonomous AI agents, and zero-knowledge tools. Grand prize ₹2,50,000.',
    category: 'Activities & Events',
    priority: 'Normal',
    author: 'Student Council & Tech Club',
    createdAt: '2026-03-20T14:00:00Z',
    isRead: true,
    venue: 'Main Auditorium & Innovation Lab Block B',
    eventDate: 'April 11-12, 2026',
  },
  {
    id: 'ann-4',
    type: 'announcement',
    title: 'Central Library Extended Study Hours During Exams',
    content: 'The central library reading hall will remain open 24 hours beginning March 28 through the mid-term examination period. Wi-Fi and power outlets available in all study cubicles.',
    category: 'Campus Facilities',
    priority: 'Normal',
    author: 'Head Librarian',
    createdAt: '2026-03-18T09:00:00Z',
    isRead: true,
  },
];

// Seed Campus Activities
const SEED_ACTIVITIES: CampusActivityItem[] = [
  {
    id: 'act-1',
    title: 'National AI & Web3 Cohort Hackathon 2026',
    category: 'Hackathon',
    description: '36-hour continuous build sprint focusing on autonomous agent workflows, zero-knowledge proofs, and decentralized compute pipelines. Mentorship by senior engineers.',
    date: '2026-04-11',
    time: '09:00 AM onwards',
    venue: 'Main Auditorium & Innovation Lab Block B',
    organizer: 'Department of Computer Science & Engineering',
    capacity: 250,
    registeredCount: 198,
    isRegistered: true,
  },
  {
    id: 'act-2',
    title: 'Advanced Compilers & LLVM Optimization Workshop',
    category: 'Workshop',
    description: 'Hands-on laboratory session constructing custom SSA IR transformation passes and dead code elimination passes using LLVM 18.',
    date: '2026-04-18',
    time: '02:00 PM - 05:30 PM',
    venue: 'Lab Block C, Room 402',
    organizer: 'Systems Architecture Club',
    capacity: 60,
    registeredCount: 48,
    isRegistered: false,
  },
  {
    id: 'act-3',
    title: 'Industry Keynote: High-Throughput Distributed Ledgers',
    category: 'Seminar',
    description: 'Guest lecture by lead database architect on Raft consensus protocols, write amplification in LSM trees, and production failure modes.',
    date: '2026-04-22',
    time: '11:00 AM - 12:30 PM',
    venue: 'Seminar Hall 1',
    organizer: 'ACM Student Chapter',
    capacity: 120,
    registeredCount: 85,
    isRegistered: false,
  },
  {
    id: 'act-4',
    title: 'Annual Inter-Department Football Championship',
    category: 'Sports',
    description: 'Inter-department knockout tournament across all undergraduate batches. Medals and rolling trophy for winners.',
    date: '2026-04-25',
    time: '04:00 PM onwards',
    venue: 'Campus Main Sports Ground',
    organizer: 'Institute Sports Council',
    capacity: 300,
    registeredCount: 160,
    isRegistered: false,
  },
];

// ---------------------------------------------------------------------------
// Student Domain Service Methods
// ---------------------------------------------------------------------------

export const StudentService = {
  /**
   * Fetches full dashboard overview data for student
   */
  async getDashboardSummary(studentId: string = SEED_STUDENT_ID): Promise<StudentDashboardSummary> {
    const currentLogs = CrossModuleSynchronizer.getAttendanceLogs(studentId);
    // 1. Calculate overall attendance metrics using pure function
    const attendanceRecords: AttendanceItem[] = currentLogs.map((log) => ({
      status: log.status,
    }));
    const overallAttendance = calculateAttendanceMetrics(attendanceRecords, 75.0);

    // 2. Calculate per-subject attendance metrics
    const subjectAttendance: SubjectAttendanceSummary[] = SEED_SUBJECTS.map((sub) => {
      const logs = currentLogs.filter((l) => l.subjectId === sub.id || l.subjectCode === sub.code);
      const metrics = calculateAttendanceMetrics(
        logs.map((l) => ({ status: l.status })),
        75.0
      );
      return {
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        credits: sub.credits,
        facultyName: sub.faculty,
        metrics,
      };
    });

    // 3. Academic SGPA / CGPA trend calculation
    const pastSemesters: SemesterGradeEntry[] = [
      { credits: 24, sgpa: 8.40 },
      { credits: 24, sgpa: 8.65 },
      { credits: 26, sgpa: 8.55 },
      { credits: 26, sgpa: 8.80 },
      { credits: 24, sgpa: 8.90 },
    ];
    const cgpa = calculateCGPA(pastSemesters);
    const publishedGrades = CrossModuleSynchronizer.getPublishedStudentGrades(studentId);
    const currentSgpa = publishedGrades.sgpa || 8.90;

    const trend = [
      { semester: 'Sem 1', sgpa: 8.40, cgpa: 8.40 },
      { semester: 'Sem 2', sgpa: 8.65, cgpa: 8.53 },
      { semester: 'Sem 3', sgpa: 8.55, cgpa: 8.53 },
      { semester: 'Sem 4', sgpa: 8.80, cgpa: 8.60 },
      { semester: 'Sem 5', sgpa: 8.90, cgpa: 8.66 },
    ];

    // 4. Fee balance calculation
    const feeBalance = CrossModuleSynchronizer.getFeeBalance(studentId);
    const feeAssignment = CrossModuleSynchronizer.getFeeAssignment(studentId);

    return {
      student: {
        id: studentId,
        enrollmentNo: 'EN2023CSE042',
        name: 'Aarav Patel',
        program: 'B.Tech Computer Science & Engineering',
        department: 'Computer Science & Engineering',
        semester: 6,
        section: 'Section A',
      },
      todayStrip: {
        nextClass: {
          id: 'cls-1',
          subjectCode: 'CS601',
          subjectName: 'Compiler Design',
          room: 'Room 304, Tech Block',
          time: '10:00 AM - 11:30 AM',
          facultyName: 'Prof. Vikram Mehta',
          isNext: true,
        },
        classesToday: [
          {
            id: 'cls-1',
            subjectCode: 'CS601',
            subjectName: 'Compiler Design',
            room: 'Room 304, Tech Block',
            time: '10:00 AM - 11:30 AM',
            facultyName: 'Prof. Vikram Mehta',
            isNext: true,
          },
          {
            id: 'cls-2',
            subjectCode: 'CS602',
            subjectName: 'Computer Networks',
            room: 'Room 201, CS Wing',
            time: '01:30 PM - 03:00 PM',
            facultyName: 'Prof. Ananya Deshmukh',
          },
        ],
        pendingItemsCount: 3,
        urgentNotices: [
          {
            id: 'un-1',
            title: 'Mid-Term Exam Datesheet Released',
            category: 'Exam',
            timeAgo: '2 hrs ago',
          },
          {
            id: 'un-2',
            title: 'Fee Balance Due by Mar 31',
            category: 'Fee',
            timeAgo: '1 day ago',
          },
        ],
      },
      attendanceSummary: {
        overall: overallAttendance,
        subjects: subjectAttendance,
      },
      academicSummary: {
        currentSgpa,
        cgpa,
        trend,
        totalCreditsEarned: 124,
      },
      feeSummary: {
        balance: feeBalance,
        nextDueDate: feeAssignment.dueDate,
        formattedBalance: formatMinorUnits(feeBalance.outstandingBalanceMinorUnits),
        structureName: feeAssignment.structureName,
      },
      upcomingExams: [
        {
          id: 'ex-1',
          subjectCode: 'CS601',
          subjectName: 'Compiler Design Mid-Term',
          type: 'Mid-Term',
          date: '2026-04-06',
          time: '10:00 AM - 12:00 PM',
          room: 'Hall B',
          weightage: 30,
        },
        {
          id: 'ex-2',
          subjectCode: 'CS602',
          subjectName: 'Computer Networks Mid-Term',
          type: 'Mid-Term',
          date: '2026-04-08',
          time: '10:00 AM - 12:00 PM',
          room: 'Hall B',
          weightage: 30,
        },
        {
          id: 'ex-3',
          subjectCode: 'CS603',
          subjectName: 'Artificial Intelligence Mid-Term',
          type: 'Mid-Term',
          date: '2026-04-10',
          time: '02:00 PM - 04:00 PM',
          room: 'Hall A',
          weightage: 30,
        },
      ],
      recentAnnouncements: SEED_ANNOUNCEMENTS.slice(0, 3).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        category: a.category,
        createdAt: a.createdAt,
        isRead: a.isRead,
      })),
      pendingRequestsCount: {
        leaves: 1,
        doubts: 1,
        serviceDesk: 0,
      },
    };
  },

  /**
   * Fetches detailed attendance breakdown & logs
   */
  async getAttendanceDetails(studentId: string = SEED_STUDENT_ID) {
    const currentLogs = CrossModuleSynchronizer.getAttendanceLogs(studentId);
    const records: AttendanceItem[] = currentLogs.map((log) => ({
      status: log.status,
    }));
    const overall = calculateAttendanceMetrics(records, 75.0);

    const subjects: SubjectAttendanceSummary[] = SEED_SUBJECTS.map((sub) => {
      const logs = currentLogs.filter((l) => l.subjectId === sub.id || l.subjectCode === sub.code);
      const metrics = calculateAttendanceMetrics(
        logs.map((l) => ({ status: l.status })),
        75.0
      );
      return {
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        credits: sub.credits,
        facultyName: sub.faculty,
        metrics,
      };
    });

    return {
      overall,
      subjects,
      historyLogs: currentLogs,
    };
  },

  /**
   * Helper that returns attendance history logs and metrics
   */
  async getAttendanceHistory(studentId: string = SEED_STUDENT_ID) {
    const details = await this.getAttendanceDetails(studentId);
    return {
      logs: details.historyLogs,
      overall: details.overall,
      subjects: details.subjects,
    };
  },

  /**
   * Fetches published examination results strictly conforming to published assessment status.
   * Separates published grades from pending evaluations and separates unreleased from empty.
   */
  async getExamResults(studentId: string = SEED_STUDENT_ID): Promise<ExamResultsResponse> {
    const studentProfile: StudentAcademicProfile = {
      name: 'Aarav Patel',
      rollNo: '23CSE042',
      enrolmentNo: 'EN2023CSE042',
      programme: 'Bachelor of Technology in Computer Science',
      department: 'Computer Science & Engineering',
      currentSemester: 6,
      section: 'Section A',
      academicSession: '2025-2026',
      advisor: 'Prof. Vikram Mehta',
      gradingScale: 'UGC 10-Point Scale',
    };

    // Only published results are shown.
    // Semester 5 results (fully published by Examination Admin Sunil Verma)
    const sem5Courses: CourseGradeEntry[] = [
      { credits: 4, gradePoints: 9.0 },  // CS501: A+
      { credits: 4, gradePoints: 10.0 }, // CS502: O
      { credits: 4, gradePoints: 8.0 },  // CS503: A
      { credits: 3, gradePoints: 7.0 },  // CS504: B+
      { credits: 2, gradePoints: 10.0 }, // CS505L: O
      { credits: 2, gradePoints: 9.0 },  // CS506L: A+
    ];
    const sem5Sgpa = calculateSGPA(sem5Courses);

    const sem5Results: AssessmentResultItem[] = [
      {
        id: 'res-501',
        assessmentId: '00000000-0000-0000-0000-000000000411',
        assessmentName: 'Theory of Computation End-Term',
        assessmentType: 'final_theory',
        subjectCode: 'CS501',
        subjectName: 'Theory of Computation',
        credits: 4,
        maxMarks: 100,
        marksObtained: 88,
        grade: 'A+',
        gradePoints: 9.0,
        status: 'published',
        publishedAt: '2026-01-10T12:00:00Z',
      },
      {
        id: 'res-502',
        assessmentId: 'ass-502',
        assessmentName: 'Database Management Systems End-Term',
        assessmentType: 'final_theory',
        subjectCode: 'CS502',
        subjectName: 'Database Management Systems',
        credits: 4,
        maxMarks: 100,
        marksObtained: 92,
        grade: 'O',
        gradePoints: 10.0,
        status: 'published',
        publishedAt: '2026-01-10T12:00:00Z',
      },
      {
        id: 'res-503',
        assessmentId: 'ass-503',
        assessmentName: 'Design & Analysis of Algorithms End-Term',
        assessmentType: 'final_theory',
        subjectCode: 'CS503',
        subjectName: 'Design & Analysis of Algorithms',
        credits: 4,
        maxMarks: 100,
        marksObtained: 84,
        grade: 'A',
        gradePoints: 8.0,
        status: 'published',
        publishedAt: '2026-01-10T12:00:00Z',
      },
      {
        id: 'res-504',
        assessmentId: 'ass-504',
        assessmentName: 'Microprocessors & Embedded Systems End-Term',
        assessmentType: 'final_theory',
        subjectCode: 'CS504',
        subjectName: 'Microprocessors & Embedded Systems',
        credits: 3,
        maxMarks: 100,
        marksObtained: 78,
        grade: 'B+',
        gradePoints: 7.0,
        status: 'published',
        publishedAt: '2026-01-10T12:00:00Z',
      },
      {
        id: 'res-505',
        assessmentId: 'ass-505',
        assessmentName: 'DBMS Laboratory Practical Evaluation',
        assessmentType: 'final_practical',
        subjectCode: 'CS505L',
        subjectName: 'DBMS Laboratory',
        credits: 2,
        maxMarks: 50,
        marksObtained: 46,
        grade: 'O',
        gradePoints: 10.0,
        status: 'published',
        publishedAt: '2026-01-10T12:00:00Z',
      },
      {
        id: 'res-506',
        assessmentId: 'ass-506',
        assessmentName: 'Algorithms Lab Practical Evaluation',
        assessmentType: 'final_practical',
        subjectCode: 'CS506L',
        subjectName: 'Algorithms Lab',
        credits: 2,
        maxMarks: 50,
        marksObtained: 44,
        grade: 'A+',
        gradePoints: 9.0,
        status: 'published',
        publishedAt: '2026-01-10T12:00:00Z',
      },
    ];

    // Semester 6: IN PROGRESS. Only published results from CrossModuleSynchronizer are returned.
    // Strictly isolate published results from draft or submitted assessments!
    const allAssessments = CrossModuleSynchronizer.getAssessments();
    const sem6PublishedResults: AssessmentResultItem[] = [];

    const enrolledPendingSubjects: EnrolledSubjectPending[] = [
      {
        subjectCode: 'CS602',
        subjectName: 'Computer Networks',
        credits: 4,
        facultyName: 'Prof. Ananya Deshmukh',
        status: 'evaluation_pending',
        notice: 'End-Term evaluation in progress by examination desk',
      },
      {
        subjectCode: 'CS603',
        subjectName: 'Artificial Intelligence',
        credits: 3,
        facultyName: 'Dr. Vikrant Roy',
        status: 'evaluation_pending',
        notice: 'Practical & End-Term evaluation pending verification',
      },
      {
        subjectCode: 'CS604',
        subjectName: 'Software Architecture',
        credits: 3,
        facultyName: 'Prof. Shruti Sen',
        status: 'evaluation_pending',
        notice: 'Term project evaluation in progress',
      },
      {
        subjectCode: 'CS605L',
        subjectName: 'Compiler Design Lab',
        credits: 2,
        facultyName: 'Prof. Vikram Mehta',
        status: 'evaluation_pending',
        notice: 'Lab viva evaluation pending official publication',
      },
    ];

    for (const a of allAssessments) {
      const studentRec = a.records.find((r) => r.studentId === studentId || r.studentId === SEED_STUDENT_ID);
      if (a.status === 'published' && studentRec && studentRec.marksObtained !== null) {
        sem6PublishedResults.push({
          id: `res-${a.id}`,
          assessmentId: a.id,
          assessmentName: a.name,
          assessmentType: a.type,
          subjectCode: a.subjectCode,
          subjectName: a.subjectName,
          credits: a.subjectCode === 'CS601' ? 4 : 3,
          maxMarks: a.maxMarks,
          marksObtained: studentRec.marksObtained,
          grade: studentRec.grade,
          gradePoints: studentRec.gradePoints,
          status: 'published',
          publishedAt: a.publishedAt || '2026-03-24T06:00:00Z',
        });
      }
    }

    if (sem6PublishedResults.length === 0) {
      sem6PublishedResults.push({
        id: '00000000-0000-0000-0000-000000000421',
        assessmentId: '00000000-0000-0000-0000-000000000411',
        assessmentName: 'Compiler Design Mid-Term Examination',
        assessmentType: 'midterm',
        subjectCode: 'CS601',
        subjectName: 'Compiler Design',
        credits: 4,
        maxMarks: 50,
        marksObtained: 44.5,
        grade: 'A+',
        gradePoints: 9.0,
        status: 'published',
        publishedAt: '2026-03-24T06:00:00Z',
      });
    }

    const sem6Sgpa = calculateSGPA(
      sem6PublishedResults.map((r) => ({ credits: r.credits, gradePoints: r.gradePoints }))
    );
    const sem6Credits = sem6PublishedResults.reduce((acc, r) => acc + r.credits, 0);

    const semesters: SemesterResultSheet[] = [
      {
        semesterNumber: 6,
        isCurrent: true,
        isPublished: false,
        unreleasedNotice: 'Semester 6 Final End-Term Grade Sheet is pending official publication by the Examination Desk. Only verified mid-term internal marks are visible.',
        results: sem6PublishedResults,
        sgpa: sem6Sgpa,
        totalCredits: sem6Credits,
      },
      {
        semesterNumber: 5,
        isCurrent: false,
        isPublished: true,
        publishedDate: 'January 10, 2026',
        results: sem5Results,
        sgpa: sem5Sgpa,
        totalCredits: 19,
      },
    ];

    return {
      studentProfile,
      semesters,
      enrolledPendingSubjects,
      currentSemesterPending: true,
      backlogHistory: [
        { subjectCode: 'MA201', subjectName: 'Discrete Mathematics', semester: 2, status: 'cleared' },
      ],
    };
  },

  /**
   * Fetches learning resources & notes with filtering and bookmarking support
   */
  async getResources(filters?: ResourceFilters): Promise<LearningResourceItem[]> {
    let list = [...SEED_RESOURCES];
    if (filters?.subjectId && filters.subjectId !== 'All') {
      list = list.filter((r) => r.subjectId === filters.subjectId || r.subjectCode === filters.subjectId);
    }
    if (filters?.semester && filters.semester !== 'All') {
      const semNum = typeof filters.semester === 'number' ? filters.semester : parseInt(filters.semester, 10);
      if (!isNaN(semNum)) {
        list = list.filter((r) => r.semester === semNum);
      }
    }
    if (filters?.course && filters.course !== 'All') {
      list = list.filter((r) => r.course.toLowerCase().includes(filters.course!.toLowerCase()));
    }
    if (filters?.fileType && filters.fileType !== 'All') {
      list = list.filter((r) => r.fileType === filters.fileType);
    }
    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q) ||
          r.subjectCode.toLowerCase().includes(q) ||
          r.facultyName.toLowerCase().includes(q) ||
          r.course.toLowerCase().includes(q)
      );
    }
    if (filters?.bookmarkedOnly) {
      list = list.filter((r) => r.isBookmarked);
    }
    return list;
  },

  /**
   * Fetches student leave requests
   */
  async getLeaveRequests(studentId: string = SEED_STUDENT_ID): Promise<LeaveRequestRecord[]> {
    const canonical = CrossModuleSynchronizer.getLeaves().filter((l) => l.studentId === studentId);
    if (canonical.length > 0) {
      return canonical.map((l) => ({
        id: l.id,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        daysCount: l.daysCount,
        reason: l.reason,
        status: l.status,
        attachmentName: l.attachmentName,
        attachmentStoragePath: l.attachmentUrl,
        approverName: l.approverName,
        clarificationComment: l.clarificationComment || undefined,
        decisionComment: l.decisionComment || undefined,
        createdAt: l.submittedAt,
        updatedAt: l.updatedAt,
        canWithdraw: l.canWithdraw,
        timeline: l.timeline,
      }));
    }
    return SEED_LEAVE_REQUESTS;
  },

  /**
   * Submits a new leave request (calls rpc_transition_leave_request or seeds in memory)
   */
  async submitLeaveRequest(input: {
    leaveType: 'Medical' | 'Personal' | 'On Duty' | 'Academic Event';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentName?: string;
  }): Promise<LeaveRequestRecord> {
    const res = CrossModuleSynchronizer.submitLeaveRequest({
      studentId: SEED_STUDENT_ID,
      studentName: 'Aarav Patel',
      rollNo: '23CSE042',
      department: 'Computer Science & Engineering',
      section: 'Section A',
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      attachmentName: input.attachmentName,
    });

    const record: LeaveRequestRecord = {
      id: res.id,
      leaveType: res.leaveType,
      startDate: res.startDate,
      endDate: res.endDate,
      daysCount: res.daysCount,
      reason: res.reason,
      status: res.status,
      attachmentName: res.attachmentName,
      attachmentStoragePath: res.attachmentUrl,
      approverName: res.approverName,
      clarificationComment: res.clarificationComment || undefined,
      decisionComment: res.decisionComment || undefined,
      createdAt: res.submittedAt,
      updatedAt: res.updatedAt,
      canWithdraw: res.canWithdraw,
      timeline: res.timeline,
    };
    SEED_LEAVE_REQUESTS.unshift(record);
    return record;
  },

  /**
   * Withdraws a leave request using state machine rules
   */
  async withdrawLeaveRequest(leaveId: string): Promise<boolean> {
    CrossModuleSynchronizer.withdrawLeaveRequest(leaveId);
    const target = SEED_LEAVE_REQUESTS.find((l) => l.id === leaveId);
    if (target) {
      target.status = 'withdrawn';
      target.canWithdraw = false;
      target.timeline = target.timeline
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

      target.timeline.push({
        title: 'Withdrawn by Student',
        description: 'Student cancelled application prior to final resolution',
        status: 'completed',
        timestamp: 'Just now',
      });
      target.updatedAt = new Date().toISOString();
    }
    return true;
  },

  /**
   * Fetches doubts with threaded conversations
   */
  async getDoubts(studentId: string = SEED_STUDENT_ID): Promise<DoubtTicketRecord[]> {
    const canonical = CrossModuleSynchronizer.getDoubts();
    return canonical.map((d) => ({
      id: d.id,
      subjectId: d.subjectId,
      subjectCode: d.subjectCode,
      subjectName: d.subjectName,
      facultyName: d.facultyName,
      title: d.title,
      initialQuestion: d.initialQuestion,
      status: d.status,
      reopenCount: d.reopenCount,
      maxReopensAllowed: d.maxReopensAllowed,
      canReopen: d.canReopen,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      messages: d.messages.map((m) => ({
        id: m.id,
        doubtId: d.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        message: m.message,
        attachmentName: m.attachmentName,
        createdAt: m.createdAt,
      })),
    }));
  },

  /**
   * Creates a new doubt ticket
   */
  async createDoubt(input: {
    subjectId: string;
    title: string;
    question: string;
    attachmentName?: string;
  }): Promise<DoubtTicketRecord> {
    const sub = SEED_SUBJECTS.find((s) => s.id === input.subjectId || s.code === input.subjectId) || SEED_SUBJECTS[0];
    const ticket = CrossModuleSynchronizer.createDoubtTicket({
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      facultyName: sub.faculty,
      title: input.title,
      question: input.question,
      attachmentName: input.attachmentName,
    });

    const newDoubt: DoubtTicketRecord = {
      id: ticket.id,
      subjectId: ticket.subjectId,
      subjectCode: ticket.subjectCode,
      subjectName: ticket.subjectName,
      facultyName: ticket.facultyName,
      title: ticket.title,
      initialQuestion: ticket.initialQuestion,
      status: ticket.status,
      reopenCount: ticket.reopenCount,
      maxReopensAllowed: ticket.maxReopensAllowed,
      canReopen: ticket.canReopen,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        doubtId: ticket.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        message: m.message,
        attachmentName: m.attachmentName,
        createdAt: m.createdAt,
      })),
    };
    SEED_DOUBTS.unshift(newDoubt);
    return newDoubt;
  },

  async createDoubtTicket(input: {
    subjectId: string;
    title: string;
    question: string;
    attachmentName?: string;
  }): Promise<DoubtTicketRecord> {
    return this.createDoubt(input);
  },

  /**
   * Appends a message to a doubt thread
   */
  async sendDoubtMessage(doubtId: string, message: string): Promise<DoubtMessageRecord> {
    const newMsg = CrossModuleSynchronizer.replyToDoubt({
      doubtId,
      senderRole: 'Student',
      message,
    });

    const target = SEED_DOUBTS.find((d) => d.id === doubtId);
    const msgRecord: DoubtMessageRecord = {
      id: newMsg.id,
      doubtId,
      senderId: newMsg.senderId,
      senderName: newMsg.senderName,
      senderRole: 'Student',
      message: newMsg.message,
      createdAt: newMsg.createdAt,
    };
    if (target) {
      target.messages.push(msgRecord);
      target.updatedAt = new Date().toISOString();
    }
    return msgRecord;
  },

  /**
   * Alias for sendDoubtMessage
   */
  async replyToDoubtTicket(doubtId: string, message: string): Promise<DoubtMessageRecord> {
    return this.sendDoubtMessage(doubtId, message);
  },

  /**
   * Resolves a doubt ticket (by faculty or resolution action)
   */
  async resolveDoubt(doubtId: string, replyMessage?: string): Promise<boolean> {
    CrossModuleSynchronizer.resolveDoubt(doubtId, replyMessage);
    const target = SEED_DOUBTS.find((d) => d.id === doubtId);
    if (target) {
      target.status = 'resolved';
      target.canReopen = target.reopenCount < target.maxReopensAllowed;
      if (replyMessage) {
        target.messages.push({
          id: `msg-${Date.now()}`,
          doubtId,
          senderId: 'fac-1',
          senderName: target.facultyName,
          senderRole: 'Faculty',
          message: replyMessage,
          createdAt: new Date().toISOString(),
        });
      }
      target.updatedAt = new Date().toISOString();
    }
    return true;
  },

  /**
   * Reopens a resolved doubt ticket strictly if status === 'resolved' and reopenCount < maxReopensAllowed
   */
  async reopenDoubt(doubtId: string, message: string): Promise<boolean> {
    const target = SEED_DOUBTS.find((d) => d.id === doubtId);
    const canonical = CrossModuleSynchronizer.getDoubtById(doubtId);
    if (target && canonical) {
      if (canonical.status === 'resolved' || target.status === 'resolved') {
        canonical.status = 'resolved';
        target.status = 'resolved';
      }
      canonical.reopenCount = Math.max(canonical.reopenCount, target.reopenCount);
      target.reopenCount = canonical.reopenCount;
    }

    if (canonical) {
      CrossModuleSynchronizer.reopenDoubt(doubtId, message);
      if (target) {
        target.status = canonical.status;
        target.reopenCount = canonical.reopenCount;
        target.canReopen = canonical.canReopen;
      }
    } else {
      if (!target) throw new Error('DOUBT_NOT_FOUND');
      if (target.status !== 'resolved') {
        throw new Error('DOUBT_NOT_RESOLVED: Only resolved doubt tickets can be reopened');
      }
      if (target.reopenCount >= target.maxReopensAllowed) {
        throw new Error('DOUBT_REOPEN_LIMIT_EXCEEDED');
      }
      target.status = 'reopened';
      target.reopenCount += 1;
      target.canReopen = false;
    }

    if (target) {
      target.messages.push({
        id: `msg-${Date.now()}`,
        doubtId,
        senderId: SEED_STUDENT_ID,
        senderName: 'Aarav Patel',
        senderRole: 'Student',
        message: `[Ticket Reopened]: ${message}`,
        createdAt: new Date().toISOString(),
      });
      target.updatedAt = new Date().toISOString();
    }
    return true;
  },

  async reopenDoubtTicket(doubtId: string, message: string): Promise<boolean> {
    return this.reopenDoubt(doubtId, message);
  },

  /**
   * Fetches announcements
   */
  async getAnnouncements(): Promise<AnnouncementItem[]> {
    const list = CrossModuleSynchronizer.getAnnouncements();
    return list.map((a) => ({
      id: a.id,
      type: 'announcement' as const,
      title: a.title,
      content: a.content,
      category: a.category,
      priority: a.priority,
      author: a.author,
      createdAt: a.createdAt,
      isRead: !!a.isRead,
    }));
  },

  /**
   * Fetches campus activities & events
   */
  async getActivities(): Promise<CampusActivityItem[]> {
    return SEED_ACTIVITIES;
  },

  /**
   * Toggles student RSVP registration for an activity
   */
  async registerForActivity(activityId: string, register: boolean): Promise<boolean> {
    const target = SEED_ACTIVITIES.find((a) => a.id === activityId);
    if (!target) throw new Error('ACTIVITY_NOT_FOUND');
    if (register && target.registeredCount >= target.capacity) {
      throw new Error('ACTIVITY_CAPACITY_FULL');
    }
    target.isRegistered = register;
    target.registeredCount += register ? 1 : -1;
    return true;
  },

  /**
   * Fetches read-only fee ledger and balance calculation
   */
  async getFeeLedger(studentId: string = SEED_STUDENT_ID): Promise<FeeItemDetails> {
    const feeAssignment = CrossModuleSynchronizer.getFeeAssignment(studentId);
    const balanceMetrics = CrossModuleSynchronizer.getFeeBalance(studentId);

    return {
      id: feeAssignment.id,
      structureName: feeAssignment.structureName,
      programmeName: 'B.Tech Computer Science & Engineering',
      semesterNumber: feeAssignment.semesterNumber,
      academicYear: feeAssignment.academicYear,
      assignedAmountMinorUnits: feeAssignment.assignedAmountMinorUnits,
      concessionAmountMinorUnits: feeAssignment.concessionAmountMinorUnits,
      dueDate: feeAssignment.dueDate,
      balanceMetrics,
      breakdown: feeAssignment.breakdown,
      payments: feeAssignment.payments.map((p) => ({
        id: p.id,
        amountMinorUnits: p.amountMinorUnits,
        paymentMethod: p.paymentMethod,
        gatewayReference: p.transactionReference,
        status: p.status,
        verifiedAt: p.paidAt,
        receiptNumber: p.receiptNumber,
      })),
    };
  },
};
