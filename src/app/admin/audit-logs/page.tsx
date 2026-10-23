'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AdminService,
  type AuditEventRecord,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  History,
  Search,
  Filter,
  Download,
  Code,
  Shield,
  Clock,
  ArrowRight,
  User,
} from 'lucide-react';

export default function AuditTrailPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');

  // Selected event for inspecting before/after JSON diff
  const [selectedEvent, setSelectedEvent] = useState<AuditEventRecord | null>(null);

  const {
    data: logs,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-audit-events', actionFilter, tableFilter, search],
    queryFn: () =>
      AdminService.getAuditEvents({
        action: actionFilter,
        entityTable: tableFilter,
        search,
      }),
  });

  const handleExportJson = () => {
    if (!logs) return;
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !logs) {
    return (
      <ErrorState
        title="Failed to Load Audit Trail"
        message="Could not load forensic audit log entries."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Audit Trail & Forensic Logs"
        description="Forensic ledger tracking every entity insertion, modification, fee transaction, and role change with state diffs."
        actions={
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <span>Export Audit JSON</span>
          </button>
        }
      />

      {/* FILTER CONTROLS */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entity, actor, or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold"
          >
            <option value="all">All Actions</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="PUBLISH">PUBLISH</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="BULK_IMPORT">BULK_IMPORT</option>
            <option value="SETTINGS_CHANGE">SETTINGS_CHANGE</option>
          </select>

          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold"
          >
            <option value="all">All Target Tables</option>
            <option value="students">students</option>
            <option value="faculty">faculty</option>
            <option value="departments">departments</option>
            <option value="assessments">assessments</option>
            <option value="fee_structures">fee_structures</option>
            <option value="approvals">approvals</option>
            <option value="role_permissions">role_permissions</option>
            <option value="system_settings">system_settings</option>
          </select>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      {logs.length === 0 ? (
        <EmptyState
          title="No Audit Entries Found"
          description="No forensic records match your search criteria."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity & Target</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((evt) => (
                <tr key={evt.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} •{' '}
                    {new Date(evt.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        evt.action === 'PUBLISH' || evt.action === 'APPROVE'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : evt.action === 'INSERT' || evt.action === 'BULK_IMPORT'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                          : evt.action === 'DELETE' || evt.action === 'REJECT'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {evt.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[var(--text)]">
                    <span className="font-mono text-[11px] text-[var(--accent)] font-bold mr-1.5">
                      {evt.entityTable}:
                    </span>
                    <span className="font-mono text-xs">{evt.entityId}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-[var(--text)] block">{evt.actorEmail}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{evt.actorRole}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                    {evt.ipAddress}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(evt)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] transition-colors cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Inspect Diff</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* STATE DIFF INSPECTION MODAL */}
      {selectedEvent && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={`Forensic Diff: ${selectedEvent.action} on ${selectedEvent.entityTable}`}
          description={`Committed by ${selectedEvent.actorEmail} at ${new Date(selectedEvent.timestamp).toLocaleString()}`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="font-bold uppercase text-[10px] text-[var(--text-muted)] block mb-1">
                  Actor Information
                </span>
                <span className="font-bold text-[var(--text)] block">{selectedEvent.actorEmail}</span>
                <span className="text-[11px] text-[var(--text-muted)]">{selectedEvent.actorRole} • IP: {selectedEvent.ipAddress}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="font-bold uppercase text-[10px] text-[var(--text-muted)] block mb-1">
                  Target Entity
                </span>
                <span className="font-mono font-bold text-[var(--text)] block">{selectedEvent.entityTable}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">ID: {selectedEvent.entityId}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* BEFORE STATE */}
              <div>
                <span className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                  Before State
                </span>
                <pre className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] font-mono text-[11px] text-[var(--text)] overflow-x-auto max-h-60 custom-scrollbar">
                  {selectedEvent.beforeState
                    ? JSON.stringify(selectedEvent.beforeState, null, 2)
                    : '// null (New record created)'}
                </pre>
              </div>

              {/* AFTER STATE */}
              <div>
                <span className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                  After State
                </span>
                <pre className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] font-mono text-[11px] text-[var(--text)] overflow-x-auto max-h-60 custom-scrollbar">
                  {selectedEvent.afterState
                    ? JSON.stringify(selectedEvent.afterState, null, 2)
                    : '// null (Record deleted)'}
                </pre>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              >
                Close Diff
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
