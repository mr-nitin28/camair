'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type RolePermissionMatrix,
  type PermissionDiff,
  type ModuleAction,
  type ModulePermissionSet,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  Key,
  Save,
  RotateCcw,
  Check,
} from 'lucide-react';

const moduleDescriptions: Record<string, string> = {
  Academics: 'Curricula, departments, course syllabi, and semester definitions',
  Students: 'Student enrollment profiles, sections, and transcripts',
  Faculty: 'Faculty records, employee designations, and teaching workloads',
  Finance: 'Fee structures, student ledgers, scholarship waivers, and payment receipts',
  Examinations: 'Grading scale rules, assessment marks review, and portal publication',
  Communications: 'Official announcements and emergency broadcast alerts',
  Governance: 'RBAC policies, audit logs inspection, and system settings',
};

export default function SecurityConsolePage() {
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<string>('Academic Admin');
  const [matrixDraft, setMatrixDraft] = useState<RolePermissionMatrix | null>(null);
  const [originalMatrix, setOriginalMatrix] = useState<RolePermissionMatrix | null>(null);

  // Visual Diff Modal
  const [diffModal, setDiffModal] = useState<PermissionDiff | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Fetch Role Permissions
  const {
    data: fetchedMatrix,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-role-permissions'],
    queryFn: () => AdminService.getRolePermissions(),
  });

  useEffect(() => {
    if (fetchedMatrix) {
      setMatrixDraft(JSON.parse(JSON.stringify(fetchedMatrix)));
      setOriginalMatrix(JSON.parse(JSON.stringify(fetchedMatrix)));
    }
  }, [fetchedMatrix]);

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ role, perms }: { role: string; perms: Record<string, ModulePermissionSet> }) =>
      AdminService.updateRolePermissions(role, perms),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-permissions'] });
      setOriginalMatrix(JSON.parse(JSON.stringify(matrixDraft)));
      setDiffModal(null);
      setSaveSuccessMsg(`Security policy updated for role "${selectedRole}". Audit event recorded.`);
    },
  });

  const handleTogglePermission = (moduleName: string, action: ModuleAction) => {
    if (!matrixDraft) return;
    const current = matrixDraft[selectedRole]?.[moduleName]?.[action] ?? false;

    setMatrixDraft((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[selectedRole]) copy[selectedRole] = {};
      if (!copy[selectedRole][moduleName]) {
        copy[selectedRole][moduleName] = { create: false, read: false, update: false, delete: false, approve: false };
      }
      copy[selectedRole][moduleName][action] = !current;
      return copy;
    });
  };

  const handleOpenDiffModal = () => {
    if (!originalMatrix || !matrixDraft) return;
    const diff = AdminService.calculatePermissionDiff(originalMatrix, matrixDraft, selectedRole);
    setDiffModal(diff);
  };

  const handleResetDraft = () => {
    if (originalMatrix) {
      setMatrixDraft(JSON.parse(JSON.stringify(originalMatrix)));
    }
  };

  if (isLoading || !matrixDraft) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-80 rounded-xl" />
        <div className="h-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Security Matrix"
        message="Could not load role permissions policy."
        onRetry={() => refetch()}
      />
    );
  }

  const currentRolePerms = matrixDraft[selectedRole] || {};
  const modulesList = Object.keys(currentRolePerms);

  // Check if draft has unsaved changes for this role
  const diffForBadge = originalMatrix
    ? AdminService.calculatePermissionDiff(originalMatrix, matrixDraft, selectedRole)
    : null;
  const hasChanges = (diffForBadge?.addedPermissions.length || 0) + (diffForBadge?.removedPermissions.length || 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role & Permission Governance Console"
        description="Granular RBAC policy matrix editor with pre-commit visual diff inspection and forensic logging."
        actions={
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                type="button"
                onClick={handleResetDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert Changes</span>
              </button>
            )}
            <button
              type="button"
              disabled={!hasChanges}
              onClick={handleOpenDiffModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Review Visual Diff & Save</span>
            </button>
          </div>
        }
      />

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-[10px] uppercase font-extrabold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ROLE SELECTION TABS */}
      <div className="p-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {Object.keys(matrixDraft).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedRole === role
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <span>{role}</span>
          </button>
        ))}
      </div>

      {/* PERMISSIONS MATRIX TABLE */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
              <th className="py-3 px-4 w-1/3">System Module</th>
              <th className="py-3 px-4 text-center">CREATE</th>
              <th className="py-3 px-4 text-center">READ</th>
              <th className="py-3 px-4 text-center">UPDATE</th>
              <th className="py-3 px-4 text-center">DELETE</th>
              <th className="py-3 px-4 text-center">APPROVE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {modulesList.map((mod) => {
              const perms = currentRolePerms[mod] || { create: false, read: false, update: false, delete: false, approve: false };
              return (
                <tr key={mod} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-[var(--text)] text-sm block">{mod}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{moduleDescriptions[mod]}</span>
                  </td>

                  {(['create', 'read', 'update', 'delete', 'approve'] as ModuleAction[]).map((action) => {
                    const isGranted = perms[action];
                    return (
                      <td key={action} className="py-3.5 px-4 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer p-1 rounded-lg hover:bg-[var(--surface-3)]">
                          <input
                            type="checkbox"
                            checked={isGranted}
                            onChange={() => handleTogglePermission(mod, action)}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VISUAL DIFF CONFIRMATION MODAL */}
      {diffModal && (
        <Dialog
          isOpen={true}
          onClose={() => setDiffModal(null)}
          title={`Visual Diff: Confirm Security Changes for "${selectedRole}"`}
          description="Review exact added and removed permissions before committing to the institutional policy matrix."
          className="max-w-xl"
        >
          <div className="space-y-4">
            {diffModal.addedPermissions.length === 0 && diffModal.removedPermissions.length === 0 ? (
              <div className="p-4 rounded-xl bg-[var(--surface-2)] text-xs text-[var(--text-muted)] text-center">
                No policy modifications detected.
              </div>
            ) : (
              <div className="space-y-3">
                {/* ADDED PERMISSIONS */}
                {diffModal.addedPermissions.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                    <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <PlusCircle className="w-4 h-4 text-emerald-600" />
                      <span>Added Permissions ({diffModal.addedPermissions.length}):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {diffModal.addedPermissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 text-xs font-mono font-bold"
                        >
                          +{perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* REMOVED PERMISSIONS */}
                {diffModal.removedPermissions.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20">
                    <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <MinusCircle className="w-4 h-4 text-rose-600" />
                      <span>Revoked Permissions ({diffModal.removedPermissions.length}):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {diffModal.removedPermissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 text-xs font-mono font-bold"
                        >
                          -{perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-[var(--text-muted)] font-medium">
                  {diffModal.unchangedCount} permissions remain unchanged.
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setDiffModal(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    role: selectedRole,
                    perms: matrixDraft[selectedRole],
                  })
                }
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Committing...' : 'Commit Policy Changes'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
