'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type StudentRegistryItem,
  type BulkImportResult,
  type StudentImportRecord,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Mail,
  Building,
  RefreshCw,
  PowerOff,
  UserCheck,
  ChevronRight,
  Download,
  Edit3,
} from 'lucide-react';

const sampleValidCsv = `student_id,first_name,last_name,email,department_code,course_code,semester,section
EN2024CSE101,Ishaan,Sharma,ishaan.sharma@campusos.dev,CSE,BTECH-CSE,2,A
EN2024CSE102,Kavya,Nair,kavya.nair@campusos.dev,CSE,BTECH-CSE,2,A
EN2024ECE201,Aditya,Verma,aditya.verma@campusos.dev,ECE,BTECH-ECE,2,B`;

const sampleErrorCsv = `student_id,first_name,last_name,email,department_code,course_code,semester,section
EN2023CSE042,Aarav,Patel,duplicate.id@campusos.dev,CSE,BTECH-CSE,6,A
EN2024CSE105,Siddharth,Rao,invalid-email-format,CSE,BTECH-CSE,2,A
EN2024CSE106,Neha,Gupta,neha.gupta@campusos.dev,INVALID_DEPT,BTECH-CSE,2,A
EN2024CSE107,,MissingFirstName,missing.first@campusos.dev,CSE,BTECH-CSE,2,A
EN2024CSE108,Rahul,Kapoor,rahul.kapoor@campusos.dev,CSE,BTECH-CSE,12,A`;

