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
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoFacultyLoading, setDemoFacultyLoading] = useState(false);
  const [demoAdminLoading, setDemoAdminLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }

    // Prefetch all portals for instant navigation
    router.prefetch('/dashboard');
    router.prefetch('/faculty');
    router.prefetch('/admin');
    router.prefetch('/register');

    const role = typeof window !== 'undefined' ? localStorage.getItem('mock_user_role') : null;
    if (role) {
      if (role === 'faculty') {
        router.push('/faculty');
      } else if (role === 'admin') {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && data?.user) {
        // Fetch role from user_roles
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        const role = (roleRow as { role?: string } | null)?.role;
        if (role === 'Faculty') {
          localStorage.setItem('mock_user_role', 'faculty');
          router.push('/faculty');
          return;
        } else if (role === 'Student') {
          localStorage.setItem('mock_user_role', 'student');
          router.push('/dashboard');
          return;
        } else {
          localStorage.setItem('mock_user_role', 'admin');
          router.push('/admin');
          return;
        }
      }

      if (authError) {
        // Fallback for offline demo credentials
        if (email === 'student@campusos.dev' && password === 'password123') {
          localStorage.setItem('mock_user_role', 'student');
          router.push('/dashboard');
          return;
        } else if (email === 'faculty@campusos.dev' && password === 'password123') {
          localStorage.setItem('mock_user_role', 'faculty');
          router.push('/faculty');
          return;
        } else if (email === 'admin@campusos.dev' && password === 'password123') {
          localStorage.setItem('mock_user_role', 'admin');
          router.push('/admin');
          return;
        }

        setError(authError.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      // Offline fallback
      if (email === 'student@campusos.dev' && password === 'password123') {
        localStorage.setItem('mock_user_role', 'student');
        router.push('/dashboard');
      } else if (email === 'faculty@campusos.dev' && password === 'password123') {
        localStorage.setItem('mock_user_role', 'faculty');
        router.push('/faculty');
      } else if (email === 'admin@campusos.dev' && password === 'password123') {
        localStorage.setItem('mock_user_role', 'admin');
        router.push('/admin');
      } else {
        setError(err.message || 'Network error occurred during login.');
        setLoading(false);
      }
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setDemoLoading(true);
    localStorage.setItem('mock_user_role', 'student');
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: 'student@campusos.dev',
        password: 'password123',
      });
    } catch {
      // Ignored for demo offline
    }
    router.push('/dashboard');
  };

  const handleDemoFacultyLogin = async () => {
    setError(null);
    setDemoFacultyLoading(true);
    localStorage.setItem('mock_user_role', 'faculty');
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: 'faculty@campusos.dev',
        password: 'password123',
      });
    } catch {
      // Ignored for demo offline
    }
    router.push('/faculty');
  };

  const handleDemoAdminLogin = async () => {
    setError(null);
    setDemoAdminLoading(true);
    localStorage.setItem('mock_user_role', 'admin');
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: 'admin@campusos.dev',
        password: 'password123',
      });
    } catch {
      // Ignored for demo offline
    }
    router.push('/admin');
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

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md bg-[var(--surface)]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-7 sm:p-9 shadow-2xl relative z-10 transition-all duration-300">
        {/* Top Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-4 text-white">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">CampAI</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              CampusOS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-medium">
            Unified Campus Operating System
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl p-3 flex items-start gap-2.5 text-xs font-medium transition-all">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
              Email / Campus ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="email"
                placeholder="student@campusos.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-xs"
                disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-xl py-2.5 pl-10 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all shadow-xs"
                disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded-md transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 w-full border-t border-[var(--border)]" />
          <span className="relative z-10 px-3 bg-[var(--surface)] text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
            Evaluation Access
          </span>
        </div>

        {/* Quick Demo Access Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-[var(--surface-2)]/80 hover:bg-indigo-500/15 border border-[var(--border)] hover:border-indigo-500/30 text-[var(--text)] hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {demoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <>
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Student</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoFacultyLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-[var(--surface-2)]/80 hover:bg-teal-500/15 border border-[var(--border)] hover:border-teal-500/30 text-[var(--text)] hover:text-teal-600 dark:hover:text-teal-400 font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {demoFacultyLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
            ) : (
              <>
                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Faculty</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoAdminLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-[var(--surface-2)]/80 hover:bg-purple-500/15 border border-[var(--border)] hover:border-purple-500/30 text-[var(--text)] hover:text-purple-600 dark:hover:text-purple-400 font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {demoAdminLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
            ) : (
              <>
                <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Admin</span>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)] mt-5">
          One-click evaluation using seeded student, faculty, or administrator credentials.
        </p>

        {/* Register Navigation Row */}
        <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
          <span>Don&apos;t have an account?</span>{' '}
          <Link
            href="/register"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition"
          >
            Create an account
          </Link>
        </div>

        {/* Security Footnote */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>CampAI • Institutional Role-Based Access Control</span>
        </div>
      </div>
    </main>
  );
}
