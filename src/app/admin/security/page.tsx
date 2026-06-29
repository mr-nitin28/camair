'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  CheckCircle,
  Key,
} from 'lucide-react';
import Link from 'next/link';

interface PermissionRow {
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
}

export default function SecurityConsolePage() {
  const { admin } = useAppStore();
  const [selectedRole, setSelectedRole] = useState<string>('Super Admin');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Permission settings matrix
  const [matrix, setMatrix] = useState<Record<string, PermissionRow[]>>({
    'Super Admin': [
      { module: 'Students Registry', create: true, read: true, update: true, delete: true, approve: true },
      { module: 'Faculty Registry', create: true, read: true, update: true, delete: true, approve: true },
      { module: 'Grades & Results', create: true, read: true, update: true, delete: true, approve: true },
      { module: 'Financial Fees', create: true, read: true, update: true, delete: true, approve: true },
      { module: 'System Configurations', create: true, read: true, update: true, delete: true, approve: true },
    ],
    'Academic Admin': [
      { module: 'Students Registry', create: true, read: true, update: true, delete: false, approve: true },
      { module: 'Faculty Registry', create: false, read: true, update: false, delete: false, approve: false },
      { module: 'Grades & Results', create: true, read: true, update: true, delete: false, approve: false },
      { module: 'Financial Fees', create: false, read: true, update: false, delete: false, approve: false },
      { module: 'System Configurations', create: false, read: true, update: false, delete: false, approve: false },
    ],
    'Finance Admin': [
      { module: 'Students Registry', create: false, read: true, update: false, delete: false, approve: false },
      { module: 'Faculty Registry', create: false, read: true, update: false, delete: false, approve: false },
      { module: 'Grades & Results', create: false, read: true, update: false, delete: false, approve: false },
      { module: 'Financial Fees', create: true, read: true, update: true, delete: true, approve: true },
      { module: 'System Configurations', create: false, read: true, update: false, delete: false, approve: false },
    ],
  });

  const handleCheckboxChange = (moduleIndex: number, field: keyof Omit<PermissionRow, 'module'>) => {
    setMatrix((prev) => {
      const currentRoleRows = [...prev[selectedRole]];
      const targetRow = { ...currentRoleRows[moduleIndex] };
      targetRow[field] = !targetRow[field];
      currentRoleRows[moduleIndex] = targetRow as PermissionRow;
      return {
        ...prev,
        [selectedRole]: currentRoleRows,
      };
    });
  };

  const handleSaveChanges = async () => {
    // Log Action
    await supabase.from('audit_logs').insert({
      user_email: admin?.name || 'Admin',
      role: admin?.role || 'Super Admin',
      action: `Modified Security Console RBAC permission matrix for role: ${selectedRole}`,
      affected_records: `security: rbac`,
    });

    setSuccessMsg('Permissions policies successfully updated in RBAC cache.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Security Console</h2>
          <p className="text-slate-550 text-xs mt-1 font-semibold">
            Simulate granular Role-Based Access Controls (RBAC) and manage data accessibility parameters.
          </p>
        </div>

        <button
          onClick={handleSaveChanges}
          className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm transition self-start sm:self-auto"
        >
          Publish Permission matrix
        </button>
      </div>

      {/* Alert notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-200/40 text-emerald-800 text-xs flex items-center gap-2.5 rounded-xl font-extrabold">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-605 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Role selection card */}
        <div className="lg:col-span-1 bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 space-y-4 h-fit">
          <div className="border-b border-slate-200/60 pb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-650" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-sans">Access Roles</h3>
          </div>

          <div className="flex flex-col gap-1.5 font-semibold text-xs">
            {Object.keys(matrix).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`w-full py-2.5 px-3 rounded-lg text-left text-xs font-extrabold transition ${
                  selectedRole === role
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white/40 border border-slate-200/60 text-slate-700 hover:text-slate-900'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Matrix registry card */}
        <div className="lg:col-span-3 bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200/60 bg-white/20">
            <h4 className="text-[10px] font-extrabold text-slate-550 uppercase tracking-wider">
              Permission Policies for {selectedRole}
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/30 border-b border-slate-200/60 text-slate-555 uppercase font-bold text-[9px] tracking-wider">
                  <th className="py-3 px-6">Module Scope</th>
                  <th className="py-3 px-4 text-center">Create</th>
                  <th className="py-3 px-4 text-center">Read</th>
                  <th className="py-3 px-4 text-center">Update</th>
                  <th className="py-3 px-4 text-center">Delete</th>
                  <th className="py-3 px-4 text-center">Approve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                {matrix[selectedRole]?.map((row, idx) => (
                  <tr key={row.module} className="hover:bg-white/40 transition">
                    <td className="py-3.5 px-6 font-extrabold text-slate-900">{row.module}</td>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={row.create}
                        onChange={() => handleCheckboxChange(idx, 'create')}
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={row.read}
                        onChange={() => handleCheckboxChange(idx, 'read')}
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={row.update}
                        onChange={() => handleCheckboxChange(idx, 'update')}
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={row.delete}
                        onChange={() => handleCheckboxChange(idx, 'delete')}
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={row.approve}
                        onChange={() => handleCheckboxChange(idx, 'approve')}
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
