'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Building,
  Calendar,
  Award,
} from 'lucide-react';
import Link from 'next/link';

interface SystemSetting {
  key: string;
  value: any;
}

export default function SystemSettingsPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  // General Settings states
  const [instName, setInstName] = useState('CampusOS University');
  const [instCode, setInstCode] = useState('COS_UNIV');
  const [contactEmail, setContactEmail] = useState('admin@campusos.dev');

  // Academic Calendar dates
  const [semStart, setSemStart] = useState('2026-06-01');
  const [semEnd, setSemEnd] = useState('2026-12-15');

  // Alert updates status
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Settings
  const { data: settings } = useQuery({
    queryKey: ['admin-system-settings-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      return data as SystemSetting[];
    },
  });

  // Sync state values on load
  useEffect(() => {
    if (settings) {
      const inst = settings.find((s) => s.key === 'institution_details');
      if (inst) {
        setInstName(inst.value.name || 'CampusOS University');
        setInstCode(inst.value.code || 'COS_UNIV');
        setContactEmail(inst.value.email || 'admin@campusos.dev');
      }

      const dates = settings.find((s) => s.key === 'semester_dates');
      if (dates) {
        setSemStart(dates.value.start || '2026-06-01');
        setSemEnd(dates.value.end || '2026-12-15');
      }
    }
  }, [settings]);

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const payloads = [
        {
          key: 'institution_details',
          value: { name: instName.trim(), code: instCode.trim(), email: contactEmail.trim() },
          updated_at: new Date().toISOString(),
        },
        {
          key: 'semester_dates',
          value: { start: semStart, end: semEnd },
          updated_at: new Date().toISOString(),
        },
      ];

      const { error } = await supabase.from('system_settings').upsert(payloads);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Updated global system configurations & settings`,
        affected_records: `system_settings: updated`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings-list'] });
      setSuccessMsg('Configurations successfully updated.');
      setTimeout(() => setSuccessMsg(null), 3000);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to update configurations.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">System Settings</h2>
        <p className="text-slate-550 text-xs mt-1 font-semibold">
          Configure general institution metadata branding, calendar session terms, and grading thresholds.
        </p>
      </div>

      {/* Main Settings panel */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-200/40 text-emerald-800 text-xs flex items-center gap-2.5 rounded-xl font-extrabold">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-200/40 text-red-800 text-xs flex items-center gap-2.5 rounded-xl font-extrabold">
            <AlertTriangle className="w-4.5 h-4.5 text-red-655 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Institution Details */}
        <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200/60 pb-3 mb-4 flex items-center gap-2 font-sans">
            <Building className="w-4.5 h-4.5 text-indigo-650" /> Institution Identity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">University Name</label>
              <input
                type="text"
                required
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
            <div>
              <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">University ID Code</label>
              <input
                type="text"
                required
                value={instCode}
                onChange={(e) => setInstCode(e.target.value)}
                className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
            <div>
              <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Contact Help Email</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
          </div>
        </div>

        {/* Academic Calendar Term */}
        <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200/60 pb-3 mb-4 flex items-center gap-2 font-sans">
            <Calendar className="w-4.5 h-4.5 text-indigo-650" /> Academic Term Calendars
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Semester Term Start</label>
              <input
                type="date"
                required
                value={semStart}
                onChange={(e) => setSemStart(e.target.value)}
                className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
            <div>
              <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Semester Term End</label>
              <input
                type="date"
                required
                value={semEnd}
                onChange={(e) => setSemEnd(e.target.value)}
                className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
              />
            </div>
          </div>
        </div>

        {/* Grading Scale Guide */}
        <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200/60 pb-3 mb-4 flex items-center gap-2 font-sans">
            <Award className="w-4.5 h-4.5 text-indigo-655" /> Grading Threshold Matrix
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
            <div className="p-3.5 bg-white/40 border border-slate-200/60 rounded-xl shadow-sm">
              <span className="block font-extrabold text-slate-900">Grade O (Outstanding)</span>
              <span className="text-[10px] text-slate-500 mt-1 block font-bold">Marks Range: 90% - 100%</span>
            </div>
            <div className="p-3.5 bg-white/40 border border-slate-200/60 rounded-xl shadow-sm">
              <span className="block font-extrabold text-slate-900">Grade A+ (Excellent)</span>
              <span className="text-[10px] text-slate-500 mt-1 block font-bold">Marks Range: 80% - 89%</span>
            </div>
            <div className="p-3.5 bg-white/40 border border-slate-200/60 rounded-xl shadow-sm">
              <span className="block font-extrabold text-slate-900">Grade A (Very Good)</span>
              <span className="text-[10px] text-slate-500 mt-1 block font-bold">Marks Range: 70% - 79%</span>
            </div>
            <div className="p-3.5 bg-white/40 border border-slate-200/60 rounded-xl shadow-sm">
              <span className="block font-extrabold text-slate-900">Grade B+ (Good)</span>
              <span className="text-[10px] text-slate-500 mt-1 block font-bold">Marks Range: 60% - 69%</span>
            </div>
          </div>
        </div>

        {/* Form action */}
        <div className="flex justify-end gap-3 pt-3">
          <button
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {updateSettingsMutation.isPending ? 'Publishing...' : 'Save Configuration Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
