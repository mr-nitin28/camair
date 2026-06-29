'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Lock,
  Building,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultySettingsPage() {
  const { faculty, setFaculty } = useAppStore();

  // Contact Info form state
  const [phone, setPhone] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Password Reset form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Set default form values
  useEffect(() => {
    if (faculty) {
      setPhone(faculty.phone || '');
    }
  }, [faculty]);

  // Update Contact Info Mutation
  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!faculty) return;
      const { error } = await supabase
        .from('faculty')
        .update({ phone: phone.trim() })
        .eq('id', faculty.id);

      if (error) throw error;
    },
    onSuccess: () => {
      setContactSuccess(true);
      setTimeout(() => setContactSuccess(false), 3000);
      setContactError(null);
      // Sync local store
      if (faculty) {
        setFaculty({
          ...faculty,
          phone: phone.trim(),
        });
      }
    },
    onError: (err: any) => {
      setContactError(err?.message || 'Failed to update contact information.');
    },
  });

  // Update Password Mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 3000);
      setPwdError(null);
      setPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      setPwdError(err?.message || 'Failed to update credentials.');
    },
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    updateContactMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    updatePasswordMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/faculty"
          className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Account Settings</h2>
        <p className="text-slate-500 text-xs mt-1">
          Manage your contact credentials and security authentication tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Faculty Info dossier card */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-blue-950 border border-blue-700/50 flex items-center justify-center text-blue-300 text-3xl font-extrabold uppercase shadow-sm">
            {faculty ? `${faculty.first_name[0]}${faculty.last_name[0]}` : 'JD'}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Dr. {faculty?.first_name} {faculty?.last_name}
            </h3>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{faculty?.faculty_id}</span>
          </div>

          <div className="w-full border-t border-slate-100 pt-4 space-y-3.5 text-left text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{faculty?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{faculty?.departments?.name || 'Computer Science Department'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Account Forms */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Contact Details update */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-950 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Phone className="w-4.5 h-4.5 text-blue-600" />
              Contact Information
            </h3>

            <form onSubmit={handleContactSubmit} className="space-y-4 mt-4">
              {contactSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Contact info updated successfully.</span>
                </div>
              )}
              {contactError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{contactError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Registered Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updateContactMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition disabled:opacity-50"
                >
                  {updateContactMutation.isPending ? 'Updating...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Credentials Password reset */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-950 border-b border-slate-100 pb-3 flex items-center gap-2">
              <KeyRound className="w-4.5 h-4.5 text-blue-600" />
              Update Account Password
            </h3>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-4">
              {pwdSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Password changed successfully.</span>
                </div>
              )}
              {pwdError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition disabled:opacity-50"
                >
                  {updatePasswordMutation.isPending ? 'Updating...' : 'Change Credentials'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
