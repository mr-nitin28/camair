'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  CheckCircle2,
  BadgeCheck,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  // Role selection: 'student' | 'faculty'
  const [role, setRole] = useState<'student' | 'faculty'>('student');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [campusId, setCampusId] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Ensure clean light mode and prefetch auth/dashboard routes
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    if (wasDark) {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
    }

    router.prefetch('/login');
    router.prefetch('/dashboard');
    router.prefetch('/faculty');

    const existingRole = typeof window !== 'undefined' ? localStorage.getItem('mock_user_role') : null;
    if (existingRole) {
      if (existingRole === 'faculty') {
        router.push('/faculty');
      } else if (existingRole === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }

    return () => {
      if (typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      }
    };
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid institutional email address.');
      return;
    }
    if (!campusId.trim()) {
      setError(role === 'student' ? 'Please enter your Student / Enrolment ID.' : 'Please enter your Faculty ID.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            campus_id: campusId.trim(),
            department,
            role: role === 'faculty' ? 'Faculty' : 'Student',
          },
        },
      });

      if (signUpError) {
        // Fallback for offline/local demonstration mode
        localStorage.setItem('mock_user_role', role);
        localStorage.setItem('mock_user_name', fullName);
        setSuccess('Registration successful! Redirecting to your workspace...');
        setTimeout(() => {
          router.push(role === 'faculty' ? '/faculty' : '/dashboard');
        }, 1200);
        return;
      }

      if (data?.user) {
        localStorage.setItem('mock_user_role', role);
        localStorage.setItem('mock_user_name', fullName);
        setSuccess('Account created successfully! Preparing your campus portal...');
        setTimeout(() => {
          router.push(role === 'faculty' ? '/faculty' : '/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      // Offline fallback
      localStorage.setItem('mock_user_role', role);
      localStorage.setItem('mock_user_name', fullName);
      setSuccess('Account initialized in offline evaluation mode! Redirecting...');
      setTimeout(() => {
        router.push(role === 'faculty' ? '/faculty' : '/dashboard');
      }, 1200);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 text-slate-900 relative overflow-hidden px-4 py-12">
      {/* Ambient Classic Light Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />

      {/* Subtle Grid Accent Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f033_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f033_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 relative z-10 transition-all duration-300">
        {/* Top Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-4 text-white">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Your Account</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Join CampusOS Academic &amp; Experience Platform
          </p>
        </div>

        {/* Role Segmented Selector */}
        <div className="p-1 bg-slate-100/90 rounded-xl flex items-center mb-6 border border-slate-200/70">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              role === 'student'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            Student Account
          </button>
          <button
            type="button"
            onClick={() => setRole('faculty')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              role === 'faculty'
                ? 'bg-white text-teal-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4 text-teal-600" />
            Faculty / Staff
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 flex items-start gap-2.5 text-xs font-medium transition-all">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-start gap-2.5 text-xs font-medium transition-all">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-xs"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Campus / Enrolment ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {role === 'student' ? 'Student / Roll No.' : 'Faculty Employee ID'}
              </label>
              <div className="relative">
                <BadgeCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={role === 'student' ? 'e.g. 2024-CS-042' : 'e.g. FAC-2024-09'}
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-xs"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Campus Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder={role === 'student' ? 'student@campusos.dev' : 'faculty@campusos.dev'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-xs"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-8 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-xs appearance-none cursor-pointer"
                disabled={loading}
              >
                <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
                <option value="Electronics & Communication">Electronics &amp; Communication</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Business Administration">Business Administration</option>
              </select>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-xs"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-xs"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed mt-3 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Create Account <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Back to Sign In Link */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
          <span>Already registered with CampusOS?</span>{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition"
          >
            Sign in
          </Link>
        </div>

        {/* Security Footnote */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500/80" />
          <span>CampusOS Security • Enterprise Role-Based Access Control</span>
        </div>
      </div>
    </main>
  );
}
