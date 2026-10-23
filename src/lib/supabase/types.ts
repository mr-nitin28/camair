export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | 'Super Admin'
  | 'Institution Admin'
  | 'Academic Admin'
  | 'Examination Admin'
  | 'Finance Admin'
  | 'Department Admin'
  | 'Faculty'
  | 'Student';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
export type AttendanceSessionStatus = 'scheduled' | 'open' | 'submitted' | 'locked';
export type AssessmentType = 'internal' | 'midterm' | 'final_practical' | 'final_theory' | 'assignment';
export type AssessmentStatus = 'draft' | 'submitted' | 'reviewed' | 'published' | 'correction_pending';
export type PaymentStatus = 'initiated' | 'verified' | 'failed' | 'refunded';
export type LeaveStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'clarification_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn';
export type DoubtStatus = 'open' | 'answered' | 'resolved' | 'reopened';

export interface Database {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string;
          code: string;
          name: string;
          legal_name: string | null;
          timezone: string;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          legal_name?: string | null;
          timezone?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['institutions']['Insert']>;
      };
      campuses: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          code: string;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          code: string;
          address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campuses']['Insert']>;
      };
      user_profiles: {
        Row: {
          id: string;
          institution_id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          institution_id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      user_roles: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string;
          role: AppRole;
          granted_at: string;
          granted_by: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id: string;
          role: AppRole;
          granted_at?: string;
          granted_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
      };
      departments: {
        Row: {
          id: string;
          institution_id: string;
          code: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          code: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      programmes: {
        Row: {
          id: string;
          institution_id: string;
          department_id: string;
          code: string;
          name: string;
          duration_years: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          department_id: string;
          code: string;
          name: string;
          duration_years: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['programmes']['Insert']>;
      };
      academic_sessions: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
        };
        Update: Partial<Database['public']['Tables']['academic_sessions']['Insert']>;
      };
      semesters: {
        Row: {
          id: string;
          institution_id: string;
          programme_id: string;
          session_id: string;
          number: number;
          start_date: string;
          end_date: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          programme_id: string;
          session_id: string;
          number: number;
          start_date: string;
          end_date: string;
        };
        Update: Partial<Database['public']['Tables']['semesters']['Insert']>;
      };
      sections: {
        Row: {
          id: string;
          institution_id: string;
          semester_id: string;
          name: string;
          capacity: number;
        };
        Insert: {
          id?: string;
          institution_id: string;
          semester_id: string;
          name: string;
          capacity?: number;
        };
        Update: Partial<Database['public']['Tables']['sections']['Insert']>;
      };
      subjects: {
        Row: {
          id: string;
          institution_id: string;
          semester_id: string;
          code: string;
          name: string;
          credits: number;
          is_elective: boolean;
        };
        Insert: {
          id?: string;
          institution_id: string;
          semester_id: string;
          code: string;
          name: string;
          credits: number;
          is_elective?: boolean;
        };
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
      };
      faculty_profiles: {
        Row: {
          id: string;
          institution_id: string;
          department_id: string;
          employee_code: string;
          designation: string;
          date_of_joining: string;
        };
        Insert: {
          id: string;
          institution_id: string;
          department_id: string;
          employee_code: string;
          designation: string;
          date_of_joining: string;
        };
        Update: Partial<Database['public']['Tables']['faculty_profiles']['Insert']>;
      };
      student_profiles: {
        Row: {
          id: string;
          institution_id: string;
          department_id: string;
          programme_id: string;
          current_semester_id: string;
          current_section_id: string;
          enrolment_no: string;
          roll_no: string;
          admission_date: string;
          cgpa: number;
          sgpa: number;
          status: string;
        };
        Insert: {
          id: string;
          institution_id: string;
          department_id: string;
          programme_id: string;
          current_semester_id: string;
          current_section_id: string;
          enrolment_no: string;
          roll_no: string;
          admission_date: string;
          cgpa?: number;
          sgpa?: number;
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['student_profiles']['Insert']>;
      };
      teaching_assignments: {
        Row: {
          id: string;
          institution_id: string;
          faculty_id: string;
          subject_id: string;
          section_id: string;
          academic_session_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          faculty_id: string;
          subject_id: string;
          section_id: string;
          academic_session_id: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['teaching_assignments']['Insert']>;
      };
      attendance_sessions: {
        Row: {
          id: string;
          institution_id: string;
          teaching_assignment_id: string;
          session_date: string;
          slot_number: number;
          status: AttendanceSessionStatus;
          opened_at: string | null;
          submitted_at: string | null;
          locked_at: string | null;
          revision_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          teaching_assignment_id: string;
          session_date: string;
          slot_number: number;
          status?: AttendanceSessionStatus;
          opened_at?: string | null;
          submitted_at?: string | null;
          locked_at?: string | null;
          revision_count?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attendance_sessions']['Insert']>;
      };
      attendance_records: {
        Row: {
          id: string;
          institution_id: string;
          session_id: string;
          student_id: string;
          status: AttendanceStatus;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          session_id: string;
          student_id: string;
          status: AttendanceStatus;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attendance_records']['Insert']>;
      };
      attendance_revisions: {
        Row: {
          id: string;
          institution_id: string;
          session_id: string;
          revision_number: number;
          reason: string;
          performed_by: string;
          snapshot_records: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          session_id: string;
          revision_number: number;
          reason: string;
          performed_by: string;
          snapshot_records: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attendance_revisions']['Insert']>;
      };
      grading_scales: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          effective_from: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          effective_from: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['grading_scales']['Insert']>;
      };
      grading_scale_tiers: {
        Row: {
          id: string;
          scale_id: string;
          grade: string;
          grade_points: number;
          min_percentage: number;
          max_percentage: number;
          description: string | null;
        };
        Insert: {
          id?: string;
          scale_id: string;
          grade: string;
          grade_points: number;
          min_percentage: number;
          max_percentage: number;
          description?: string | null;
        };
        Update: Partial<Database['public']['Tables']['grading_scale_tiers']['Insert']>;
      };
      assessments: {
        Row: {
          id: string;
          institution_id: string;
          teaching_assignment_id: string;
          name: string;
          type: AssessmentType;
          max_marks: number;
          weightage_percent: number;
          status: AssessmentStatus;
          grading_scale_id: string;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          teaching_assignment_id: string;
          name: string;
          type: AssessmentType;
          max_marks: number;
          weightage_percent: number;
          status?: AssessmentStatus;
          grading_scale_id: string;
          created_at?: string;
          published_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['assessments']['Insert']>;
      };
      assessment_results: {
        Row: {
          id: string;
          institution_id: string;
          assessment_id: string;
          student_id: string;
          marks_obtained: number;
          grade: string | null;
          grade_points: number | null;
          is_absent: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          assessment_id: string;
          student_id: string;
          marks_obtained: number;
          grade?: string | null;
          grade_points?: number | null;
          is_absent?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['assessment_results']['Insert']>;
      };
      fee_structures: {
        Row: {
          id: string;
          institution_id: string;
          programme_id: string;
          semester_id: string;
          name: string;
          amount_minor_units: number;
          due_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          programme_id: string;
          semester_id: string;
          name: string;
          amount_minor_units: number;
          due_date: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fee_structures']['Insert']>;
      };
      fee_assignments: {
        Row: {
          id: string;
          institution_id: string;
          fee_structure_id: string;
          student_id: string;
          assigned_amount_minor_units: number;
          concession_amount_minor_units: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          fee_structure_id: string;
          student_id: string;
          assigned_amount_minor_units: number;
          concession_amount_minor_units?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fee_assignments']['Insert']>;
      };
      fee_payments: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          fee_assignment_id: string;
          amount_minor_units: number;
          payment_method: string;
          gateway_reference: string | null;
          status: PaymentStatus;
          idempotency_key: string;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          fee_assignment_id: string;
          amount_minor_units: number;
          payment_method: string;
          gateway_reference?: string | null;
          status?: PaymentStatus;
          idempotency_key: string;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fee_payments']['Insert']>;
      };
      leave_requests: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          start_date: string;
          end_date: string;
          reason: string;
          status: LeaveStatus;
          attachment_storage_path: string | null;
          approver_id: string | null;
          clarification_comment: string | null;
          decision_comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          start_date: string;
          end_date: string;
          reason: string;
          status?: LeaveStatus;
          attachment_storage_path?: string | null;
          approver_id?: string | null;
          clarification_comment?: string | null;
          decision_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leave_requests']['Insert']>;
      };
      doubts: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          subject_id: string;
          title: string;
          status: DoubtStatus;
          reopen_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          subject_id: string;
          title: string;
          status?: DoubtStatus;
          reopen_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['doubts']['Insert']>;
      };
      doubt_messages: {
        Row: {
          id: string;
          doubt_id: string;
          sender_id: string;
          message: string;
          attachment_storage_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          doubt_id: string;
          sender_id: string;
          message: string;
          attachment_storage_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['doubt_messages']['Insert']>;
      };
      audit_events: {
        Row: {
          id: number;
          institution_id: string;
          actor_id: string | null;
          actor_role: string;
          action: string;
          entity_name: string;
          entity_id: string;
          request_id: string | null;
          client_ip: string | null;
          before_state: Json | null;
          after_state: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          institution_id: string;
          actor_id?: string | null;
          actor_role: string;
          action: string;
          entity_name: string;
          entity_id: string;
          request_id?: string | null;
          client_ip?: string | null;
          before_state?: Json | null;
          after_state?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_events']['Insert']>;
      };
      notification_outbox: {
        Row: {
          id: number;
          institution_id: string;
          event_type: string;
          payload: Json;
          processed_at: string | null;
          retry_count: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          institution_id: string;
          event_type: string;
          payload: Json;
          processed_at?: string | null;
          retry_count?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_outbox']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          institution_id: string;
          recipient_id: string;
          title: string;
          body: string;
          category: string;
          deep_link: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          recipient_id: string;
          title: string;
          body: string;
          category: string;
          deep_link?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      institution_policies: {
        Row: {
          id: string;
          institution_id: string;
          attendance_threshold_percent: number;
          fee_clearance_required_for_exam: boolean;
          attendance_correction_window_hours: number;
          doubt_reopen_limit: number;
          effective_from: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          attendance_threshold_percent?: number;
          fee_clearance_required_for_exam?: boolean;
          attendance_correction_window_hours?: number;
          doubt_reopen_limit?: number;
          effective_from: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['institution_policies']['Insert']>;
      };
    };
    Functions: {
      rpc_submit_attendance_session: {
        Args: {
          p_session_id: string;
          p_records: Json;
          p_idempotency_key?: string;
        };
        Returns: Json;
      };
      rpc_transition_leave_request: {
        Args: {
          p_leave_id: string;
          p_new_status: LeaveStatus;
          p_comment?: string;
        };
        Returns: Json;
      };
      rpc_publish_assessment_results: {
        Args: {
          p_assessment_id: string;
        };
        Returns: Json;
      };
      rpc_record_fee_payment: {
        Args: {
          p_assignment_id: string;
          p_amount_minor_units: number;
          p_payment_method: string;
          p_idempotency_key: string;
          p_gateway_reference?: string;
        };
        Returns: Json;
      };
      calc_attendance_percentage: {
        Args: {
          p_student_id: string;
          p_subject_id?: string;
        };
        Returns: number;
      };
      calc_fee_balance: {
        Args: {
          p_fee_assignment_id: string;
        };
        Returns: number;
      };
      calc_sgpa: {
        Args: {
          p_student_id: string;
          p_semester_id: string;
        };
        Returns: number;
      };
    };
  };
}