export default function StudentRegistryPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [departmentCode, setDepartmentCode] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Student Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDept, setNewDept] = useState('CSE');
  const [newSemester, setNewSemester] = useState(1);
  const [newSection, setNewSection] = useState('A');
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Student Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRegistryItem | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDept, setEditDept] = useState('CSE');
  const [editSemester, setEditSemester] = useState(1);
  const [editSection, setEditSection] = useState('A');
  const [editError, setEditError] = useState<string | null>(null);

  // Bulk Import Modal with Dry Run
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [dryRunResult, setDryRunResult] = useState<BulkImportResult<StudentImportRecord> | null>(null);
  const [importCommitSuccess, setImportCommitSuccess] = useState<string | null>(null);

  // Fetch Students
  const {
    data: students,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-students', departmentCode, statusFilter, search],
    queryFn: () =>
      AdminService.getStudents({
        departmentCode,
        status: statusFilter,
        search,
      }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof AdminService.createStudent>[0]) =>
      AdminService.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      setIsCreateOpen(false);
      setNewStudentId('');
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPhone('');
      setCreateError(null);
    },
    onError: (err: Error) => {
      setCreateError(err.message || 'Failed to create student.');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<StudentRegistryItem> }) =>
      AdminService.updateStudent(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      setIsEditOpen(false);
      setEditingStudent(null);
      setEditError(null);
    },
    onError: (err: Error) => {
      setEditError(err.message || 'Failed to update student.');
    },
  });

  const handleOpenEdit = (stu: StudentRegistryItem) => {
    setEditingStudent(stu);
    setEditFirstName(stu.firstName);
    setEditLastName(stu.lastName);
    setEditEmail(stu.email);
    setEditPhone(stu.phone || '');
    setEditDept(stu.departmentCode);
    setEditSemester(stu.semester);
    setEditSection(stu.section);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    updateMutation.mutate({
      id: editingStudent.id,
      updates: {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
        departmentCode: editDept,
        semester: editSemester,
        section: editSection,
      },
    });
  };

  // Deactivate / Reactivate Mutations (soft delete with retained history)
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => AdminService.deactivateStudent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-students'] }),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => AdminService.reactivateStudent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-students'] }),
  });

  // Commit Bulk Import Mutation
  const commitImportMutation = useMutation({
    mutationFn: (records: StudentImportRecord[]) =>
      AdminService.commitStudentBulkImport(records),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      setImportCommitSuccess(`Successfully imported ${res.committedCount} student records.`);
      setDryRunResult(null);
      setCsvContent('');
    },
  });

  const handleRunDryRun = () => {
    if (!csvContent.trim()) return;
    const res = AdminService.validateStudentBulkImport(csvContent);
    setDryRunResult(res);
    setImportCommitSuccess(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      studentId: newStudentId,
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      phone: newPhone,
      departmentCode: newDept,
      courseCode: 'BTECH-CSE',
      semester: newSemester,
      section: newSection,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="h-12 w-full bg-[var(--surface)] rounded-2xl border border-[var(--border)]" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !students) {
    return (
      <ErrorState
        title="Failed to Load Student Registry"
        message="Could not load students directory."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Registry & Bulk Ingestion"
        description="Manage student enrollment status, soft-deactivations with audit trails, and execute dry-run CSV bulk imports."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsImportOpen(true);
                setDryRunResult(null);
                setImportCommitSuccess(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Bulk Import CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Student</span>
            </button>
          </div>
        }
      />

      {/* FILTERS & SEARCH BAR */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, or email..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={departmentCode}
            onChange={(e) => setDepartmentCode(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-semibold"
          >
            <option value="all">All Departments</option>
            <option value="CSE">Computer Science (CSE)</option>
            <option value="ECE">Electronics (ECE)</option>
            <option value="ME">Mechanical (ME)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* STUDENTS TABLE */}
      {students.length === 0 ? (
        <EmptyState
          title="No Students Found"
          description="No student records match the active search and department filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Department & Term</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Audit & Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {students.map((stu) => (
                <tr key={stu.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="py-3 px-4 font-mono font-extrabold text-[var(--accent)]">
                    {stu.studentId}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-[var(--text)] block">{stu.fullName}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{stu.email}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[var(--text)]">
                    {stu.departmentCode} • Sem {stu.semester} ({stu.section})
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-extrabold tabular-nums px-2 py-0.5 rounded ${
                        stu.attendanceRate >= 75
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      {stu.attendanceRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge
                      status={stu.status === 'Active' ? 'success' : 'neutral'}
                      label={stu.status}
                    />
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(stu)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                      title="Edit Student Record"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {stu.status === 'Active' ? (
                      <button
                        type="button"
                        onClick={() => deactivateMutation.mutate(stu.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                        title="Deactivate Student (Preserves history & transcripts)"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reactivateMutation.mutate(stu.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                        title="Reactivate Student"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Reactivate</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 1. REGISTER STUDENT MODAL */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Student"
        description="Create an individual student enrollment record."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Student ID *
              </label>
              <input
                type="text"
                required
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                placeholder="e.g. EN2024CSE099"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Department *
              </label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              >
                <option value="CSE">Computer Science (CSE)</option>
                <option value="ECE">Electronics (ECE)</option>
                <option value="ME">Mechanical (ME)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                placeholder="e.g. Ishaan"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder="e.g. Sharma"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Official Email *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ishaan.sharma@campusos.dev"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Semester
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={newSemester}
                onChange={(e) => setNewSemester(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Section
              </label>
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] uppercase"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Register Student'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* EDIT STUDENT MODAL */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingStudent(null);
        }}
        title={`Edit Student: ${editingStudent?.studentId || ''}`}
        description="Update enrolled student details with audit logging."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Student ID
              </label>
              <input
                type="text"
                disabled
                value={editingStudent?.studentId || ''}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)] uppercase font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Department *
              </label>
              <select
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              >
                <option value="CSE">Computer Science (CSE)</option>
                <option value="ECE">Electronics (ECE)</option>
                <option value="ME">Mechanical (ME)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Institutional Email *
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Semester
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={editSemester}
                onChange={(e) => setEditSemester(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Section
              </label>
              <input
                type="text"
                value={editSection}
                onChange={(e) => setEditSection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] uppercase"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setEditingStudent(null);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* 2. BULK IMPORT WITH DRY RUN MODAL */}
      <Dialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Student Bulk Import with Dry Run Validation"
        description="Upload or paste student CSV data. CampusOS executes a strict dry run before committing."
        className="max-w-3xl"
      >
        <div className="space-y-4">
          {importCommitSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importCommitSuccess}</span>
            </div>
          )}

          {/* Quick Sample Buttons */}
          <div className="flex items-center gap-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Quick Samples:
            </span>
            <button
              type="button"
              onClick={() => {
                setCsvContent(sampleValidCsv);
                setDryRunResult(null);
              }}
              className="px-2 py-1 rounded text-[11px] font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)]"
            >
              Paste Valid Sample CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setCsvContent(sampleErrorCsv);
                setDryRunResult(null);
              }}
              className="px-2 py-1 rounded text-[11px] font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)]"
            >
              Paste Sample With Duplicate/Invalid Errors
            </button>
          </div>

          {/* CSV Input Area */}
          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              CSV Content (Headers: student_id, first_name, last_name, email, department_code, course_code, semester, section)
            </label>
            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Paste comma-separated rows here..."
              className="w-full p-3 font-mono text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Dry run validates against duplicates and foreign key constraints without modifying the database.
            </span>
            <button
              type="button"
              onClick={handleRunDryRun}
              disabled={!csvContent.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Dry Run Validation</span>
            </button>
          </div>

          {/* DRY RUN RESULT BREAKDOWN */}
          {dryRunResult && (
            <div className="space-y-4 pt-3 border-t border-[var(--border)]">
              {/* Summary Stats Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Total Rows</span>
                  <span className="text-lg font-extrabold text-[var(--text)] tabular-nums">{dryRunResult.totalRows}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Valid Rows</span>
                  <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{dryRunResult.validRows}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase block">Errors Found</span>
                  <span className="text-lg font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{dryRunResult.invalidRows}</span>
                </div>
              </div>

              {/* ITEMIZED ERROR REPORT TABLE */}
              {dryRunResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Itemized Validation Errors ({dryRunResult.errors.length}):</span>
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300 font-extrabold text-[10px] uppercase">
                          <th className="py-2 px-3">Row #</th>
                          <th className="py-2 px-3">Column</th>
                          <th className="py-2 px-3">Offending Value</th>
                          <th className="py-2 px-3">Reason for Rejection</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-200/60 dark:divide-rose-900/30 font-medium">
                        {dryRunResult.errors.map((err, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-mono font-bold text-rose-800 dark:text-rose-300">
                              Row {err.row}
                            </td>
                            <td className="py-2 px-3 font-mono">{err.column}</td>
                            <td className="py-2 px-3 font-mono text-[11px] max-w-xs truncate">{err.value || '<empty>'}</td>
                            <td className="py-2 px-3 text-rose-700 dark:text-rose-300">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* COMMIT BUTTON */}
              <div className="pt-3 flex items-center justify-between border-t border-[var(--border)]">
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {dryRunResult.validRows > 0
                    ? `Ready to commit ${dryRunResult.validRows} validated student record(s).`
                    : 'Fix validation errors to proceed.'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={dryRunResult.validRows === 0 || commitImportMutation.isPending}
                    onClick={() => commitImportMutation.mutate(dryRunResult.parsedRecords)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {commitImportMutation.isPending
                      ? 'Committing...'
                      : `Commit Import (${dryRunResult.validRows} Records)`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
