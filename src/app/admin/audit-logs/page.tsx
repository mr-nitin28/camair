'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  Search,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

interface AuditLog {
  id: string;
  user_email: string;
  role: string;
  action: string;
  affected_records: string | null;
  created_at: string;
}

export default function AuditTrailPage() {
  const { admin } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Audit Logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-audit-trail-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Filter logs
  const filteredLogs = logs?.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.user_email.toLowerCase().includes(q) ||
      l.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Audit Trail</h2>
        <p className="text-slate-550 text-xs mt-1 font-semibold">
          Complete institutional operating history. Track every single attendance audit, fee configuration, and student enrollment.
        </p>
      </div>

      {/* Grid wrapper */}
      <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-200/60 bg-white/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-455" />
            <input
              type="text"
              placeholder="Search audit trail by user, action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/40 border border-slate-200/60 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-850 placeholder-slate-450 focus:outline-none focus:border-indigo-500 transition font-bold"
            />
          </div>
        </div>

        {/* Roster table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-bold">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/30 border-b border-slate-200/60 text-slate-555 uppercase font-bold text-[9px] tracking-wider">
                  <th className="py-3 px-6">Operation Action Log</th>
                  <th className="py-3 px-4">Operator User</th>
                  <th className="py-3 px-4">User Role</th>
                  <th className="py-3 px-4">Affected Records</th>
                  <th className="py-3 px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/40 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-650 shrink-0" />
                        <span className="text-slate-900 font-extrabold">{log.action}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-850 font-bold font-sans">{log.user_email}</td>
                    <td className="py-3.5 px-4 uppercase tracking-wider text-[9.5px]">
                      <span className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-extrabold uppercase">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-500 font-bold">{log.affected_records || 'N/A'}</td>
                    <td className="py-3.5 px-6 text-right font-sans text-slate-500">
                      {new Date(log.created_at).toLocaleDateString()} at{' '}
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-bold">No audit logs recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
}
