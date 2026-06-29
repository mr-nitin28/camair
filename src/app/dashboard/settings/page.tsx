'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Mail,
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { student, setStudent } = useAppStore();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync state with store values once loaded
  useEffect(() => {
    if (student) {
      setPhone(student.phone || '+91 98765 43210');
      setAddress(student.address || 'Room 304, Hostel C, Campus Town');
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    setTimeout(() => {
      if (student) {
        setStudent({
          ...student,
          phone,
          address,
        });
      }
      setSaveSuccess(true);
      setSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);
      setSaveError(null);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Profile & System Settings</h2>
        <p className="text-slate-600 text-xs mt-1">Manage your contact information and view verified registration profiles.</p>
      </div>

      {/* Success/Error Banners */}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs rounded-xl p-4 flex items-center gap-2">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-450 shrink-0" />
          <span>Profile changes saved successfully and synced globally!</span>
        </div>
      )}
      {saveError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs rounded-xl p-4 flex items-center gap-2">
          <XCircle className="w-4.5 h-4.5 text-rose-455 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Layout Grid: Editable Form vs Read Only Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Contact Edit Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <User className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Personal Details</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  First Name (Read Only)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={student?.first_name || 'Aarav'}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none cursor-not-allowed font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Last Name (Read Only)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={student?.last_name || 'Sharma'}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none cursor-not-allowed font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                Academic Email (Read Only)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={student?.email || 'aarav.sharma@campusos.edu'}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl py-2.5 pl-9 pr-3 text-xs focus:outline-none cursor-not-allowed font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-205 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 transition font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Hostel / Correspondence Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Room 304, Hostel C, Campus Town"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white border border-slate-205 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 transition font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-755 text-white px-4 py-2.5 text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-500/15 flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  'Save Profile Details'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Read Only Registrar details */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-slate-700">
            <Shield className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Verified Registration</h3>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            <div>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase block font-mono">Student ID</span>
              <span className="text-slate-800 font-mono font-bold mt-1.5 block">{student?.student_id || 'STU-2023-0042'}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase block font-mono">Registered Department</span>
              <span className="text-slate-800 font-bold mt-1.5 block">{student?.departments?.name || 'Computer Science & Engineering'}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase block font-mono">Registered Course</span>
              <span className="text-slate-800 font-bold mt-1.5 block">{student?.courses?.name || 'B.Tech - Computer Science'}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase block font-mono">Date of Admission</span>
              <span className="text-slate-800 font-bold mt-1.5 block">
                {student?.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'Aug 1, 2023'}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase block font-mono">Current GPA status</span>
              <span className="text-slate-800 font-bold mt-1.5 block">CGPA: {student?.cgpa || '8.72'} • SGPA: {student?.sgpa || '8.94'}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
