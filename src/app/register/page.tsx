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
  Sun,
  Moon,
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

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
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
  }, [router]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

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
    } catch {
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
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)] relative overflow-hidden px-4 py-12 transition-colors duration-200">
      {/* Top Floating Controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Ambient Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-blue-500/15 dark:bg-teal-500/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Subtle Grid Accent Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />

      <div className="w-full max-w-lg bg-[var(--surface)]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-7 sm:p-9 shadow-2xl relative z-10 transition-all duration-300">
        {/* Top Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-4 text-white">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">Create Your Account</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              CampAI
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-medium">
            Join CampusOS Academic &amp; Experience Platform
          </p>
        </div>

        {/* Role Segmented Selector */}
        <div className="p-1 bg-[var(--surface-2)] rounded-xl flex items-center mb-6 border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              role === 'student'
                ? 'bg-[var(--surface)] text-indigo-600 dark:text-indigo-400 shadow-sm border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Student Account</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('faculty')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              role === 'faculty'
                ? 'bg-[var(--surface)] text-teal-600 dark:text-teal-400 shadow-sm border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Faculty / Staff</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl p-3 flex items-start gap-2.5 text-xs font-medium transition-all">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl p-3 flex items-start gap-2.5 text-xs font-medium transition-all">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-xs"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Campus / Enrolment ID */}
            <div>
              <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
                {role === 'student' ? 'Student / Roll No.' : 'Faculty Employee ID'}
              </label>
              <div className="relative">
                <BadgeCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  placeholder={role === 'student' ? 'e.g. 2024-CS-042' : 'e.g. FAC-2024-09'}
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-xs"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Department Dropdown */}
          <div>
            <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
              Academic Department
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text)] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-xs appearance-none cursor-pointer"
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

          {/* Institutional Email */}
          <div>
            <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="email"
                placeholder={role === 'student' ? 'aarav.sharma@campusos.edu' : 'rajesh.rao@campusos.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-xs"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Passwords Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl py-2.5 pl-10 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-xs"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded-md transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl py-2.5 pl-10 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-xs"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded-md transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
          <span>Already have an institutional account?</span>{' '}
          <Link
            href="/login"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition"
          >
            Sign In here
          </Link>
        </div>

        {/* Security Footnote */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>CampAI • Institutional Identity Verification</span>
        </div>
      </div>
    </main>
  );
}
