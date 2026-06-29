import { StudentProfile } from './store';

const mockNotes = [
  {
    id: 'n1',
    title: 'Compiler Design: Lexical Analyzer & DFA minimization',
    description: 'Detailed lecture notes covering finite automata construction, subset construction algorithm, and direct transition table minimized state tables.',
    file_type: 'PDF Slide Deck',
    file_name: 'Lexical_Analysis_CS601.pdf',
    subject_id: 'sub-cd',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'n2',
    title: 'Computer Networks: IPv6 Header and Routing Protocols',
    description: 'Comprehensive guidelines detailing OSPF, RIP link state routing vs distance vector algorithms, and IPv4 to IPv6 translation headers.',
    file_type: 'Handout Pack',
    file_name: 'Routing_OSPF_Protocols.pdf',
    subject_id: 'sub-cn',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: 'n3',
    title: 'Software Engineering: Agile Sprint Management Templates',
    description: 'Practical workbook slides for drafting Sprint Backlogs, planning velocity metrics, and user story mapping criteria for Capstone evaluations.',
    file_type: 'Word Doc',
    file_name: 'Agile_Sprint_Workbook.docx',
    subject_id: 'sub-se',
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
  },
  {
    id: 'n4',
    title: 'Artificial Intelligence: Heuristic Search & A* Proofs',
    description: 'A complete study guide covering A* admissibility proofs, heuristic admissibility vs consistency, and adversarial Minimax alpha-beta pruning trees.',
    file_type: 'PDF Booklet',
    file_name: 'Admissible_Heuristics_AI.pdf',
    subject_id: 'sub-ai',
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  },
  {
    id: 'n5',
    title: 'Web Technologies: Next.js Server Actions & RLS Integration',
    description: 'Technical draft detailing Next.js app route fetch optimization, Supabase RLS schema validation, and middleware edge route performance benchmarks.',
    file_type: 'Technical Guide',
    file_name: 'Nextjs_Supabase_State.pdf',
    subject_id: 'sub-wt',
    created_at: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
  }
];

const mockAnnouncements = [
  {
    id: 'a1',
    title: 'Mid-Semester Internal Evaluation Schedule',
    content: 'The detailed datesheet for Semester 6 Mid-Term internal examinations is now uploaded. Attendance is strictly compulsory. Contact your department coordinator for details.',
    priority: 'Critical',
    category: 'Examination',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'a2',
    title: 'Annual Campus Hackathon - Hackfest 2026',
    content: 'Registration is now open for Hackfest 2026. Cash prizes worth ₹2,50,000 up for grabs. Mentorship from senior engineering staff. Registrations close on June 28th.',
    priority: 'High',
    category: 'Department',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'a3',
    title: 'Fee Payment Deadline Extension',
    content: 'The deadline for clearing Semester 6 academic fee dues has been extended till June 30th without any late penalty charges. Please check your ledger for pending invoices.',
    priority: 'Normal',
    category: 'Institution',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'a4',
    title: 'Campus Placement & Aptitude Prep Boot Camp',
    content: 'A mock aptitude drill and technical interview preparation workshop is scheduled in the main auditorium this Thursday from 10:00 AM onwards. Recommended for all Pre-final year students.',
    priority: 'High',
    category: 'Institution',
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: 'a5',
    title: 'Central Library Stock Audit Closure',
    content: 'The central library will remain closed for book inventory verification from June 24th to June 26th. Book checkouts are temporarily suspended.',
    priority: 'Normal',
    category: 'Institution',
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
  }
];

