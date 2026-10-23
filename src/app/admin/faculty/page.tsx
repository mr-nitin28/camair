'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type FacultyRegistryItem,
  type BulkImportResult,
  type FacultyImportRecord,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  GraduationCap,
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
  Phone,
  Briefcase,
  Layers,
  Edit3,
} from 'lucide-react';

const sampleFacultyValidCsv = `faculty_id,first_name,last_name,email,department_code,designation,cabin
FAC-CS-004,Pooja,Iyer,pooja.iyer@campusos.dev,CSE,Associate Professor,Room 305 Block A
FAC-EC-002,Manish,Tiwari,manish.tiwari@campusos.dev,ECE,Assistant Professor,Room 203 Block B`;

export default function FacultyRegistryPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [departmentCode, setDepartmentCode] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Faculty Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFacultyId, setNewFacultyId] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDept, setNewDept] = useState('CSE');
  const [newDesignation, setNewDesignation] = useState('Assistant Professor');
  const [newCabin, setNewCabin] = useState('Room 301, Block A');
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Faculty Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRegistryItem | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDept, setEditDept] = useState('CSE');
  const [editDesignation, setEditDesignation] = useState('Assistant Professor');
  const [editCabin, setEditCabin] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Bulk Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [dryRunResult, setDryRunResult] = useState<BulkImportResult<FacultyImportRecord> | null>(null);
  const [importCommitSuccess, setImportCommitSuccess] = useState<string | null>(null);

  // Fetch Faculty
  const {
    data: facultyList,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-faculty', departmentCode, statusFilter, search],
    queryFn: () =>
      AdminService.getFaculty({
        departmentCode,
        status: statusFilter,
        search,
      }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof AdminService.createFaculty>[0]) =>
      AdminService.createFaculty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faculty'] });
      setIsCreateOpen(false);
      setNewFacultyId('');
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPhone('');
      setCreateError(null);
    },
    onError: (err: Error) => {
      setCreateError(err.message || 'Failed to enroll faculty.');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<FacultyRegistryItem> }) =>
      AdminService.updateFaculty(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faculty'] });
      setIsEditOpen(false);
      setEditingFaculty(null);
      setEditError(null);
    },
    onError: (err: Error) => {
      setEditError(err.message || 'Failed to update faculty member.');
    },
  });

  // Deactivate Mutation
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => AdminService.deactivateFaculty(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-faculty'] }),
  });

  // Reactivate Mutation
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => AdminService.reactivateFaculty(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-faculty'] }),
  });

  const handleOpenEdit = (fac: FacultyRegistryItem) => {
    setEditingFaculty(fac);
    setEditFirstName(fac.firstName);
    setEditLastName(fac.lastName);
    setEditEmail(fac.email);
    setEditPhone(fac.phone || '');
    setEditDept(fac.departmentCode);
    setEditDesignation(fac.designation);
    setEditCabin(fac.cabin || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaculty) return;
    updateMutation.mutate({
      id: editingFaculty.id,
      updates: {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
        departmentCode: editDept,
        designation: editDesignation,
        cabin: editCabin,
      },
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      facultyId: newFacultyId,
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      phone: newPhone,
      departmentCode: newDept,
      designation: newDesignation,
      cabin: newCabin,
    });
  };

  const handleRunFacultyDryRun = () => {
    if (!csvContent.trim()) return;
    const res = AdminService.validateFacultyBulkImport(csvContent);
    setDryRunResult(res);
    setImportCommitSuccess(null);
  };

  const handleCommitFaculty = async () => {
    if (!dryRunResult || dryRunResult.parsedRecords.length === 0) return;
    const res = await AdminService.commitFacultyBulkImport(dryRunResult.parsedRecords);
    queryClient.invalidateQueries({ queryKey: ['admin-faculty'] });
    setImportCommitSuccess(`Committed ${res.committedCount} faculty records.`);
    setDryRunResult(null);
    setCsvContent('');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !facultyList) {
    return (
      <ErrorState
        title="Failed to Load Faculty Registry"
        message="Could not load faculty directory."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Registry & Academic Workloads"
        description="Manage faculty appointments, departmental affiliations, teaching quotas, and soft-deactivations."
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
              <span>Enroll Faculty</span>
            </button>
          </div>
        }
      />

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, or cabin..."
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

      {/* FACULTY CARDS GRID */}
      {facultyList.length === 0 ? (
        <EmptyState
          title="No Faculty Found"
          description="No faculty records match the active search and department filters."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {facultyList.map((f) => (
            <div
              key={f.id}
              className={`p-5 rounded-2xl border bg-[var(--surface)] shadow-sm transition-all flex flex-col justify-between ${
                f.status === 'Inactive' ? 'border-[var(--border)] opacity-70' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                    {f.facultyId}
                  </span>
                  <StatusBadge status={f.status === 'Active' ? 'success' : 'neutral'} label={f.status} />
                </div>
                <h4 className="text-sm font-extrabold text-[var(--text)] tracking-tight mt-1">{f.fullName}</h4>
                <span className="text-xs font-bold text-[var(--accent)] block mt-0.5">
                  {f.designation} • {f.departmentCode}
                </span>

                <div className="mt-4 space-y-1.5 text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>{f.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>{f.cabin}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text)] tabular-nums">
                  {f.teachingLoadHours} hrs / week load
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(f)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-colors cursor-pointer"
                    title="Edit Faculty Record"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  {f.status === 'Active' ? (
                    <button
                      type="button"
                      onClick={() => deactivateMutation.mutate(f.id)}
                      className="px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => reactivateMutation.mutate(f.id)}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ENROLL FACULTY MODAL */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Enroll New Faculty Member"
        description="Register a new academic instructor with departmental affiliation."
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
                Faculty Employee ID *
              </label>
              <input
                type="text"
                required
                value={newFacultyId}
                onChange={(e) => setNewFacultyId(e.target.value)}
                placeholder="e.g. FAC-CS-005"
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
                placeholder="e.g. Pooja"
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
                placeholder="e.g. Iyer"
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
                placeholder="pooja.iyer@campusos.dev"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Designation
              </label>
              <input
                type="text"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Cabin / Office Location
            </label>
            <input
              type="text"
              value={newCabin}
              onChange={(e) => setNewCabin(e.target.value)}
              placeholder="e.g. Room 305, Academic Block A"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
            />
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
              {createMutation.isPending ? 'Enrolling...' : 'Enroll Faculty'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* EDIT FACULTY MODAL */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingFaculty(null);
        }}
        title={`Edit Faculty: ${editingFaculty?.facultyId || ''}`}
        description="Update faculty profile and teaching appointment details."
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
                Faculty Employee ID
              </label>
              <input
                type="text"
                disabled
                value={editingFaculty?.facultyId || ''}
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

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Designation *
            </label>
            <input
              type="text"
              required
              value={editDesignation}
              onChange={(e) => setEditDesignation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Cabin / Office Location
            </label>
            <input
              type="text"
              value={editCabin}
              onChange={(e) => setEditCabin(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setEditingFaculty(null);
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

      {/* FACULTY BULK IMPORT MODAL */}
      <Dialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Faculty Bulk Import (Dry Run)"
        description="Validate and ingest faculty records from CSV format."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {importCommitSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{importCommitSuccess}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Sample Data:</span>
            <button
              type="button"
              onClick={() => {
                setCsvContent(sampleFacultyValidCsv);
                setDryRunResult(null);
              }}
              className="text-xs font-bold text-[var(--accent)] hover:underline"
            >
              Paste Sample CSV
            </button>
          </div>

          <textarea
            rows={5}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="faculty_id,first_name,last_name,email,department_code,designation,cabin"
            className="w-full p-3 font-mono text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Dry run tests formatting before saving.</span>
            <button
              type="button"
              onClick={handleRunFacultyDryRun}
              disabled={!csvContent.trim()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Run Dry Run
            </button>
          </div>

          {dryRunResult && (
            <div className="pt-3 border-t border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Valid: {dryRunResult.validRows}</span>
                <span>Errors: {dryRunResult.invalidRows}</span>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={dryRunResult.validRows === 0}
                  onClick={handleCommitFaculty}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Commit Import ({dryRunResult.validRows})
                </button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
