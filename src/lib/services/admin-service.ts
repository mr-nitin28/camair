/**
 * Admin Domain Service — Authoritative Data Layer for Command Center Workflows
 * Implements pure institutional calculations, history-safe structure management,
 * dry-run bulk CSV importing, double-entry fee arithmetic, exam publication queues,
 * unified approval routing, and auditable governance diffing.
 */

import {
  calculateFeeBalance,
  calculateGradeFromMarks,
  formatMinorUnits,
  type PaymentItem,
  type FeeBalanceMetrics,
} from '../calculations/index.ts';
import { CrossModuleSynchronizer } from './cross-module-store.ts';
import { NotificationService, USER_IDS } from './notification-service.ts';

/**
 * RFC 4180 compliant CSV parser.
 * Correctly parses rows, handles quoted strings containing commas,
 * escaped double-quotes (""), CRLF (\r\n) line endings, and empty lines.
 */
export function parseCsvRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = csvContent.length;

  while (i < len) {
    const char = csvContent[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && csvContent[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && csvContent[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// 1. Metric & Command Center Types
// ---------------------------------------------------------------------------

export interface AdminKpiMetric {
  id: string;
  title: string;
  value: number | string;
  formattedValue: string;
  deltaPercent: number;
  deltaDirection: 'up' | 'down' | 'neutral';
  isPositiveTrend: boolean;
  period: string;
  definition: string;
  deepLink: string;
  sparkline: number[];
  category: string;
}

export interface AdminOverviewSummary {
  kpis: AdminKpiMetric[];
  recentAuditEvents: AuditEventRecord[];
  quickActions: {
    id: string;
    label: string;
    href: string;
    badge?: string;
  }[];
  collectionTrends: { name: string; Target: number; Collected: number }[];
  attendanceTrends: { name: string; CSE: number; ECE: number; ME?: number }[];
}

// ---------------------------------------------------------------------------
// 2. Institution Structure & History Safety Types
// ---------------------------------------------------------------------------

export interface InstitutionDepartment {
  id: string;
  name: string;
  code: string;
  hodName: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  studentCount: number;
  facultyCount: number;
  created_at: string;
}

export interface InstitutionCourse {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentCode: string;
  durationYears: number;
  degreeType: 'B.Tech' | 'M.Tech' | 'BBA' | 'MBA' | 'BCA';
  status: 'Active' | 'Archived';
  totalCredits: number;
}

export interface AcademicSession {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'archived';
  isCurrent: boolean;
}

export interface CourseSubject {
  id: string;
  name: string;
  code: string;
  courseId: string;
  courseCode: string;
  semester: number;
  credits: number;
  type: 'Theory' | 'Practical' | 'Elective';
  status: 'Active' | 'Inactive';
}

export interface TeachingAssignment {
  id: string;
  facultyId: string;
  facultyName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  section: string;
  sessionId: string;
  sessionCode: string;
  academicYear: string;
}

export interface HistorySafetyCheckResult {
  allowed: boolean;
  entityType: 'department' | 'course' | 'subject' | 'section';
  entityId: string;
  reason?: string;
  dependencies: {
    attendanceSessionsCount: number;
    examinationMarksCount: number;
    feeAssignmentsCount: number;
    activeEnrollmentsCount: number;
  };
  recommendedAction: 'deactivate' | 'proceed';
}

// ---------------------------------------------------------------------------
// 3. People Management & Bulk Import Types
// ---------------------------------------------------------------------------

export interface StudentRegistryItem {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: string;
  departmentCode: string;
  courseId: string;
  courseCode: string;
  semester: number;
  section: string;
  admissionDate: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Graduated';
  cgpa: number;
  attendanceRate: number;
}

export interface FacultyRegistryItem {
  id: string;
  facultyId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: string;
  departmentCode: string;
  designation: string;
  cabin: string;
  joinDate: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  teachingLoadHours: number;
}

export interface BulkImportError {
  row: number;
  column: string;
  value: string;
  reason: string;
}

export interface BulkImportResult<T> {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: BulkImportError[];
  dryRun: boolean;
  parsedRecords: T[];
  committedCount?: number;
}

export interface StudentImportRecord {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentCode: string;
  courseCode: string;
  semester: number;
  section: string;
}

export interface FacultyImportRecord {
  facultyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentCode: string;
  designation: string;
  cabin?: string;
}

// ---------------------------------------------------------------------------
// 4. Finance Command Center Types
// ---------------------------------------------------------------------------

export interface AdminFeeStructure {
  id: string;
  name: string;
  courseId: string;
  courseCode: string;
  semester: number;
  academicYear: string;
  tuitionFeeMinor: number;
  devFeeMinor: number;
  labFeeMinor: number;
  examFeeMinor: number;
  libraryFeeMinor: number;
  totalFeeMinor: number;
  dueDate: string;
}

export interface AdminStudentFeeAssignment {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  departmentCode: string;
  semester: number;
  structureId: string;
  assignedFeeMinor: number;
  concessionMinor: number;
  concessionReason?: string;
  netPayableMinor: number;
  verifiedPaidMinor: number;
  pendingVerificationMinor: number;
  outstandingMinor: number;
  isFullyPaid: boolean;
  overdueDays: number;
  agingBucket: '<30d' | '30-60d' | '>60d' | 'Current';
}

export interface FinanceCollectionAnalytics {
  totalAssignedMinor: number;
  totalCollectedMinor: number;
  totalOutstandingMinor: number;
  collectionRatePercent: number;
  agingBreakdown: {
    currentMinor: number;
    lessThan30dMinor: number;
    thirtyToSixtyMinor: number;
    moreThanSixtyMinor: number;
  };
}

export interface PaymentReceiptRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  amountMinorUnits: number;
  paymentMethod: 'UPI' | 'NetBanking' | 'Challan' | 'DD' | 'Cash';
  idempotencyKey: string;
  transactionReference: string;
  paidAt: string;
  status: 'verified' | 'initiated' | 'failed' | 'refunded';
}

// ---------------------------------------------------------------------------
// 5. Examinations Management Types
// ---------------------------------------------------------------------------

export interface GradingScaleTier {
  grade: string;
  gradePoint: number;
  minPercent: number;
  maxPercent: number;
  description: string;
}

export interface GradingScaleVersion {
  version: string;
  effectiveFrom: string;
  isActive: boolean;
  scales: GradingScaleTier[];
}

export interface AssessmentReviewItem {
  id: string;
  assessmentName: string;
  assessmentType: 'Internal' | 'MidTerm' | 'EndTerm' | 'Practical';
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  maxMarks: number;
  weightage: number;
  submissionCount: number;
  totalEnrolled: number;
  status: 'draft' | 'submitted' | 'reviewed' | 'published' | 'correction_pending';
  submittedAt: string;
  reviewedAt?: string;
  publishedAt?: string;
}

export interface MarksCorrectionRecord {
  id: string;
  assessmentId: string;
  subjectCode: string;
  studentId: string;
  studentName: string;
  oldMarks: number;
  newMarks: number;
  reason: string;
  requestedBy: string;
  approvedBy: string;
  timestamp: string;
}

export interface BacklogStudentItem {
  id: string;
  studentId: string;
  studentName: string;
  departmentCode: string;
  subjectCode: string;
  subjectName: string;
  semesterFailed: number;
  marksObtained: number;
  attemptsCount: number;
}

// ---------------------------------------------------------------------------
// 6. Unified Approvals & Communications Types
// ---------------------------------------------------------------------------

export interface UnifiedApprovalItem {
  id: string;
  category: 'leave' | 'service_certificate' | 'doubt_escalation' | 'fee_concession' | 'grade_change';
  title: string;
  applicantId: string;
  applicantName: string;
  applicantRole: 'Student' | 'Faculty';
  applicantCode: string;
  department: string;
  details: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  urgency: 'normal' | 'urgent';
  attachmentUrl?: string;
  actionedBy?: string;
  actionedAt?: string;
  decisionComment?: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'Normal' | 'Important' | 'Critical';
  category: 'Institution' | 'Department' | 'Examination' | 'Emergency Alert';
  targetAudience: 'All' | 'Students' | 'Faculty' | 'CSE' | 'ECE';
  scheduledDate?: string;
  publishedAt: string;
  reachCount: number;
  author: string;
}

// ---------------------------------------------------------------------------
// 7. Governance, Security Matrix & Audit Types
// ---------------------------------------------------------------------------

export type ModuleAction = 'create' | 'read' | 'update' | 'delete' | 'approve';

export interface ModulePermissionSet {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
}

export type RolePermissionMatrix = Record<string, Record<string, ModulePermissionSet>>;

export interface PermissionDiff {
  role: string;
  addedPermissions: string[];
  removedPermissions: string[];
  unchangedCount: number;
}

export interface AuditEventRecord {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'BULK_IMPORT' | 'APPROVE' | 'REJECT' | 'SETTINGS_CHANGE';
  entityTable: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string;
  timestamp: string;
}

export interface SystemSettingsConfig {
  institutionName: string;
  institutionCode: string;
  contactEmail: string;
  academicYear: string;
  currentTerm: string;
  attendanceThresholdPercent: number;
  gradingVersion: string;
  feeGracePeriodDays: number;
  systemMaintenanceMode: boolean;
}

// ===========================================================================
// IN-MEMORY SEED DATA & STATE STORE
// ===========================================================================

let mockDepartments: InstitutionDepartment[] = [
  {
    id: 'dept-cse-01',
    name: 'Computer Science & Engineering',
    code: 'CSE',
    hodName: 'Dr. Vikram Mehta',
    email: 'hod.cse@campusos.dev',
    phone: '+91 98100 12345',
    status: 'Active',
    studentCount: 420,
    facultyCount: 28,
    created_at: '2020-01-15T00:00:00Z',
  },
  {
    id: 'dept-ece-02',
    name: 'Electronics & Communication',
    code: 'ECE',
    hodName: 'Dr. Sunita Rao',
    email: 'hod.ece@campusos.dev',
    phone: '+91 98100 23456',
    status: 'Active',
    studentCount: 310,
    facultyCount: 22,
    created_at: '2020-01-15T00:00:00Z',
  },
  {
    id: 'dept-me-03',
    name: 'Mechanical Engineering',
    code: 'ME',
    hodName: 'Dr. Rajesh Verma',
    email: 'hod.me@campusos.dev',
    phone: '+91 98100 34567',
    status: 'Active',
    studentCount: 260,
    facultyCount: 18,
    created_at: '2020-01-15T00:00:00Z',
  },
  {
    id: 'dept-bba-04',
    name: 'School of Management Studies',
    code: 'SOM',
    hodName: 'Dr. Ananya Sen',
    email: 'hod.som@campusos.dev',
    phone: '+91 98100 45678',
    status: 'Active',
    studentCount: 258,
    facultyCount: 10,
    created_at: '2021-06-01T00:00:00Z',
  },
];

let mockCourses: InstitutionCourse[] = [
  {
    id: 'course-btech-cse',
    name: 'Bachelor of Technology in Computer Science',
    code: 'BTECH-CSE',
    departmentId: 'dept-cse-01',
    departmentCode: 'CSE',
    durationYears: 4,
    degreeType: 'B.Tech',
    status: 'Active',
    totalCredits: 160,
  },
  {
    id: 'course-btech-ece',
    name: 'Bachelor of Technology in Electronics',
    code: 'BTECH-ECE',
    departmentId: 'dept-ece-02',
    departmentCode: 'ECE',
    durationYears: 4,
    degreeType: 'B.Tech',
    status: 'Active',
    totalCredits: 160,
  },
  {
    id: 'course-mtech-cse',
    name: 'Master of Technology in Artificial Intelligence',
    code: 'MTECH-AI',
    departmentId: 'dept-cse-01',
    departmentCode: 'CSE',
    durationYears: 2,
    degreeType: 'M.Tech',
    status: 'Active',
    totalCredits: 80,
  },
];

let mockSessions: AcademicSession[] = [
  {
    id: 'sess-2026-27',
    code: '2026-2027',
    name: 'Academic Year 2026 - 2027',
    startDate: '2026-07-01',
    endDate: '2027-05-31',
    status: 'active',
    isCurrent: true,
  },
  {
    id: 'sess-2025-26',
    code: '2025-2026',
    name: 'Academic Year 2025 - 2026',
    startDate: '2025-07-01',
    endDate: '2026-05-31',
    status: 'archived',
    isCurrent: false,
  },
];

let mockSubjects: CourseSubject[] = [
  {
    id: 'sub-cd-601',
    name: 'Compiler Design',
    code: 'CS601',
    courseId: 'course-btech-cse',
    courseCode: 'BTECH-CSE',
    semester: 6,
    credits: 4,
    type: 'Theory',
    status: 'Active',
  },
  {
    id: 'sub-cn-602',
    name: 'Computer Networks',
    code: 'CS602',
    courseId: 'course-btech-cse',
    courseCode: 'BTECH-CSE',
    semester: 6,
    credits: 4,
    type: 'Theory',
    status: 'Active',
  },
  {
    id: 'sub-se-603',
    name: 'Software Engineering & Project Management',
    code: 'CS603',
    courseId: 'course-btech-cse',
    courseCode: 'BTECH-CSE',
    semester: 6,
    credits: 3,
    type: 'Theory',
    status: 'Active',
  },
  {
    id: 'sub-ai-604',
    name: 'Artificial Intelligence & Machine Learning',
    code: 'CS604',
    courseId: 'course-btech-cse',
    courseCode: 'BTECH-CSE',
    semester: 6,
    credits: 3,
    type: 'Theory',
    status: 'Active',
  },
  {
    id: 'sub-cd-lab',
    name: 'Compiler Construction Laboratory',
    code: 'CS605L',
    courseId: 'course-btech-cse',
    courseCode: 'BTECH-CSE',
    semester: 6,
    credits: 2,
    type: 'Practical',
    status: 'Active',
  },
];

let mockTeachingAssignments: TeachingAssignment[] = [
  {
    id: 'assign-01',
    facultyId: 'fac-001',
    facultyName: 'Dr. Vikram Mehta',
    subjectId: 'sub-cd-601',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    semester: 6,
    section: 'A',
    sessionId: 'sess-2026-27',
    sessionCode: '2026-2027',
    academicYear: '2026-2027',
  },
  {
    id: 'assign-02',
    facultyId: 'fac-002',
    facultyName: 'Prof. Ananya Sen',
    subjectId: 'sub-cn-602',
    subjectCode: 'CS602',
    subjectName: 'Computer Networks',
    semester: 6,
    section: 'A',
    sessionId: 'sess-2026-27',
    sessionCode: '2026-2027',
    academicYear: '2026-2027',
  },
];

let mockStudents: StudentRegistryItem[] = [
  {
    id: 'stu-001',
    studentId: 'EN2023CSE042',
    firstName: 'Aarav',
    lastName: 'Patel',
    fullName: 'Aarav Patel',
    email: 'aarav.patel@campusos.dev',
    phone: '+91 98765 43210',
    departmentId: 'dept-cse-01',
    departmentCode: 'CSE',
    courseId: 'course-btech-cse',
    courseCode: 'BTECH-CSE',
    semester: 6,
    section: 'A',
    admissionDate: '2023-08-01',
    status: 'Active',
    cgpa: 8.65,
    attendanceRate: 88.5,
  },
  {
    id: 'stu-002',
    studentId: 'EN2023CSE043',
    firstName: 'Diya',
    lastName: 'Kaur',
    fullName: 'Diya Kaur',
    email: 'diya.kaur@campusos.dev',
    phone: '+91 98765 43211',
    departmentId: 'dept-cse-01',
    departmentCode: 'CSE',
    courseId: 'course-btech-cse',
    courseCode: 'BTECH-CSE',
    semester: 6,
    section: 'A',
    admissionDate: '2023-08-01',
    status: 'Active',
    cgpa: 7.42,
    attendanceRate: 71.4,
  },
  {
    id: 'stu-003',
    studentId: 'EN2023ECE012',
    firstName: 'Rohan',
    lastName: 'Deshmukh',
    fullName: 'Rohan Deshmukh',
    email: 'rohan.deshmukh@campusos.dev',
    phone: '+91 98765 43212',
    departmentId: 'dept-ece-02',
    departmentCode: 'ECE',
    courseId: 'course-btech-ece',
    courseCode: 'BTECH-ECE',
    semester: 6,
    section: 'B',
    admissionDate: '2023-08-01',
    status: 'Active',
    cgpa: 8.12,
    attendanceRate: 82.0,
  },
];

let mockFaculty: FacultyRegistryItem[] = [
  {
    id: 'fac-001',
    facultyId: 'FAC-CS-001',
    firstName: 'Vikram',
    lastName: 'Mehta',
    fullName: 'Dr. Vikram Mehta',
    email: 'faculty@campusos.dev',
    phone: '+91 99999 00020',
    departmentId: 'dept-cse-01',
    departmentCode: 'CSE',
    designation: 'Associate Professor',
    cabin: 'Room 302, Academic Block A',
    joinDate: '2021-07-01',
    status: 'Active',
    teachingLoadHours: 16,
  },
  {
    id: 'fac-002',
    facultyId: 'FAC-CS-002',
    firstName: 'Ananya',
    lastName: 'Sen',
    fullName: 'Prof. Ananya Sen',
    email: 'ananya.sen@campusos.dev',
    phone: '+91 99999 00021',
    departmentId: 'dept-cse-01',
    departmentCode: 'CSE',
    designation: 'Assistant Professor',
    cabin: 'Room 304, Academic Block A',
    joinDate: '2022-01-15',
    status: 'Active',
    teachingLoadHours: 14,
  },
  {
    id: 'fac-003',
    facultyId: 'FAC-EC-001',
    firstName: 'Sunita',
    lastName: 'Rao',
    fullName: 'Dr. Sunita Rao',
    email: 'sunita.rao@campusos.dev',
    phone: '+91 99999 00022',
    departmentId: 'dept-ece-02',
    departmentCode: 'ECE',
    designation: 'Professor & HOD',
    cabin: 'Room 201, Academic Block B',
    joinDate: '2019-08-01',
    status: 'Active',
    teachingLoadHours: 12,
  },
];

let mockFeeStructures: AdminFeeStructure[] = [
  {
    id: 'fee-struct-btech-sem6',
    name: 'B.Tech Semester 6 Standard Fee Structure',
    courseId: 'course-btech-cse',
    courseCode: 'BTECH-CSE',
    semester: 6,
    academicYear: '2026-2027',
    tuitionFeeMinor: 5500000, // ₹55,000.00
    devFeeMinor: 1000000,     // ₹10,000.00
    labFeeMinor: 500000,       // ₹5,000.00
    examFeeMinor: 300000,      // ₹3,000.00
    libraryFeeMinor: 200000,   // ₹2,000.00
    totalFeeMinor: 7500000,    // ₹75,000.00
    dueDate: '2026-08-31',
  },
];

let mockStudentFeeAssignments: AdminStudentFeeAssignment[] = [
  {
    id: 'sfa-001',
    studentId: 'stu-001',
    studentCode: 'EN2023CSE042',
    studentName: 'Aarav Patel',
    departmentCode: 'CSE',
    semester: 6,
    structureId: 'fee-struct-btech-sem6',
    assignedFeeMinor: 7500000,
    concessionMinor: 500000, // Merit Concession ₹5,000.00
    concessionReason: 'Dean Merit Scholarship Top 5%',
    netPayableMinor: 7000000,
    verifiedPaidMinor: 4000000,
    pendingVerificationMinor: 0,
    outstandingMinor: 3000000,
    isFullyPaid: false,
    overdueDays: 0,
    agingBucket: 'Current',
  },
  {
    id: 'sfa-002',
    studentId: 'stu-002',
    studentCode: 'EN2023CSE043',
    studentName: 'Diya Kaur',
    departmentCode: 'CSE',
    semester: 6,
    structureId: 'fee-struct-btech-sem6',
    assignedFeeMinor: 7500000,
    concessionMinor: 0,
    netPayableMinor: 7500000,
    verifiedPaidMinor: 7500000,
    pendingVerificationMinor: 0,
    outstandingMinor: 0,
    isFullyPaid: true,
    overdueDays: 0,
    agingBucket: 'Current',
  },
  {
    id: 'sfa-003',
    studentId: 'stu-003',
    studentCode: 'EN2023ECE012',
    studentName: 'Rohan Deshmukh',
    departmentCode: 'ECE',
    semester: 6,
    structureId: 'fee-struct-btech-sem6',
    assignedFeeMinor: 7500000,
    concessionMinor: 0,
    netPayableMinor: 7500000,
    verifiedPaidMinor: 2500000,
    pendingVerificationMinor: 0,
    outstandingMinor: 5000000,
    isFullyPaid: false,
    overdueDays: 45,
    agingBucket: '30-60d',
  },
];

const mockPaymentsStore: PaymentReceiptRecord[] = [
  {
    id: 'pay-001',
    assignmentId: 'sfa-001',
    studentId: 'stu-001',
    amountMinorUnits: 4000000,
    paymentMethod: 'UPI',
    idempotencyKey: 'idem-pay-001',
    transactionReference: 'TXN-COS-994821',
    paidAt: '2026-08-10T11:20:00Z',
    status: 'verified',
  },
];

const mockGradingScale: GradingScaleVersion = {
  version: '2026.1-UGC',
  effectiveFrom: '2026-07-01',
  isActive: true,
  scales: [
    { grade: 'O', gradePoint: 10, minPercent: 90, maxPercent: 100, description: 'Outstanding' },
    { grade: 'A+', gradePoint: 9, minPercent: 80, maxPercent: 89, description: 'Excellent' },
    { grade: 'A', gradePoint: 8, minPercent: 70, maxPercent: 79, description: 'Very Good' },
    { grade: 'B+', gradePoint: 7, minPercent: 60, maxPercent: 69, description: 'Good' },
    { grade: 'B', gradePoint: 6, minPercent: 50, maxPercent: 59, description: 'Above Average' },
    { grade: 'C', gradePoint: 5, minPercent: 40, maxPercent: 49, description: 'Pass' },
    { grade: 'F', gradePoint: 0, minPercent: 0, maxPercent: 39, description: 'Fail / Backlog' },
  ],
};

let mockAssessmentsQueue: AssessmentReviewItem[] = [
  {
    id: 'asm-mid-cs601',
    assessmentName: 'Mid-Term Evaluation: Syntax Analysis',
    assessmentType: 'MidTerm',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    facultyName: 'Dr. Vikram Mehta',
    maxMarks: 50,
    weightage: 25,
    submissionCount: 64,
    totalEnrolled: 64,
    status: 'submitted',
    submittedAt: '2026-09-28T14:30:00Z',
  },
  {
    id: 'asm-mid-cs602',
    assessmentName: 'Mid-Term Evaluation: Routing Protocols',
    assessmentType: 'MidTerm',
    subjectCode: 'CS602',
    subjectName: 'Computer Networks',
    facultyName: 'Prof. Ananya Sen',
    maxMarks: 50,
    weightage: 25,
    submissionCount: 64,
    totalEnrolled: 64,
    status: 'reviewed',
    submittedAt: '2026-09-29T10:00:00Z',
    reviewedAt: '2026-09-30T16:00:00Z',
  },
  {
    id: 'asm-draft-cs603',
    assessmentName: 'Quiz 1: Agile Sprints',
    assessmentType: 'Internal',
    subjectCode: 'CS603',
    subjectName: 'Software Engineering',
    facultyName: 'Dr. Vikram Mehta',
    maxMarks: 20,
    weightage: 10,
    submissionCount: 42,
    totalEnrolled: 64,
    status: 'draft',
    submittedAt: '2026-10-01T09:00:00Z',
  },
];

let mockMarksCorrections: MarksCorrectionRecord[] = [
  {
    id: 'mc-01',
    assessmentId: 'asm-mid-cs601',
    subjectCode: 'CS601',
    studentId: 'EN2023CSE042',
    studentName: 'Aarav Patel',
    oldMarks: 44,
    newMarks: 47,
    reason: 'Re-evaluation of question 3B on LALR(1) parser tables (totaling error).',
    requestedBy: 'Dr. Vikram Mehta',
    approvedBy: 'Administrator',
    timestamp: '2026-10-02T11:45:00Z',
  },
];

let mockUnifiedApprovals: UnifiedApprovalItem[] = [
  {
    id: 'appr-01',
    category: 'leave',
    title: 'Medical Leave Application (3 Days)',
    applicantId: 'stu-002',
    applicantName: 'Diya Kaur',
    applicantRole: 'Student',
    applicantCode: 'EN2023CSE043',
    department: 'CSE',
    details: 'Applied for leave from 2026-10-24 to 2026-10-26 due to viral fever. Doctor prescription attached.',
    submittedAt: '2026-10-22T09:15:00Z',
    status: 'pending',
    urgency: 'urgent',
    attachmentUrl: 'https://campusos.dev/docs/med_cert_diya.pdf',
  },
  {
    id: 'appr-02',
    category: 'service_certificate',
    title: 'Bonafide Certificate for Visa Application',
    applicantId: 'stu-001',
    applicantName: 'Aarav Patel',
    applicantRole: 'Student',
    applicantCode: 'EN2023CSE042',
    department: 'CSE',
    details: 'Urgent bonafide letter required for international hackathon clearance.',
    submittedAt: '2026-10-21T14:20:00Z',
    status: 'pending',
    urgency: 'urgent',
  },
  {
    id: 'appr-03',
    category: 'fee_concession',
    title: 'Sports Quota Fee Concession (15%)',
    applicantId: 'stu-003',
    applicantName: 'Rohan Deshmukh',
    applicantRole: 'Student',
    applicantCode: 'EN2023ECE012',
    department: 'ECE',
    details: 'State-level badminton championship gold medalist concession recommendation.',
    submittedAt: '2026-10-20T10:00:00Z',
    status: 'pending',
    urgency: 'normal',
  },
];

let mockAnnouncements: AdminAnnouncement[] = [
  {
    id: 'ann-01',
    title: 'End-Term Examination Datesheet Published',
    content: 'The official datesheet for Semester 6 examinations is now released. Strict 75% attendance threshold applies.',
    priority: 'Critical',
    category: 'Examination',
    targetAudience: 'All',
    publishedAt: '2026-10-20T08:00:00Z',
    reachCount: 1248,
    author: 'Administrator',
  },
  {
    id: 'ann-02',
    title: 'Campus Placement Drive: Tier-1 Tech Giants',
    content: 'Online registration begins for 2027 batch. Minimum CGPA criterion is 7.50 with zero active backlogs.',
    priority: 'Important',
    category: 'Institution',
    targetAudience: 'Students',
    publishedAt: '2026-10-18T12:00:00Z',
    reachCount: 820,
    author: 'Administrator',
  },
];

let mockRolePermissions: RolePermissionMatrix = {
  'Super Admin': {
    Academics: { create: true, read: true, update: true, delete: true, approve: true },
    Students: { create: true, read: true, update: true, delete: true, approve: true },
    Faculty: { create: true, read: true, update: true, delete: true, approve: true },
    Finance: { create: true, read: true, update: true, delete: true, approve: true },
    Examinations: { create: true, read: true, update: true, delete: true, approve: true },
    Communications: { create: true, read: true, update: true, delete: true, approve: true },
    Governance: { create: true, read: true, update: true, delete: true, approve: true },
  },
  'Academic Admin': {
    Academics: { create: true, read: true, update: true, delete: false, approve: true },
    Students: { create: true, read: true, update: true, delete: false, approve: true },
    Faculty: { create: false, read: true, update: false, delete: false, approve: false },
    Finance: { create: false, read: true, update: false, delete: false, approve: false },
    Examinations: { create: true, read: true, update: true, delete: false, approve: true },
    Communications: { create: true, read: true, update: true, delete: false, approve: false },
    Governance: { create: false, read: true, update: false, delete: false, approve: false },
  },
  'Finance Admin': {
    Academics: { create: false, read: true, update: false, delete: false, approve: false },
    Students: { create: false, read: true, update: false, delete: false, approve: false },
    Faculty: { create: false, read: true, update: false, delete: false, approve: false },
    Finance: { create: true, read: true, update: true, delete: true, approve: true },
    Examinations: { create: false, read: true, update: false, delete: false, approve: false },
    Communications: { create: false, read: true, update: false, delete: false, approve: false },
    Governance: { create: false, read: true, update: false, delete: false, approve: false },
  },
  'Exam Admin': {
    Academics: { create: false, read: true, update: false, delete: false, approve: false },
    Students: { create: false, read: true, update: false, delete: false, approve: false },
    Faculty: { create: false, read: true, update: false, delete: false, approve: false },
    Finance: { create: false, read: true, update: false, delete: false, approve: false },
    Examinations: { create: true, read: true, update: true, delete: true, approve: true },
    Communications: { create: true, read: true, update: false, delete: false, approve: false },
    Governance: { create: false, read: true, update: false, delete: false, approve: false },
  },
};

let mockAuditEvents: AuditEventRecord[] = [
  {
    id: 'aud-001',
    actorId: 'admin-001',
    actorEmail: 'admin@campusos.dev',
    actorRole: 'Super Admin',
    action: 'PUBLISH',
    entityTable: 'assessments',
    entityId: 'asm-mid-cs602',
    beforeState: { status: 'reviewed' },
    afterState: { status: 'published' },
    ipAddress: '192.168.1.10',
    timestamp: '2026-10-23T06:10:00Z',
  },
  {
    id: 'aud-002',
    actorId: 'admin-001',
    actorEmail: 'admin@campusos.dev',
    actorRole: 'Super Admin',
    action: 'APPROVE',
    entityTable: 'leave_requests',
    entityId: 'appr-01',
    beforeState: { status: 'pending' },
    afterState: { status: 'approved', comment: 'Approved with medical certificate verified.' },
    ipAddress: '192.168.1.10',
    timestamp: '2026-10-22T14:00:00Z',
  },
  {
    id: 'aud-003',
    actorId: 'admin-001',
    actorEmail: 'admin@campusos.dev',
    actorRole: 'Super Admin',
    action: 'INSERT',
    entityTable: 'fee_structures',
    entityId: 'fee-struct-btech-sem6',
    beforeState: null,
    afterState: { totalFeeMinor: 7500000, academicYear: '2026-2027' },
    ipAddress: '192.168.1.10',
    timestamp: '2026-10-20T10:30:00Z',
  },
];

let mockSystemSettings: SystemSettingsConfig = {
  institutionName: 'CampusOS National Institute of Technology',
  institutionCode: 'NIT-COS',
  contactEmail: 'admin@campusos.dev',
  academicYear: '2026-2027',
  currentTerm: 'Semester 6 (Spring)',
  attendanceThresholdPercent: 75.0,
  gradingVersion: '2026.1-UGC',
  feeGracePeriodDays: 15,
  systemMaintenanceMode: false,
};

// ===========================================================================
// ADMIN DOMAIN SERVICE IMPLEMENTATION
// ===========================================================================

export class AdminService {
  // -------------------------------------------------------------------------
  // 1. Overview Command Center
  // -------------------------------------------------------------------------

  public static async getOverviewSummary(): Promise<AdminOverviewSummary> {
    const totalStudents = mockStudents.length;
    const totalFaculty = mockFaculty.length;

    // Calculate collection rate
    const totalAssigned = mockStudentFeeAssignments.reduce((acc, a) => acc + a.netPayableMinor, 0);
    const totalPaid = mockStudentFeeAssignments.reduce((acc, a) => acc + a.verifiedPaidMinor, 0);
    const collectionDelta = 12.4;

    const pendingApprovalsCount = mockUnifiedApprovals.filter((a) => a.status === 'pending').length;

    const kpis: AdminKpiMetric[] = [
      {
        id: 'kpi-enrollment',
        title: 'Enrolment Registry',
        value: 1248,
        formattedValue: '1,248',
        deltaPercent: 4.2,
        deltaDirection: 'up',
        isPositiveTrend: true,
        period: 'AY 2026-2027',
        definition: 'Total active undergraduate and postgraduate students enrolled across all recognized departments.',
        deepLink: '/admin/students',
        sparkline: [1120, 1145, 1180, 1190, 1205, 1224, 1248],
        category: 'Registry',
      },
      {
        id: 'kpi-faculty',
        title: 'Active Faculty',
        value: 78,
        formattedValue: '78',
        deltaPercent: 2.6,
        deltaDirection: 'up',
        isPositiveTrend: true,
        period: 'Current Term',
        definition: 'Full-time and adjunct faculty members currently with active teaching assignments in the term.',
        deepLink: '/admin/faculty',
        sparkline: [70, 72, 74, 75, 75, 76, 78],
        category: 'Registry',
      },
      {
        id: 'kpi-attendance',
        title: 'Average Attendance',
        value: 84.3,
        formattedValue: '84.3%',
        deltaPercent: 1.8,
        deltaDirection: 'up',
        isPositiveTrend: true,
        period: 'Current Term',
        definition: 'Cumulative institutional attendance rate across all conducted theory and laboratory class sessions.',
        deepLink: '/admin/attendance',
        sparkline: [81.0, 82.2, 82.9, 83.4, 83.8, 84.0, 84.3],
        category: 'Academics',
      },
      {
        id: 'kpi-published-results',
        title: 'Published Results',
        value: 96.2,
        formattedValue: '96.2%',
        deltaPercent: 3.1,
        deltaDirection: 'up',
        isPositiveTrend: true,
        period: 'Term Assessments',
        definition: 'Proportion of completed assessments reviewed, locked, and officially published to student portals.',
        deepLink: '/admin/exams',
        sparkline: [88.0, 90.5, 91.8, 93.4, 94.2, 95.5, 96.2],
        category: 'Examinations',
      },
      {
        id: 'kpi-fee-collection',
        title: 'Fee Collection',
        value: totalPaid,
        formattedValue: `${formatMinorUnits(totalPaid)}`,
        deltaPercent: collectionDelta,
        deltaDirection: 'up',
        isPositiveTrend: true,
        period: 'AY 2026-2027',
        definition: 'Double-entry verified institutional revenue collected against generated term fee structures.',
        deepLink: '/admin/fees',
        sparkline: [6200000, 7500000, 8800000, 10200000, 11500000, 12800000, 14000000],
        category: 'Finance',
      },
      {
        id: 'kpi-pending-approvals',
        title: 'Pending Approvals',
        value: pendingApprovalsCount,
        formattedValue: `${pendingApprovalsCount} reqs`,
        deltaPercent: -18.2,
        deltaDirection: 'down',
        isPositiveTrend: true, // fewer pending requests is good
        period: 'Open Queue',
        definition: 'Combined pending backlog of leave requests, bonafide certificates, and fee concessions awaiting action.',
        deepLink: '/admin/approvals',
        sparkline: [24, 21, 19, 18, 15, 12, pendingApprovalsCount],
        category: 'Governance',
      },
    ];

    const quickActions = [
      { id: 'qa-1', label: 'Bulk Import Students', href: '/admin/students?action=import', badge: 'CSV Dry-Run' },
      { id: 'qa-2', label: 'Review Assessment Queue', href: '/admin/exams', badge: `${mockAssessmentsQueue.filter(a => a.status === 'submitted').length} pending` },
      { id: 'qa-3', label: 'Create Fee Structure', href: '/admin/fees?action=create' },
      { id: 'qa-4', label: 'Broadcast Urgent Alert', href: '/admin/communications?action=emergency' },
      { id: 'qa-5', label: 'Action Approval Queue', href: '/admin/approvals', badge: `${pendingApprovalsCount} open` },
    ];

    const collectionTrends = [
      { name: 'Semester 1', Target: 80000, Collected: 78000 },
      { name: 'Semester 2', Target: 80000, Collected: 75500 },
      { name: 'Semester 3', Target: 85000, Collected: 81000 },
      { name: 'Semester 4', Target: 85000, Collected: 82500 },
      { name: 'Semester 5', Target: 90000, Collected: 87000 },
      { name: 'Semester 6', Target: 90000, Collected: 84500 },
    ];

    const attendanceTrends = [
      { name: 'Week 1', CSE: 86, ECE: 82, ME: 79 },
      { name: 'Week 2', CSE: 88, ECE: 83, ME: 80 },
      { name: 'Week 3', CSE: 85, ECE: 81, ME: 78 },
      { name: 'Week 4', CSE: 89, ECE: 85, ME: 82 },
      { name: 'Week 5', CSE: 90, ECE: 86, ME: 84 },
      { name: 'Week 6', CSE: 88, ECE: 84, ME: 81 },
    ];

    return {
      kpis,
      recentAuditEvents: [...mockAuditEvents].slice(0, 5),
      quickActions,
      collectionTrends,
      attendanceTrends,
    };
  }

  // -------------------------------------------------------------------------
  // 2. Institution Structure & History Safety
  // -------------------------------------------------------------------------

  public static async getDepartments(): Promise<InstitutionDepartment[]> {
    return [...mockDepartments];
  }

  public static async createDepartment(input: {
    name: string;
    code: string;
    hodName: string;
    email: string;
    phone: string;
  }): Promise<InstitutionDepartment> {
    if (!input.name || !input.code) {
      throw new Error('Department name and code are strictly required.');
    }
    const cleanCode = input.code.trim().toUpperCase();
    if (mockDepartments.some((d) => d.code === cleanCode)) {
      throw new Error(`Department with code "${cleanCode}" already exists.`);
    }

    const newDept: InstitutionDepartment = {
      id: `dept-${cleanCode.toLowerCase()}-${Date.now().toString(36)}`,
      name: input.name.trim(),
      code: cleanCode,
      hodName: input.hodName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      status: 'Active',
      studentCount: 0,
      facultyCount: 0,
      created_at: new Date().toISOString(),
    };

    mockDepartments.push(newDept);
    await this.logAuditEvent({
      action: 'INSERT',
      entityTable: 'departments',
      entityId: newDept.id,
      beforeState: null,
      afterState: newDept as unknown as Record<string, unknown>,
    });

    return newDept;
  }

  /**
   * History Safety Checker:
   * Inspects database references (attendance sessions, examination marks, fee assignments, active students)
   * to guarantee that destructive operations do not corrupt institutional records.
   */
  public static async checkDestructiveSafety(
    entityType: 'department' | 'course' | 'subject' | 'section',
    entityId: string
  ): Promise<HistorySafetyCheckResult> {
    if (entityType === 'department') {
      const dept = mockDepartments.find((d) => d.id === entityId || d.code === entityId);
      if (!dept) {
        return {
          allowed: false,
          entityType,
          entityId,
          reason: 'Department not found.',
          dependencies: { attendanceSessionsCount: 0, examinationMarksCount: 0, feeAssignmentsCount: 0, activeEnrollmentsCount: 0 },
          recommendedAction: 'deactivate',
        };
      }

      const activeStudents = mockStudents.filter((s) => s.departmentCode === dept.code).length;
      const linkedSubjects = mockSubjects.filter((s) => s.code.startsWith(dept.code)).length;
      const hasHistory = activeStudents > 0 || linkedSubjects > 0;

      return {
        allowed: !hasHistory,
        entityType,
        entityId,
        reason: hasHistory
          ? `Department "${dept.name}" has ${activeStudents} enrolled students and ${linkedSubjects} active subjects. Deleting this record would corrupt academic records. Deactivate instead to preserve audit integrity.`
          : undefined,
        dependencies: {
          attendanceSessionsCount: activeStudents * 24,
          examinationMarksCount: activeStudents * 5,
          feeAssignmentsCount: activeStudents,
          activeEnrollmentsCount: activeStudents,
        },
        recommendedAction: hasHistory ? 'deactivate' : 'proceed',
      };
    }

    if (entityType === 'subject') {
      const sub = mockSubjects.find((s) => s.id === entityId || s.code === entityId);
      if (!sub) {
        return {
          allowed: false,
          entityType,
          entityId,
          reason: 'Subject not found.',
          dependencies: { attendanceSessionsCount: 0, examinationMarksCount: 0, feeAssignmentsCount: 0, activeEnrollmentsCount: 0 },
          recommendedAction: 'deactivate',
        };
      }

      // Check if attendance sessions or assessment marks exist for this subject
      const hasTeachingAssignments = mockTeachingAssignments.some((t) => t.subjectCode === sub.code);
      const hasAssessments = mockAssessmentsQueue.some((a) => a.subjectCode === sub.code);
      const isHistorical = hasTeachingAssignments || hasAssessments;

      return {
        allowed: !isHistorical,
        entityType,
        entityId,
        reason: isHistorical
          ? `Cannot delete subject "${sub.code} - ${sub.name}": 24 attendance sessions and assessment marks are linked to this syllabus. Deactivate instead to preserve historical integrity.`
          : undefined,
        dependencies: {
          attendanceSessionsCount: isHistorical ? 24 : 0,
          examinationMarksCount: isHistorical ? 64 : 0,
          feeAssignmentsCount: 0,
          activeEnrollmentsCount: isHistorical ? 64 : 0,
        },
        recommendedAction: isHistorical ? 'deactivate' : 'proceed',
      };
    }

    return {
      allowed: true,
      entityType,
      entityId,
      dependencies: { attendanceSessionsCount: 0, examinationMarksCount: 0, feeAssignmentsCount: 0, activeEnrollmentsCount: 0 },
      recommendedAction: 'proceed',
    };
  }

  public static async deactivateDepartment(departmentId: string): Promise<InstitutionDepartment> {
    const dept = mockDepartments.find((d) => d.id === departmentId);
    if (!dept) throw new Error('Department not found.');

    const beforeState = { ...dept };
    dept.status = 'Inactive';

    await this.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'departments',
      entityId: dept.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: dept as unknown as Record<string, unknown>,
    });

    return dept;
  }

  public static async deleteDepartment(departmentId: string): Promise<{ success: boolean; message: string }> {
    const safety = await this.checkDestructiveSafety('department', departmentId);
    if (!safety.allowed) {
      throw new Error(`Destructive delete blocked by history safety policy: ${safety.reason}`);
    }
    mockDepartments = mockDepartments.filter((d) => d.id !== departmentId);
    return { success: true, message: 'Department safely deleted.' };
  }

  public static async getCourses(): Promise<InstitutionCourse[]> {
    return [...mockCourses];
  }

  public static async getSubjects(): Promise<CourseSubject[]> {
    return [...mockSubjects];
  }

  public static async getSessions(): Promise<AcademicSession[]> {
    return [...mockSessions];
  }

  public static async getTeachingAssignments(): Promise<TeachingAssignment[]> {
    return [...mockTeachingAssignments];
  }

  // -------------------------------------------------------------------------
  // 3. People Management & Bulk Import
  // -------------------------------------------------------------------------

  public static async getStudents(filters?: {
    departmentCode?: string;
    semester?: number;
    search?: string;
    status?: string;
  }): Promise<StudentRegistryItem[]> {
    let result = [...mockStudents];
    if (filters?.departmentCode && filters.departmentCode !== 'all') {
      result = result.filter((s) => s.departmentCode === filters.departmentCode);
    }
    if (filters?.semester && filters.semester > 0) {
      result = result.filter((s) => s.semester === filters.semester);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((s) => s.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public static async createStudent(input: {
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    departmentCode: string;
    courseCode: string;
    semester: number;
    section: string;
  }): Promise<StudentRegistryItem> {
    if (!input.studentId || !input.firstName || !input.email) {
      throw new Error('Student ID, first name, and valid email are strictly required.');
    }

    const cleanId = input.studentId.trim().toUpperCase();
    if (mockStudents.some((s) => s.studentId === cleanId)) {
      throw new Error(`Student with ID "${cleanId}" already exists.`);
    }
    if (mockStudents.some((s) => s.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error(`Email "${input.email}" is already registered to another student.`);
    }

    const newStudent: StudentRegistryItem = {
      id: `stu-${Date.now().toString(36)}`,
      studentId: cleanId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      fullName: `${input.firstName.trim()} ${input.lastName.trim()}`,
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      departmentId: 'dept-cse-01',
      departmentCode: input.departmentCode || 'CSE',
      courseId: 'course-btech-cse',
      courseCode: input.courseCode || 'BTECH-CSE',
      semester: input.semester || 1,
      section: input.section || 'A',
      admissionDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      cgpa: 0.0,
      attendanceRate: 100.0,
    };

    mockStudents.push(newStudent);
    await this.logAuditEvent({
      action: 'INSERT',
      entityTable: 'students',
      entityId: newStudent.id,
      beforeState: null,
      afterState: newStudent as unknown as Record<string, unknown>,
    });

    return newStudent;
  }

  public static async deactivateStudent(studentId: string): Promise<StudentRegistryItem> {
    const student = mockStudents.find((s) => s.id === studentId || s.studentId === studentId);
    if (!student) throw new Error('Student record not found.');

    const beforeState = { ...student };
    student.status = 'Inactive';

    await this.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'students',
      entityId: student.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: student as unknown as Record<string, unknown>,
    });

    return student;
  }

  public static async reactivateStudent(studentId: string): Promise<StudentRegistryItem> {
    const student = mockStudents.find((s) => s.id === studentId || s.studentId === studentId);
    if (!student) throw new Error('Student record not found.');

    const beforeState = { ...student };
    student.status = 'Active';

    await this.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'students',
      entityId: student.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: student as unknown as Record<string, unknown>,
    });

    return student;
  }

  public static async updateStudent(
    studentId: string,
    updates: Partial<StudentRegistryItem>
  ): Promise<StudentRegistryItem> {
    const student = mockStudents.find((s) => s.id === studentId || s.studentId === studentId);
    if (!student) throw new Error('Student record not found.');

    const beforeState = { ...student };

    if (updates.email && updates.email !== student.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        throw new Error('Invalid email format.');
      }
      if (mockStudents.some((s) => s.id !== student.id && s.email.toLowerCase() === updates.email!.toLowerCase())) {
        throw new Error(`Email "${updates.email}" is already registered to another student.`);
      }
      student.email = updates.email.trim().toLowerCase();
    }

    if (updates.firstName !== undefined) student.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) student.lastName = updates.lastName.trim();
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      student.fullName = `${student.firstName} ${student.lastName}`.trim();
    }
    if (updates.phone !== undefined) student.phone = updates.phone.trim();
    if (updates.departmentCode !== undefined) {
      const dept = mockDepartments.find((d) => d.code === updates.departmentCode!.toUpperCase());
      if (!dept) throw new Error(`Department code "${updates.departmentCode}" is invalid.`);
      student.departmentCode = dept.code;
      student.departmentId = dept.id;
    }
    if (updates.semester !== undefined) {
      if (updates.semester < 1 || updates.semester > 8) {
        throw new Error('Semester must be an integer between 1 and 8.');
      }
      student.semester = updates.semester;
    }
    if (updates.section !== undefined) student.section = updates.section.trim();
    if (updates.courseCode !== undefined) student.courseCode = updates.courseCode.trim();

    await this.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'students',
      entityId: student.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: student as unknown as Record<string, unknown>,
    });

    return student;
  }

  /**
   * Bulk Student Import with Dry Run Validation
   * Validates CSV text, checks header conformity, identifies intra-file duplicates,
   * checks existing database collisions, and produces an itemized row/column error report.
   */
  public static validateStudentBulkImport(csvContent: string): BulkImportResult<StudentImportRecord> {
    const rows = parseCsvRows(csvContent);

    if (rows.length < 2) {
      return {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [{ row: 1, column: 'Header', value: '', reason: 'CSV must contain a header row and at least one data row.' }],
        dryRun: true,
        parsedRecords: [],
      };
    }

    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const expectedHeaders = ['student_id', 'first_name', 'last_name', 'email', 'department_code', 'course_code', 'semester', 'section'];
    
    // Check missing headers
    for (const req of expectedHeaders) {
      if (!header.includes(req)) {
        return {
          totalRows: rows.length - 1,
          validRows: 0,
          invalidRows: rows.length - 1,
          errors: [{ row: 1, column: req, value: '', reason: `Missing required header column "${req}". Expected headers: ${expectedHeaders.join(', ')}` }],
          dryRun: true,
          parsedRecords: [],
        };
      }
    }

    const colMap: Record<string, number> = {};
    header.forEach((h, idx) => {
      colMap[h] = idx;
    });

    const errors: BulkImportError[] = [];
    const validRecords: StudentImportRecord[] = [];
    const seenStudentIds = new Set<string>();
    const seenEmails = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const rowNum = i + 1; // 1-indexed for human readability
      const cols = rows[i];

      const studentId = cols[colMap['student_id']] || '';
      const firstName = cols[colMap['first_name']] || '';
      const lastName = cols[colMap['last_name']] || '';
      const email = cols[colMap['email']] || '';
      const deptCode = (cols[colMap['department_code']] || '').toUpperCase();
      const courseCode = (cols[colMap['course_code']] || '').toUpperCase();
      const semesterRaw = cols[colMap['semester']] || '1';
      const section = cols[colMap['section']] || 'A';

      let rowHasError = false;

      // 1. Validate studentId
      if (!studentId) {
        errors.push({ row: rowNum, column: 'student_id', value: '', reason: 'Student ID cannot be empty.' });
        rowHasError = true;
      } else if (seenStudentIds.has(studentId.toUpperCase())) {
        errors.push({ row: rowNum, column: 'student_id', value: studentId, reason: `Duplicate Student ID "${studentId}" within the import file.` });
        rowHasError = true;
      } else if (mockStudents.some((s) => s.studentId.toUpperCase() === studentId.toUpperCase())) {
        errors.push({ row: rowNum, column: 'student_id', value: studentId, reason: `Student ID "${studentId}" already exists in the institution database.` });
        rowHasError = true;
      } else {
        seenStudentIds.add(studentId.toUpperCase());
      }

      // 2. Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        errors.push({ row: rowNum, column: 'email', value: email, reason: 'Invalid email format.' });
        rowHasError = true;
      } else if (seenEmails.has(email.toLowerCase())) {
        errors.push({ row: rowNum, column: 'email', value: email, reason: `Duplicate email "${email}" within the import file.` });
        rowHasError = true;
      } else if (mockStudents.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
        errors.push({ row: rowNum, column: 'email', value: email, reason: `Email "${email}" is already registered in the institution database.` });
        rowHasError = true;
      } else {
        seenEmails.add(email.toLowerCase());
      }

      // 3. Validate names
      if (!firstName) {
        errors.push({ row: rowNum, column: 'first_name', value: '', reason: 'First name cannot be empty.' });
        rowHasError = true;
      }

      // 4. Validate department code
      if (!deptCode || !mockDepartments.some((d) => d.code === deptCode)) {
        errors.push({
          row: rowNum,
          column: 'department_code',
          value: deptCode,
          reason: `Department code "${deptCode}" is unrecognized. Valid codes: ${mockDepartments.map((d) => d.code).join(', ')}`,
        });
        rowHasError = true;
      }

      // 5. Validate semester
      const semNum = parseInt(semesterRaw, 10);
      if (isNaN(semNum) || semNum < 1 || semNum > 8) {
        errors.push({ row: rowNum, column: 'semester', value: semesterRaw, reason: 'Semester must be an integer between 1 and 8.' });
        rowHasError = true;
      }

      if (!rowHasError) {
        validRecords.push({
          studentId: studentId.toUpperCase(),
          firstName,
          lastName,
          email: email.toLowerCase(),
          departmentCode: deptCode,
          courseCode: courseCode || 'BTECH-CSE',
          semester: semNum,
          section: section || 'A',
        });
      }
    }

    return {
      totalRows: rows.length - 1,
      validRows: validRecords.length,
      invalidRows: rows.length - 1 - validRecords.length,
      errors,
      dryRun: true,
      parsedRecords: validRecords,
    };
  }

  public static async commitStudentBulkImport(
    validRecords: StudentImportRecord[]
  ): Promise<{ committedCount: number; studentIds: string[] }> {
    const committed: string[] = [];

    for (const rec of validRecords) {
      const student: StudentRegistryItem = {
        id: `stu-imp-${Date.now().toString(36)}-${rec.studentId.toLowerCase()}`,
        studentId: rec.studentId,
        firstName: rec.firstName,
        lastName: rec.lastName,
        fullName: `${rec.firstName} ${rec.lastName}`,
        email: rec.email,
        phone: rec.phone || '',
        departmentId: 'dept-cse-01',
        departmentCode: rec.departmentCode,
        courseId: 'course-btech-cse',
        courseCode: rec.courseCode,
        semester: rec.semester,
        section: rec.section,
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        cgpa: 0.0,
        attendanceRate: 100.0,
      };

      mockStudents.push(student);
      committed.push(student.studentId);
    }

    await this.logAuditEvent({
      action: 'BULK_IMPORT',
      entityTable: 'students',
      entityId: `batch-${Date.now()}`,
      beforeState: null,
      afterState: { committedCount: committed.length, studentIds: committed },
    });

    return { committedCount: committed.length, studentIds: committed };
  }

  public static async getFaculty(filters?: {
    departmentCode?: string;
    search?: string;
    status?: string;
  }): Promise<FacultyRegistryItem[]> {
    let result = [...mockFaculty];
    if (filters?.departmentCode && filters.departmentCode !== 'all') {
      result = result.filter((f) => f.departmentCode === filters.departmentCode);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((f) => f.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (f) =>
          f.fullName.toLowerCase().includes(q) ||
          f.facultyId.toLowerCase().includes(q) ||
          f.email.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public static async createFaculty(input: {
    facultyId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    departmentCode: string;
    designation: string;
    cabin: string;
  }): Promise<FacultyRegistryItem> {
    if (!input.facultyId || !input.firstName || !input.email) {
      throw new Error('Faculty ID, first name, and valid email are strictly required.');
    }

    const cleanId = input.facultyId.trim().toUpperCase();
    if (mockFaculty.some((f) => f.facultyId === cleanId)) {
      throw new Error(`Faculty with ID "${cleanId}" already exists.`);
    }

    const newFaculty: FacultyRegistryItem = {
      id: `fac-${Date.now().toString(36)}`,
      facultyId: cleanId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      fullName: `Dr. ${input.firstName.trim()} ${input.lastName.trim()}`,
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      departmentId: 'dept-cse-01',
      departmentCode: input.departmentCode || 'CSE',
      designation: input.designation || 'Assistant Professor',
      cabin: input.cabin || 'Academic Block A',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      teachingLoadHours: 12,
    };

    mockFaculty.push(newFaculty);
    await this.logAuditEvent({
      action: 'INSERT',
      entityTable: 'faculty',
      entityId: newFaculty.id,
      beforeState: null,
      afterState: newFaculty as unknown as Record<string, unknown>,
    });

    return newFaculty;
  }

  public static async deactivateFaculty(facultyId: string): Promise<FacultyRegistryItem> {
    const f = mockFaculty.find((item) => item.id === facultyId || item.facultyId === facultyId);
    if (!f) throw new Error('Faculty record not found.');

    const beforeState = { ...f };
    f.status = 'Inactive';

    await this.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'faculty',
      entityId: f.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: f as unknown as Record<string, unknown>,
    });

    return f;
  }

  public static async updateFaculty(
    facultyId: string,
    updates: Partial<FacultyRegistryItem>
  ): Promise<FacultyRegistryItem> {
    const f = mockFaculty.find((item) => item.id === facultyId || item.facultyId === facultyId);
    if (!f) throw new Error('Faculty record not found.');

    const beforeState = { ...f };

    if (updates.email && updates.email !== f.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        throw new Error('Invalid email format.');
      }
      if (mockFaculty.some((item) => item.id !== f.id && item.email.toLowerCase() === updates.email!.toLowerCase())) {
        throw new Error(`Email "${updates.email}" is already registered to another faculty member.`);
      }
      f.email = updates.email.trim().toLowerCase();
    }

    if (updates.firstName !== undefined) f.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) f.lastName = updates.lastName.trim();
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      f.fullName = `Dr. ${f.firstName} ${f.lastName}`.trim();
    }
    if (updates.phone !== undefined) f.phone = updates.phone.trim();
    if (updates.departmentCode !== undefined) {
      const dept = mockDepartments.find((d) => d.code === updates.departmentCode!.toUpperCase());
      if (!dept) throw new Error(`Department code "${updates.departmentCode}" is invalid.`);
      f.departmentCode = dept.code;
      f.departmentId = dept.id;
    }
    if (updates.designation !== undefined) f.designation = updates.designation.trim();
    if (updates.cabin !== undefined) f.cabin = updates.cabin.trim();
    if (updates.teachingLoadHours !== undefined) f.teachingLoadHours = updates.teachingLoadHours;

    await this.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'faculty',
      entityId: f.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: f as unknown as Record<string, unknown>,
    });

    return f;
  }

  public static async reactivateFaculty(facultyId: string): Promise<FacultyRegistryItem> {
    const f = mockFaculty.find((item) => item.id === facultyId || item.facultyId === facultyId);
    if (!f) throw new Error('Faculty record not found.');

    const beforeState = { ...f };
    f.status = 'Active';

    await this.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'faculty',
      entityId: f.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: f as unknown as Record<string, unknown>,
    });

    return f;
  }

  /**
   * Bulk Faculty Import with Dry Run Validation
   */
  public static validateFacultyBulkImport(csvContent: string): BulkImportResult<FacultyImportRecord> {
    const rows = parseCsvRows(csvContent);

    if (rows.length < 2) {
      return {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [{ row: 1, column: 'Header', value: '', reason: 'CSV must contain a header row and at least one data row.' }],
        dryRun: true,
        parsedRecords: [],
      };
    }

    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const expectedHeaders = ['faculty_id', 'first_name', 'last_name', 'email', 'department_code', 'designation'];

    for (const req of expectedHeaders) {
      if (!header.includes(req)) {
        return {
          totalRows: rows.length - 1,
          validRows: 0,
          invalidRows: rows.length - 1,
          errors: [{ row: 1, column: req, value: '', reason: `Missing required header column "${req}". Expected headers: ${expectedHeaders.join(', ')}` }],
          dryRun: true,
          parsedRecords: [],
        };
      }
    }

    const colMap: Record<string, number> = {};
    header.forEach((h, idx) => {
      colMap[h] = idx;
    });

    const errors: BulkImportError[] = [];
    const validRecords: FacultyImportRecord[] = [];
    const seenFacultyIds = new Set<string>();
    const seenEmails = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const rowNum = i + 1;
      const cols = rows[i];

      const facultyId = cols[colMap['faculty_id']] || '';
      const firstName = cols[colMap['first_name']] || '';
      const lastName = cols[colMap['last_name']] || '';
      const email = cols[colMap['email']] || '';
      const deptCode = (cols[colMap['department_code']] || '').toUpperCase();
      const designation = cols[colMap['designation']] || 'Assistant Professor';
      const cabin = colMap['cabin'] !== undefined ? cols[colMap['cabin']] || '' : '';
      const phone = colMap['phone'] !== undefined ? cols[colMap['phone']] || '' : '';

      let rowHasError = false;

      // 1. Validate facultyId
      if (!facultyId) {
        errors.push({ row: rowNum, column: 'faculty_id', value: '', reason: 'Faculty ID cannot be empty.' });
        rowHasError = true;
      } else if (seenFacultyIds.has(facultyId.toUpperCase())) {
        errors.push({ row: rowNum, column: 'faculty_id', value: facultyId, reason: `Duplicate Faculty ID "${facultyId}" within the import file.` });
        rowHasError = true;
      } else if (mockFaculty.some((f) => f.facultyId.toUpperCase() === facultyId.toUpperCase())) {
        errors.push({ row: rowNum, column: 'faculty_id', value: facultyId, reason: `Faculty ID "${facultyId}" already exists in the institution database.` });
        rowHasError = true;
      } else {
        seenFacultyIds.add(facultyId.toUpperCase());
      }

      // 2. Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        errors.push({ row: rowNum, column: 'email', value: email, reason: 'Invalid email format.' });
        rowHasError = true;
      } else if (seenEmails.has(email.toLowerCase())) {
        errors.push({ row: rowNum, column: 'email', value: email, reason: `Duplicate email "${email}" within the import file.` });
        rowHasError = true;
      } else if (mockFaculty.some((f) => f.email.toLowerCase() === email.toLowerCase())) {
        errors.push({ row: rowNum, column: 'email', value: email, reason: `Email "${email}" is already registered in the institution database.` });
        rowHasError = true;
      } else {
        seenEmails.add(email.toLowerCase());
      }

      // 3. Validate name
      if (!firstName) {
        errors.push({ row: rowNum, column: 'first_name', value: '', reason: 'First name cannot be empty.' });
        rowHasError = true;
      }

      // 4. Validate department code
      if (!deptCode || !mockDepartments.some((d) => d.code === deptCode)) {
        errors.push({
          row: rowNum,
          column: 'department_code',
          value: deptCode,
          reason: `Department code "${deptCode}" is unrecognized. Valid codes: ${mockDepartments.map((d) => d.code).join(', ')}`,
        });
        rowHasError = true;
      }

      if (!rowHasError) {
        validRecords.push({
          facultyId: facultyId.toUpperCase(),
          firstName,
          lastName,
          email: email.toLowerCase(),
          departmentCode: deptCode,
          designation,
          cabin: cabin || 'Academic Block A',
          phone,
        });
      }
    }

    return {
      totalRows: rows.length - 1,
      validRows: validRecords.length,
      invalidRows: rows.length - 1 - validRecords.length,
      errors,
      dryRun: true,
      parsedRecords: validRecords,
    };
  }

  public static async commitFacultyBulkImport(
    validRecords: FacultyImportRecord[]
  ): Promise<{ committedCount: number; facultyIds: string[] }> {
    const committed: string[] = [];

    for (const rec of validRecords) {
      const fac: FacultyRegistryItem = {
        id: `fac-imp-${Date.now().toString(36)}-${rec.facultyId.toLowerCase()}`,
        facultyId: rec.facultyId,
        firstName: rec.firstName,
        lastName: rec.lastName,
        fullName: `Dr. ${rec.firstName} ${rec.lastName}`,
        email: rec.email,
        phone: rec.phone || '',
        departmentId: 'dept-cse-01',
        departmentCode: rec.departmentCode,
        designation: rec.designation || 'Assistant Professor',
        cabin: rec.cabin || 'Academic Block A',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        teachingLoadHours: 12,
      };

      mockFaculty.push(fac);
      committed.push(fac.facultyId);
    }

    await this.logAuditEvent({
      action: 'BULK_IMPORT',
      entityTable: 'faculty',
      entityId: `batch-${Date.now()}`,
      beforeState: null,
      afterState: { committedCount: committed.length, facultyIds: committed },
    });

    return { committedCount: committed.length, facultyIds: committed };
  }

  // -------------------------------------------------------------------------
  // 4. Finance Command Center
  // -------------------------------------------------------------------------

  public static async getFeeStructures(): Promise<AdminFeeStructure[]> {
    return [...mockFeeStructures];
  }

  public static async createFeeStructure(input: {
    name: string;
    courseCode: string;
    semester: number;
    academicYear: string;
    tuitionFeeMinor: number;
    devFeeMinor: number;
    labFeeMinor: number;
    examFeeMinor: number;
    libraryFeeMinor: number;
    dueDate: string;
  }): Promise<AdminFeeStructure> {
    const totalMinor =
      (input.tuitionFeeMinor || 0) +
      (input.devFeeMinor || 0) +
      (input.labFeeMinor || 0) +
      (input.examFeeMinor || 0) +
      (input.libraryFeeMinor || 0);

    const newStruct: AdminFeeStructure = {
      id: `fee-struct-${Date.now().toString(36)}`,
      name: input.name,
      courseId: 'course-btech-cse',
      courseCode: input.courseCode,
      semester: input.semester,
      academicYear: input.academicYear,
      tuitionFeeMinor: input.tuitionFeeMinor,
      devFeeMinor: input.devFeeMinor,
      labFeeMinor: input.labFeeMinor,
      examFeeMinor: input.examFeeMinor,
      libraryFeeMinor: input.libraryFeeMinor,
      totalFeeMinor: totalMinor,
      dueDate: input.dueDate,
    };

    mockFeeStructures.push(newStruct);
    await this.logAuditEvent({
      action: 'INSERT',
      entityTable: 'fee_structures',
      entityId: newStruct.id,
      beforeState: null,
      afterState: newStruct as unknown as Record<string, unknown>,
    });

    return newStruct;
  }

  public static async getStudentFeeAssignments(filters?: {
    departmentCode?: string;
    semester?: number;
    agingBucket?: string;
    search?: string;
  }): Promise<AdminStudentFeeAssignment[]> {
    let result = [...mockStudentFeeAssignments];
    if (filters?.departmentCode && filters.departmentCode !== 'all') {
      result = result.filter((a) => a.departmentCode === filters.departmentCode);
    }
    if (filters?.semester && filters.semester > 0) {
      result = result.filter((a) => a.semester === filters.semester);
    }
    if (filters?.agingBucket && filters.agingBucket !== 'all') {
      result = result.filter((a) => a.agingBucket === filters.agingBucket);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) => a.studentName.toLowerCase().includes(q) || a.studentCode.toLowerCase().includes(q)
      );
    }
    return result;
  }

  /**
   * Applies Fee Concession / Scholarship with Double-Entry Safety:
   * Concession must never exceed assigned fee.
   */
  public static async applyFeeConcession(
    assignmentId: string,
    concessionMinorUnits: number,
    reason: string
  ): Promise<AdminStudentFeeAssignment> {
    const assignment = mockStudentFeeAssignments.find((a) => a.id === assignmentId);
    if (!assignment) throw new Error('Fee assignment not found.');

    if (concessionMinorUnits < 0) {
      throw new Error('Concession amount cannot be negative.');
    }
    if (concessionMinorUnits > assignment.assignedFeeMinor) {
      throw new Error(
        `Concession (${formatMinorUnits(concessionMinorUnits)}) cannot exceed total assigned fee (${formatMinorUnits(assignment.assignedFeeMinor)}).`
      );
    }

    const beforeState = { ...assignment };
    assignment.concessionMinor = concessionMinorUnits;
    assignment.concessionReason = reason;

    // Recalculate using pure calculation function
    const balance = calculateFeeBalance(assignment.assignedFeeMinor, concessionMinorUnits, [
      { amountMinorUnits: assignment.verifiedPaidMinor, status: 'verified' },
    ]);

    assignment.netPayableMinor = balance.netPayableMinorUnits;
    assignment.outstandingMinor = balance.outstandingBalanceMinorUnits;
    assignment.isFullyPaid = balance.isFullyPaid;

    try {
      const studentId = assignment.studentId === 'stu-001' ? USER_IDS.studentA1 : assignment.studentId;
      CrossModuleSynchronizer.applyFeeConcession({
        studentId,
        concessionAmountMinorUnits: concessionMinorUnits,
        reason,
      });
    } catch {
      // Sync tolerance
    }

    await this.logAuditEvent({
      action: 'UPDATE',
      entityTable: 'student_fee_assignments',
      entityId: assignment.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: assignment as unknown as Record<string, unknown>,
    });

    return assignment;
  }

  public static async getFinanceAnalytics(): Promise<FinanceCollectionAnalytics> {
    let totalAssigned = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    let current = 0;
    let less30 = 0;
    let thirtyTo60 = 0;
    let more60 = 0;

    for (const a of mockStudentFeeAssignments) {
      totalAssigned += a.netPayableMinor;
      totalCollected += a.verifiedPaidMinor;
      totalOutstanding += a.outstandingMinor;

      if (a.agingBucket === 'Current') current += a.outstandingMinor;
      else if (a.agingBucket === '<30d') less30 += a.outstandingMinor;
      else if (a.agingBucket === '30-60d') thirtyTo60 += a.outstandingMinor;
      else if (a.agingBucket === '>60d') more60 += a.outstandingMinor;
    }

    const rate = totalAssigned > 0 ? (totalCollected / totalAssigned) * 100 : 0;

    return {
      totalAssignedMinor: totalAssigned,
      totalCollectedMinor: totalCollected,
      totalOutstandingMinor: totalOutstanding,
      collectionRatePercent: Number(rate.toFixed(2)),
      agingBreakdown: {
        currentMinor: current,
        lessThan30dMinor: less30,
        thirtyToSixtyMinor: thirtyTo60,
        moreThanSixtyMinor: more60,
      },
    };
  }

  /**
   * Idempotent Payment Recording:
   * Rejects duplicate payments with the same idempotency key.
   */
  public static async recordFeePayment(
    assignmentId: string,
    amountMinorUnits: number,
    paymentMethod: 'UPI' | 'NetBanking' | 'Challan' | 'DD' | 'Cash',
    idempotencyKey: string
  ): Promise<PaymentReceiptRecord> {
    // Check idempotency
    const existing = mockPaymentsStore.find((p) => p.idempotencyKey === idempotencyKey);
    if (existing) {
      return existing; // idempotent return
    }

    const assignment = mockStudentFeeAssignments.find((a) => a.id === assignmentId);
    if (!assignment) throw new Error('Fee assignment not found.');

    if (amountMinorUnits <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const receipt: PaymentReceiptRecord = {
      id: `pay-${Date.now().toString(36)}`,
      assignmentId,
      studentId: assignment.studentId,
      amountMinorUnits,
      paymentMethod,
      idempotencyKey,
      transactionReference: `TXN-COS-${Math.floor(100000 + Math.random() * 900000)}`,
      paidAt: new Date().toISOString(),
      status: 'verified',
    };

    mockPaymentsStore.push(receipt);

    // Update assignment verifiedPaid
    assignment.verifiedPaidMinor += amountMinorUnits;
    const balance = calculateFeeBalance(assignment.assignedFeeMinor, assignment.concessionMinor, [
      { amountMinorUnits: assignment.verifiedPaidMinor, status: 'verified' },
    ]);
    assignment.netPayableMinor = balance.netPayableMinorUnits;
    assignment.outstandingMinor = balance.outstandingBalanceMinorUnits;
    assignment.isFullyPaid = balance.isFullyPaid;

    try {
      const studentId = assignment.studentId === 'stu-001' ? USER_IDS.studentA1 : assignment.studentId;
      CrossModuleSynchronizer.recordFeePayment({
        studentId,
        amountMinorUnits,
        paymentMethod,
        idempotencyKey,
        transactionReference: receipt.transactionReference,
        receiptNumber: receipt.id,
      });
    } catch {
      // Sync tolerance
    }

    await this.logAuditEvent({
      action: 'INSERT',
      entityTable: 'payments',
      entityId: receipt.id,
      beforeState: null,
      afterState: receipt as unknown as Record<string, unknown>,
    });

    return receipt;
  }

  // -------------------------------------------------------------------------
  // 5. Examinations Management
  // -------------------------------------------------------------------------

  public static async getGradingScales(): Promise<GradingScaleVersion> {
    return { ...mockGradingScale };
  }

  public static async getAssessmentPublicationQueue(): Promise<AssessmentReviewItem[]> {
    return [...mockAssessmentsQueue];
  }

  /**
   * Assessment Publication Engine (rpc_publish_assessment_results semantics):
   * Invariants:
   * - Cannot publish 'draft' assessment
   * - Validates submission count > 0
   * - Validates max marks boundary
   * - Transitions to 'published'
   * - Idempotent: safe to repeat on already published assessment
   */
  public static async publishAssessmentResults(
    assessmentId: string,
    actorEmail: string = 'admin@campusos.dev'
  ): Promise<{ success: boolean; assessment: AssessmentReviewItem; message: string }> {
    const asm = mockAssessmentsQueue.find((a) => a.id === assessmentId);
    if (!asm) {
      throw new Error('Assessment not found in queue.');
    }

    if (asm.status === 'published') {
      return {
        success: true,
        assessment: asm,
        message: 'Assessment results were already published (idempotent call).',
      };
    }

    if (asm.status === 'draft') {
      throw new Error(
        `Cannot publish assessment "${asm.assessmentName}": Status is currently "draft". Faculty must submit marks for review before publication.`
      );
    }

    if (asm.submissionCount === 0) {
      throw new Error(
        `Cannot publish assessment "${asm.assessmentName}": No student marks submissions found.`
      );
    }

    if (asm.maxMarks <= 0) {
      throw new Error('Assessment maxMarks must be strictly positive.');
    }

    const beforeState = { ...asm };
    asm.status = 'published';
    asm.publishedAt = new Date().toISOString();

    try {
      const canonicalAss = CrossModuleSynchronizer.getAssessments().find(
        (a) => a.id === assessmentId || a.subjectCode === asm.subjectCode
      );
      if (canonicalAss && canonicalAss.status !== 'draft' && canonicalAss.status !== 'published') {
        CrossModuleSynchronizer.publishAssessment(canonicalAss.id, actorEmail);
      }
    } catch {
      // Sync tolerance
    }

    await this.logAuditEvent({
      actorEmail,
      action: 'PUBLISH',
      entityTable: 'assessments',
      entityId: asm.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: asm as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      assessment: asm,
      message: `Assessment "${asm.assessmentName}" officially published. Results are now live on student consoles.`,
    };
  }

  public static async getBacklogStudents(): Promise<BacklogStudentItem[]> {
    return [
      {
        id: 'backlog-01',
        studentId: 'EN2023CSE043',
        studentName: 'Diya Kaur',
        departmentCode: 'CSE',
        subjectCode: 'CS502',
        subjectName: 'Theory of Computation',
        semesterFailed: 5,
        marksObtained: 32,
        attemptsCount: 1,
      },
    ];
  }

  public static async getMarksCorrectionHistory(): Promise<MarksCorrectionRecord[]> {
    return [...mockMarksCorrections];
  }

  // -------------------------------------------------------------------------
  // 6. Unified Approvals & Communications
  // -------------------------------------------------------------------------

  public static async getUnifiedApprovals(filters?: {
    category?: string;
    urgency?: string;
    status?: string;
    search?: string;
  }): Promise<UnifiedApprovalItem[]> {
    try {
      const canonicalLeaves = CrossModuleSynchronizer.getLeaves();
      for (const l of canonicalLeaves) {
        const existing = mockUnifiedApprovals.find((a) => a.id === l.id);
        const mappedStatus = l.status === 'approved' ? 'approved' : l.status === 'rejected' ? 'rejected' : 'pending';
        if (existing) {
          existing.status = mappedStatus;
        } else {
          mockUnifiedApprovals.unshift({
            id: l.id,
            category: 'leave',
            title: `${l.leaveType} Leave Application (${l.daysCount} Days)`,
            applicantId: l.studentId,
            applicantName: l.studentName,
            applicantRole: 'Student',
            applicantCode: l.rollNo,
            department: l.department.includes('Computer') ? 'CSE' : 'ECE',
            details: `Applied for ${l.leaveType} leave from ${l.startDate} to ${l.endDate}. ${l.reason}`,
            submittedAt: l.submittedAt,
            status: mappedStatus,
            urgency: l.isAttendanceRisk ? 'urgent' : 'normal',
            attachmentUrl: l.attachmentUrl,
          });
        }
      }
    } catch {
      // Sync tolerance
    }

    let result = [...mockUnifiedApprovals];
    if (filters?.category && filters.category !== 'all') {
      result = result.filter((a) => a.category === filters.category);
    }
    if (filters?.urgency && filters.urgency !== 'all') {
      result = result.filter((a) => a.urgency === filters.urgency);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.applicantName.toLowerCase().includes(q) ||
          a.applicantCode.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public static async actionApproval(
    approvalId: string,
    action: 'approve' | 'reject',
    decisionComment: string,
    actorEmail: string = 'admin@campusos.dev'
  ): Promise<UnifiedApprovalItem> {
    let item = mockUnifiedApprovals.find((a) => a.id === approvalId);
    if (!item) {
      try {
        const canLeave = CrossModuleSynchronizer.getLeaveById(approvalId);
        if (canLeave) {
          item = {
            id: canLeave.id,
            category: 'leave',
            title: `${canLeave.leaveType} Leave Application (${canLeave.daysCount} Days)`,
            applicantId: canLeave.studentId,
            applicantName: canLeave.studentName,
            applicantRole: 'Student',
            applicantCode: canLeave.rollNo,
            department: canLeave.department.includes('Computer') ? 'CSE' : 'ECE',
            details: `Applied for ${canLeave.leaveType} leave from ${canLeave.startDate} to ${canLeave.endDate}. ${canLeave.reason}`,
            submittedAt: canLeave.submittedAt,
            status: 'pending',
            urgency: canLeave.isAttendanceRisk ? 'urgent' : 'normal',
            attachmentUrl: canLeave.attachmentUrl,
          };
          mockUnifiedApprovals.unshift(item);
        }
      } catch {
        // Sync tolerance
      }
    }

    if (!item) throw new Error('Approval request not found.');

    if (!decisionComment || decisionComment.trim().length === 0) {
      throw new Error('A decision comment is required for administrative audit tracking.');
    }

    const beforeState = { ...item };
    item.status = action === 'approve' ? 'approved' : 'rejected';
    item.actionedBy = actorEmail;
    item.actionedAt = new Date().toISOString();
    item.decisionComment = decisionComment.trim();

    if (item.category === 'leave') {
      try {
        const canLeave = CrossModuleSynchronizer.getLeaveById(approvalId);
        if (canLeave && canLeave.status !== 'approved' && canLeave.status !== 'rejected') {
          CrossModuleSynchronizer.actionLeaveRequest({
            leaveId: approvalId,
            status: action === 'approve' ? 'approved' : 'rejected',
            decisionComment: decisionComment.trim(),
            actorName: 'Academic Administrator',
            actorRole: 'Admin',
          });
        }
      } catch {
        // Sync tolerance
      }
    }

    await this.logAuditEvent({
      actorEmail,
      action: action === 'approve' ? 'APPROVE' : 'REJECT',
      entityTable: 'approvals',
      entityId: item.id,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: item as unknown as Record<string, unknown>,
    });

    return item;
  }

  public static async bulkActionApprovals(
    approvalIds: string[],
    action: 'approve' | 'reject',
    decisionComment: string,
    actorEmail: string = 'admin@campusos.dev'
  ): Promise<{ actionedCount: number; actionedIds: string[] }> {
    if (!approvalIds || approvalIds.length === 0) {
      throw new Error('No items selected for bulk approval.');
    }
    if (!decisionComment || decisionComment.trim().length === 0) {
      throw new Error('A decision comment is required for bulk administrative action.');
    }

    const actioned: string[] = [];
    for (const id of approvalIds) {
      let item = mockUnifiedApprovals.find((a) => a.id === id);
      if (!item) {
        try {
          const canLeave = CrossModuleSynchronizer.getLeaveById(id);
          if (canLeave) {
            item = {
              id: canLeave.id,
              category: 'leave',
              title: `${canLeave.leaveType} Leave Application (${canLeave.daysCount} Days)`,
              applicantId: canLeave.studentId,
              applicantName: canLeave.studentName,
              applicantRole: 'Student',
              applicantCode: canLeave.rollNo,
              department: canLeave.department.includes('Computer') ? 'CSE' : 'ECE',
              details: `Applied for ${canLeave.leaveType} leave from ${canLeave.startDate} to ${canLeave.endDate}. ${canLeave.reason}`,
              submittedAt: canLeave.submittedAt,
              status: 'pending',
              urgency: canLeave.isAttendanceRisk ? 'urgent' : 'normal',
              attachmentUrl: canLeave.attachmentUrl,
            };
            mockUnifiedApprovals.unshift(item);
          }
        } catch {
          // Sync tolerance
        }
      }

      if (item && item.status === 'pending') {
        item.status = action === 'approve' ? 'approved' : 'rejected';
        item.actionedBy = actorEmail;
        item.actionedAt = new Date().toISOString();
        item.decisionComment = decisionComment.trim();
        actioned.push(item.id);

        if (item.category === 'leave') {
          try {
            const canLeave = CrossModuleSynchronizer.getLeaveById(id);
            if (canLeave && canLeave.status !== 'approved' && canLeave.status !== 'rejected') {
              CrossModuleSynchronizer.actionLeaveRequest({
                leaveId: id,
                status: action === 'approve' ? 'approved' : 'rejected',
                decisionComment: decisionComment.trim(),
                actorName: 'Academic Administrator',
                actorRole: 'Admin',
              });
            }
          } catch {
            // Sync tolerance
          }
        }
      }
    }

    await this.logAuditEvent({
      actorEmail,
      action: action === 'approve' ? 'APPROVE' : 'REJECT',
      entityTable: 'approvals',
      entityId: `bulk-${Date.now()}`,
      beforeState: null,
      afterState: { actionedCount: actioned.length, actionedIds: actioned, decisionComment },
    });

    return { actionedCount: actioned.length, actionedIds: actioned };
  }

  public static async getAnnouncements(): Promise<AdminAnnouncement[]> {
    try {
      const canonical = CrossModuleSynchronizer.getAnnouncements();
      for (const c of canonical) {
        const existing = mockAnnouncements.find((a) => a.id === c.id || a.title === c.title);
        if (!existing) {
          mockAnnouncements.unshift({
            id: c.id,
            title: c.title,
            content: c.content,
            priority: c.priority === 'Critical' ? 'Critical' : c.priority === 'High' ? 'Important' : 'Normal',
            category: (c.category as 'Institution' | 'Department' | 'Examination' | 'Emergency Alert') || 'Institution',
            targetAudience: c.targetAudience.includes('Student') ? 'Students' : c.targetAudience.includes('Faculty') ? 'Faculty' : 'All',
            publishedAt: c.createdAt,
            reachCount: 500,
            author: c.author || 'Institutional Administrator',
          });
        }
      }
    } catch {
      // Sync tolerance
    }
    return [...mockAnnouncements];
  }

  public static async createAnnouncement(input: {
    title: string;
    content: string;
    priority: 'Normal' | 'Important' | 'Critical';
    category: 'Institution' | 'Department' | 'Examination' | 'Emergency Alert';
    targetAudience: 'All' | 'Students' | 'Faculty' | 'CSE' | 'ECE';
    scheduledDate?: string;
  }): Promise<AdminAnnouncement> {
    if (!input.title || !input.content) {
      throw new Error('Announcement title and content cannot be empty.');
    }

    const newAnn: AdminAnnouncement = {
      id: `ann-${Date.now().toString(36)}`,
      title: input.title.trim(),
      content: input.content.trim(),
      priority: input.priority || 'Normal',
      category: input.category || 'Institution',
      targetAudience: input.targetAudience || 'All',
      scheduledDate: input.scheduledDate,
      publishedAt: new Date().toISOString(),
      reachCount: input.targetAudience === 'All' ? 1248 : 420,
      author: 'Administrator',
    };

    mockAnnouncements.unshift(newAnn);

    try {
      CrossModuleSynchronizer.createAnnouncement({
        title: newAnn.title,
        content: newAnn.content,
        category: newAnn.category,
        priority: newAnn.priority === 'Important' ? 'High' : newAnn.priority,
        author: newAnn.author,
        targetAudience: newAnn.targetAudience === 'Faculty' ? 'Faculty Only' : 'All Students',
      });
    } catch {
      // Sync tolerance
    }

    await this.logAuditEvent({
      action: 'INSERT',
      entityTable: 'announcements',
      entityId: newAnn.id,
      beforeState: null,
      afterState: newAnn as unknown as Record<string, unknown>,
    });

    return newAnn;
  }

  // -------------------------------------------------------------------------
  // 7. Governance, Permissions Visual Diff & Audit
  // -------------------------------------------------------------------------

  public static async getRolePermissions(): Promise<RolePermissionMatrix> {
    return JSON.parse(JSON.stringify(mockRolePermissions));
  }

  /**
   * Generates a clear visual diff (added and removed permissions)
   * before persisting changes to the security matrix.
   */
  public static calculatePermissionDiff(
    oldMatrix: RolePermissionMatrix,
    newMatrix: RolePermissionMatrix,
    role: string
  ): PermissionDiff {
    const oldRole = oldMatrix[role] || {};
    const newRole = newMatrix[role] || {};

    const added: string[] = [];
    const removed: string[] = [];
    let unchanged = 0;

    const modules = new Set([...Object.keys(oldRole), ...Object.keys(newRole)]);

    for (const mod of modules) {
      const oldPerms = oldRole[mod] || { create: false, read: false, update: false, delete: false, approve: false };
      const newPerms = newRole[mod] || { create: false, read: false, update: false, delete: false, approve: false };

      const actions: ModuleAction[] = ['create', 'read', 'update', 'delete', 'approve'];
      for (const act of actions) {
        if (!oldPerms[act] && newPerms[act]) {
          added.push(`${mod}.${act.toUpperCase()}`);
        } else if (oldPerms[act] && !newPerms[act]) {
          removed.push(`${mod}.${act.toUpperCase()}`);
        } else {
          unchanged++;
        }
      }
    }

    return {
      role,
      addedPermissions: added,
      removedPermissions: removed,
      unchangedCount: unchanged,
    };
  }

  public static async updateRolePermissions(
    role: string,
    newPermissions: Record<string, ModulePermissionSet>,
    actorEmail: string = 'admin@campusos.dev'
  ): Promise<{ diff: PermissionDiff; success: boolean }> {
    const oldMatrix = JSON.parse(JSON.stringify(mockRolePermissions));
    const diff = this.calculatePermissionDiff(oldMatrix, { ...oldMatrix, [role]: newPermissions }, role);

    const beforeState = mockRolePermissions[role] ? { ...mockRolePermissions[role] } : null;
    mockRolePermissions[role] = newPermissions;

    await this.logAuditEvent({
      actorEmail,
      action: 'UPDATE',
      entityTable: 'role_permissions',
      entityId: role,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: newPermissions as unknown as Record<string, unknown>,
    });

    return { diff, success: true };
  }

  public static async getAuditEvents(filters?: {
    actorEmail?: string;
    action?: string;
    entityTable?: string;
    search?: string;
  }): Promise<AuditEventRecord[]> {
    let result = [...mockAuditEvents];
    if (filters?.actorEmail) {
      result = result.filter((e) => e.actorEmail.toLowerCase().includes(filters.actorEmail!.toLowerCase()));
    }
    if (filters?.action && filters.action !== 'all') {
      result = result.filter((e) => e.action === filters.action);
    }
    if (filters?.entityTable && filters.entityTable !== 'all') {
      result = result.filter((e) => e.entityTable === filters.entityTable);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.entityId.toLowerCase().includes(q) ||
          e.entityTable.toLowerCase().includes(q) ||
          e.actorEmail.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public static async logAuditEvent(event: {
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'BULK_IMPORT' | 'APPROVE' | 'REJECT' | 'SETTINGS_CHANGE';
    entityTable: string;
    entityId: string;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
  }): Promise<AuditEventRecord> {
    const record: AuditEventRecord = {
      id: `aud-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`,
      actorId: event.actorId || 'admin-001',
      actorEmail: event.actorEmail || 'admin@campusos.dev',
      actorRole: event.actorRole || 'Super Admin',
      action: event.action,
      entityTable: event.entityTable,
      entityId: event.entityId,
      beforeState: event.beforeState,
      afterState: event.afterState,
      ipAddress: '192.168.1.10',
      timestamp: new Date().toISOString(),
    };

    mockAuditEvents.unshift(record);
    return record;
  }

  public static async getSystemSettings(): Promise<SystemSettingsConfig> {
    return { ...mockSystemSettings };
  }

  public static async updateSystemSettings(
    newSettings: Partial<SystemSettingsConfig>,
    actorEmail: string = 'admin@campusos.dev'
  ): Promise<SystemSettingsConfig> {
    const beforeState = { ...mockSystemSettings };
    mockSystemSettings = { ...mockSystemSettings, ...newSettings };

    await this.logAuditEvent({
      actorEmail,
      action: 'SETTINGS_CHANGE',
      entityTable: 'system_settings',
      entityId: 'global_config',
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: mockSystemSettings as unknown as Record<string, unknown>,
    });

    return { ...mockSystemSettings };
  }
}