const mockActivities = [
  {
    id: 'ac1',
    title: 'Decentralized AI & Web3 Hackfest 2026',
    description: 'A 36-hour cohort hackathon focusing on AI agents, zero-knowledge proofs, and decentralized compute protocols. Cash pool worth ₹2,50,000.',
    event_type: 'Hackathon',
    venue: 'Seminar Hall 3',
    start_date: new Date(Date.now() + 3600000 * 48).toISOString(),
    end_date: new Date(Date.now() + 3600000 * 84).toISOString(),
    registration_deadline: new Date(Date.now() + 3600000 * 24).toISOString(),
  },
  {
    id: 'ac2',
    title: 'Cloud Native Kubernetes Boot Camp',
    description: 'Learn deployment patterns, service mesh integration, microservices orchestration, and building scalable serverless infrastructures.',
    event_type: 'Workshop',
    venue: 'Block B Lab 6',
    start_date: new Date(Date.now() + 3600000 * 120).toISOString(),
    end_date: new Date(Date.now() + 3600000 * 126).toISOString(),
    registration_deadline: new Date(Date.now() + 3600000 * 96).toISOString(),
  },
  {
    id: 'ac3',
    title: 'Campus Placement & Aptitude Drills',
    description: 'Comprehensive guidelines detailing analytical problem solving, programming mock rounds, and corporate HR presentation skills.',
    event_type: 'Seminar',
    venue: 'Main Auditorium',
    start_date: new Date(Date.now() - 3600000 * 2).toISOString(),
    end_date: new Date(Date.now() - 3600000 * 1).toISOString(),
    registration_deadline: new Date(Date.now() - 3600000 * 12).toISOString(),
  }
];

