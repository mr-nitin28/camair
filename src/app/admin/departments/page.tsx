'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService, type InstitutionDepartment, type HistorySafetyCheckResult } from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Building,
  Plus,
  Trash2,
  PowerOff,
  ShieldAlert,
  Users,
  GraduationCap,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  FolderOpen,
} from 'lucide-react';

export default function DepartmentsPage() {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hodName, setHodName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Safety Modal State
  const [safetyCheckResult, setSafetyCheckResult] = useState<HistorySafetyCheckResult | null>(null);
  const [targetDept, setTargetDept] = useState<InstitutionDepartment | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Fetch Departments
  const {
    data: departments,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => AdminService.getDepartments(),
  });

  // Create Department Mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; code: string; hodName: string; email: string; phone: string }) =>
      AdminService.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      setIsCreateOpen(false);
      setName('');
      setCode('');
      setHodName('');
      setEmail('');
      setPhone('');
      setFormError(null);
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to create department.');
    },
  });

  // Deactivate Department Mutation
  const deactivateMutation = useMutation({
    mutationFn: (deptId: string) => AdminService.deactivateDepartment(deptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      setSafetyCheckResult(null);
      setTargetDept(null);
    },
  });

  // Delete Department Mutation
  const deleteMutation = useMutation({
    mutationFn: (deptId: string) => AdminService.deleteDepartment(deptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      setIsConfirmDeleteOpen(false);
      setTargetDept(null);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setFormError('Department name and code are required.');
      return;
    }
    createMutation.mutate({ name, code, hodName, email, phone });
  };

  const handleDeleteClick = async (dept: InstitutionDepartment) => {
    setTargetDept(dept);
    const safety = await AdminService.checkDestructiveSafety('department', dept.id);
    if (!safety.allowed) {
      setSafetyCheckResult(safety);
    } else {
      setIsConfirmDeleteOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <Skeleton className="h-5 w-40 mb-3" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !departments) {
    return (
      <ErrorState
        title="Failed to Load Departments"
        message="Could not retrieve the institution department registry."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Registry & Historical Safety"
        description="Manage academic departments, faculty allocations, and safeguard historical student records from destructive deletion."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Department</span>
          </button>
        }
      />

      {/* Safety Policy Notice */}
      <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/50 dark:bg-indigo-950/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
        <ShieldAlert className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold block mb-0.5">Historical Safety Policy Active</span>
          <span>
            Destructive deletions that would invalidate historical attendance sessions, fee balances, or examination marks are strictly blocked.
            Departments with historical records must be deactivated rather than deleted to ensure audit trails remain intact.
          </span>
        </div>
      </div>

      {/* Department Cards Grid */}
      {departments.length === 0 ? (
        <EmptyState
          title="No Departments Configured"
          description="Create your institution's first academic department to begin assigning courses and faculty."
          action={
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white"
            >
              Create Department
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className={`p-5 rounded-2xl border bg-[var(--surface)] shadow-sm transition-all flex flex-col justify-between ${
                dept.status === 'Inactive'
                  ? 'border-[var(--border)] opacity-70'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]">
                      <Building className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                        {dept.name}
                      </h3>
                      <span className="font-mono text-xs font-extrabold text-[var(--accent)]">
                        {dept.code}
                      </span>
                    </div>
                  </div>

                  <StatusBadge
                    status={dept.status === 'Active' ? 'success' : 'neutral'}
                    label={dept.status}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 py-3 px-3.5 rounded-xl bg-[var(--surface-2)] text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">HOD</span>
                    <span className="font-bold text-[var(--text)] truncate block mt-0.5">{dept.hodName || 'Not Assigned'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Enrolled Students</span>
                    <span className="font-bold text-[var(--text)] block mt-0.5 tabular-nums flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      {dept.studentCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Faculty Members</span>
                    <span className="font-bold text-[var(--text)] block mt-0.5 tabular-nums flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      {dept.facultyCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Contact</span>
                    <span className="text-[var(--text-muted)] truncate block mt-0.5 text-[11px]">{dept.email}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3.5 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Created {new Date(dept.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                </span>

                <div className="flex items-center gap-2">
                  {dept.status === 'Active' && (
                    <button
                      type="button"
                      onClick={() => deactivateMutation.mutate(dept.id)}
                      className="px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                    >
                      Deactivate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(dept)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                    title="Delete Department (Safeguarded)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFormError(null);
        }}
        title="Register New Academic Department"
        description="Define a new institutional department code, name, and lead coordinator."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Department Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mechanical Engineering"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ME"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] uppercase focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Head of Department (HOD)
            </label>
            <input
              type="text"
              value={hodName}
              onChange={(e) => setHodName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Verma"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hod.dept@campusos.dev"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98100 00000"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
              {createMutation.isPending ? 'Registering...' : 'Register Department'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* HISTORY SAFETY BLOCK MODAL */}
      {safetyCheckResult && targetDept && (
        <Dialog
          isOpen={true}
          onClose={() => {
            setSafetyCheckResult(null);
            setTargetDept(null);
          }}
          title="Destructive Operation Blocked by History Safety"
          description="Institutional data integrity protection prevents corrupting historical records."
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block text-sm mb-1">
                  Cannot Delete &quot;{targetDept.name}&quot; ({targetDept.code})
                </span>
                <p className="leading-relaxed">{safetyCheckResult.reason}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface-2)] text-xs space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                Associated Dependencies Detected:
              </span>
              <ul className="space-y-1 font-semibold text-[var(--text)]">
                <li>• {safetyCheckResult.dependencies.activeEnrollmentsCount} Enrolled Students</li>
                <li>• {safetyCheckResult.dependencies.attendanceSessionsCount} Historical Attendance Sessions</li>
                <li>• {safetyCheckResult.dependencies.examinationMarksCount} Assessment Marks Records</li>
                <li>• {safetyCheckResult.dependencies.feeAssignmentsCount} Generated Fee Ledger Records</li>
              </ul>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              To archive this department without breaking historical student transcripts, you can de-activate it.
              Inactive departments cannot enroll new students but preserve all prior academic data.
            </p>

            <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setSafetyCheckResult(null);
                  setTargetDept(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => deactivateMutation.mutate(targetDept.id)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                Deactivate Department Instead
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* TYPED CONFIRMATION DIALOG FOR UNRESTRICTED DELETES */}
      {isConfirmDeleteOpen && targetDept && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => {
            setIsConfirmDeleteOpen(false);
            setTargetDept(null);
          }}
          onConfirm={() => deleteMutation.mutate(targetDept.id)}
          title={`Delete Department ${targetDept.code}?`}
          description={`Are you sure you want to permanently delete "${targetDept.name}"? This action cannot be undone.`}
          confirmText="Delete Department"
          requiredKeyword="DELETE"
          variant="danger"
        />
      )}
    </div>
  );
}