// --- MOCK DATABASE TABLES ---
const mockData: Record<string, any[]> = {
  departments: [
    { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
    { id: 'dept-ece', name: 'Electronics & Communication Engineering', code: 'ECE' }
  ],
  courses: [
    { id: 'course-btech', name: 'Bachelor of Technology', duration_years: 4, department_id: 'dept-cse' }
  ],
  semesters: [
    { id: 'sem-6', number: 6, course_id: 'course-btech' }
  ],
  subjects: [
    { id: 'sub-cd', code: 'CS-601', name: 'Compiler Design', credits: 4, semester_id: 'sem-6' },
    { id: 'sub-cn', code: 'CS-602', name: 'Computer Networks', credits: 4, semester_id: 'sem-6' },
    { id: 'sub-se', code: 'CS-603', name: 'Software Engineering', credits: 3, semester_id: 'sem-6' },
    { id: 'sub-ai', code: 'CS-604', name: 'Artificial Intelligence', credits: 3, semester_id: 'sem-6' },
    { id: 'sub-wt', code: 'CS-605', name: 'Web Technologies', credits: 4, semester_id: 'sem-6' },
  ],
  students: [
    {
      id: 'mock-student-001',
      student_id: 'STU-2026-0042',
      first_name: 'Aarav',
      last_name: 'Sharma',
      email: 'student@campusos.dev',
      cgpa: 8.72,
      sgpa: 8.94,
      semester_id: 'sem-6',
      course_id: 'course-btech',
      created_at: new Date().toISOString()
    }
  ],
  faculty: [
    {
      id: 'mock-faculty-001',
      faculty_id: 'FAC-2026-0011',
      first_name: 'Priya',
      last_name: 'Verma',
      name: 'Dr. Priya Verma',
      email: 'faculty@campusos.dev',
      department: 'Computer Science & Engineering',
      role: 'Professor',
      created_at: new Date().toISOString()
    }
  ],
  admin_profiles: [
    {
      id: 'mock-admin-001',
      name: 'Administrator',
      email: 'admin@campusos.dev',
      role: 'Super Admin',
      created_at: new Date().toISOString()
    }
  ],
  attendance: [
    { id: 'att-1', student_id: 'mock-student-001', subject_id: 'sub-cd', total_classes: 40, attended_classes: 36 },
    { id: 'att-2', student_id: 'mock-student-001', subject_id: 'sub-cn', total_classes: 40, attended_classes: 34 },
    { id: 'att-3', student_id: 'mock-student-001', subject_id: 'sub-se', total_classes: 30, attended_classes: 28 },
    { id: 'att-4', student_id: 'mock-student-001', subject_id: 'sub-ai', total_classes: 30, attended_classes: 23 },
    { id: 'att-5', student_id: 'mock-student-001', subject_id: 'sub-wt', total_classes: 42, attended_classes: 39 },
  ],
  results: [
    { id: 'res-1', student_id: 'mock-student-001', subject_id: 'sub-cd', internal_marks: 27, external_marks: 64, grade: 'A+' },
    { id: 'res-2', student_id: 'mock-student-001', subject_id: 'sub-cn', internal_marks: 28, external_marks: 68, grade: 'A++' },
    { id: 'res-3', student_id: 'mock-student-001', subject_id: 'sub-se', internal_marks: 25, external_marks: 60, grade: 'A' },
    { id: 'res-4', student_id: 'mock-student-001', subject_id: 'sub-ai', internal_marks: 22, external_marks: 58, grade: 'B+' },
    { id: 'res-5', student_id: 'mock-student-001', subject_id: 'sub-wt', internal_marks: 29, external_marks: 67, grade: 'A++' },
  ],
  leave_requests: [
    {
      id: 'l-001',
      student_id: 'mock-student-001',
      start_date: '2026-06-25',
      end_date: '2026-06-25',
      reason: 'Regular medical checkup following viral fever.',
      status: 'Approved',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'l-002',
      student_id: 'mock-student-001',
      start_date: '2026-07-02',
      end_date: '2026-07-03',
      reason: 'Attending cousin sister\'s wedding ceremony.',
      status: 'Pending',
      created_at: new Date().toISOString()
    }
  ],
  doubts: [
    {
      id: 'd-001',
      student_id: 'mock-student-001',
      subject_id: 'sub-cd',
      title: 'Minimization of DFA with dead states',
      status: 'Open',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ],
  doubt_messages: [
    {
      id: 'dm-1',
      doubt_id: 'd-001',
      sender_id: 'mock-student-001',
      sender_type: 'student',
      message: 'Professor, in Compiler Design, should we include dead/trap states in the state partitioning table when minimizing?',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ],
  payments: [
    { id: 'pay-1', student_id: 'mock-student-001', fee_id: 'fee-1', amount: 95000, status: 'Paid', method: 'UPI', transaction_id: 'TXN-94038102', paid_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString() },
    { id: 'pay-2', student_id: 'mock-student-001', fee_id: 'fee-2', amount: 2500, status: 'Paid', method: 'Card', transaction_id: 'TXN-39105432', paid_at: new Date(Date.now() - 3600000 * 24 * 25).toISOString() }
  ],
  fees: [
    { id: 'fee-1', title: 'Semester Tuition Fee', amount: 95000, deadline: '2026-06-30', semester_id: 'sem-6' },
    { id: 'fee-2', title: 'University Exam Fees', amount: 2500, deadline: '2026-06-25', semester_id: 'sem-6' },
  ],
  system_settings: [
    { key: 'academic_year', value: '2025-2026' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'exam_registration_active', value: 'true' }
  ],
  audit_logs: [
    { id: 'log-1', action: 'Login', details: 'User logged in', created_at: new Date().toISOString() }
  ],
  messages: [],
  notes: mockNotes,
  announcements: mockAnnouncements,
  activities: mockActivities,
};

// Relation resolver helper
const resolveRelations = (tableName: string, items: any[]) => {
  if (tableName === 'attendance' || tableName === 'results') {
    return items.map(item => ({
      ...item,
      subjects: mockData.subjects.find(s => s.id === item.subject_id)
    }));
  }
  if (tableName === 'leave_requests') {
    return items.map(item => ({
      ...item,
      students: mockData.students.find(s => s.id === item.student_id)
    }));
  }
  if (tableName === 'doubts') {
    return items.map(item => ({
      ...item,
      students: mockData.students.find(s => s.id === item.student_id),
      subjects: mockData.subjects.find(s => s.id === item.subject_id)
    }));
  }
  if (tableName === 'payments') {
    return items.map(item => ({
      ...item,
      students: mockData.students.find(s => s.id === item.student_id),
      fees: mockData.fees.find(f => f.id === item.fee_id)
    }));
  }
  return items;
};

// --- MOCK QUERY BUILDER CLASS ---
class MockQueryBuilder {
  private tableName: string;
  private data: any[];

  constructor(tableName: string) {
    this.tableName = tableName;
    // Load static mock rows
    const rawData = mockData[tableName] || [];
    this.data = JSON.parse(JSON.stringify(rawData)); // Deep clone
  }

  select(columns?: string, options?: any) {
    this.data = resolveRelations(this.tableName, this.data);
    return this;
  }

  insert(values: any) {
    const rows = Array.isArray(values) ? values : [values];
    const newRows = rows.map((r, i) => ({
      id: `new-${Date.now()}-${i}`,
      created_at: new Date().toISOString(),
      ...r
    }));
    
    // Push into mock storage dynamically
    if (!mockData[this.tableName]) {
      mockData[this.tableName] = [];
    }
    mockData[this.tableName].push(...newRows);
    
    return Promise.resolve({ data: newRows, error: null });
  }

  update(values: any) {
    return this;
  }

  upsert(values: any, options?: any) {
    const rows = Array.isArray(values) ? values : [values];
    if (!mockData[this.tableName]) {
      mockData[this.tableName] = [];
    }
    mockData[this.tableName].push(...rows);
    return Promise.resolve({ data: rows, error: null });
  }

  delete() {
    return this;
  }

  eq(column: string, value: any) {
    this.data = this.data.filter(item => item[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.data = this.data.filter(item => item[column] !== value);
    return this;
  }

  gt(column: string, value: any) {
    this.data = this.data.filter(item => item[column] > value);
    return this;
  }

  lt(column: string, value: any) {
    this.data = this.data.filter(item => item[column] < value);
    return this;
  }

  gte(column: string, value: any) {
    this.data = this.data.filter(item => item[column] >= value);
    return this;
  }

  lte(column: string, value: any) {
    this.data = this.data.filter(item => item[column] <= value);
    return this;
  }

  in(column: string, values: any[]) {
    this.data = this.data.filter(item => values.includes(item[column]));
    return this;
  }

  or(filters: string) {
    return this;
  }

  ilike(column: string, pattern: string) {
    return this;
  }

  like(column: string, pattern: string) {
    return this;
  }

  range(from: number, to: number) {
    this.data = this.data.slice(from, to + 1);
    return this;
  }

  order(column: string, options?: any) {
    // Sort descending by default for date fields
    if (column === 'created_at' || column === 'paid_at' || column === 'start_date') {
      const asc = options?.ascending ?? true;
      this.data.sort((a, b) => {
        const timeA = new Date(a[column] || 0).getTime();
        const timeB = new Date(b[column] || 0).getTime();
        return asc ? timeA - timeB : timeB - timeA;
      });
    }
    return this;
  }

  limit(count: number) {
    this.data = this.data.slice(0, count);
    return this;
  }

  single() {
    const item = this.data[0] || null;
    return Promise.resolve({
      data: item,
      error: item ? null : { message: 'No record found', code: 'PGRST116' }
    });
  }

  maybeSingle() {
    const item = this.data[0] || null;
    return Promise.resolve({
      data: item,
      error: null
    });
  }

  // Promise resolution support for direct `await supabase.from(...)`
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    return Promise.resolve({ data: this.data, error: null }).then(onfulfilled, onrejected);
  }
}

// --- MOCK AUTHENTICATION HANDLER ---
const mockAuth = {
  async getSession() {
    // Check if we are running in browser context
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('mock_user_role');
      if (savedUser) {
        return {
          data: {
            session: {
              user: {
                id: `mock-${savedUser}-001`,
                email: `${savedUser}@campusos.dev`
              }
            }
          },
          error: null
        };
      }
    }
    return { data: { session: null }, error: null };
  },
  async getUser() {
    const sessionRes = await this.getSession();
    return { data: { user: sessionRes.data.session?.user || null }, error: null };
  },
  async signInWithPassword(credentials: any) {
    let role = 'student';
    if (credentials.email?.includes('faculty')) role = 'faculty';
    if (credentials.email?.includes('admin')) role = 'admin';
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_user_role', role);
    }
    
    return {
      data: {
        session: {
          user: {
            id: `mock-${role}-001`,
            email: credentials.email
          }
        }
      },
      error: null
    };
  },
  async signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mock_user_role');
    }
    return { error: null };
  },
  async updateUser(attributes: any) {
    return { data: { user: { id: 'mock-user-001', ...attributes } }, error: null };
  }
};

// --- CUSTOM INTERFACE TO ELIMINATE @SUPABASE/SUPABASE-JS ---
export interface SupabaseClient {
  from(tableName: string): any;
  rpc(name: string, args: any): Promise<{ data: any; error: any }>;
  auth: {
    getSession(): Promise<{ data: { session: any }; error: any }>;
    getUser(): Promise<{ data: { user: any }; error: any }>;
    signInWithPassword(credentials: any): Promise<{ data: { session: any }; error: any }>;
    signOut(): Promise<{ error: any }>;
    updateUser(attributes: any): Promise<{ data: { user: any }; error: any }>;
  };
}

// --- CLIENT EXPORT ---
export const supabase = {
  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },
  async rpc(name: string, args: any) {
    return { data: null, error: null };
  },
  auth: mockAuth
} as unknown as SupabaseClient;
