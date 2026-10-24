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

  // Ensure clean light mode and prefetch portals
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    if (wasDark) {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
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

    return () => {
      // Restore dark theme if previously chosen by user when leaving auth page
      if (typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      }
    };
  }, [router]);

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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 text-slate-900 relative overflow-hidden px-4 py-12">
      {/* Ambient Classic Light Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />

      {/* Subtle Grid Accent Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f033_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f033_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 relative z-10 transition-all duration-300">
        {/* Top Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-4 text-white">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CampusOS</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Unified Campus Operating System
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 flex items-start gap-2.5 text-xs font-medium transition-all">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email / Campus ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="student@campusos.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-xs"
                disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-xs"
                disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
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

          <button
            type="submit"
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 w-full border-t border-slate-200" />
          <span className="relative z-10 px-3 bg-white text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
            Evaluation Access
          </span>
        </div>

        {/* Quick Demo Access Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-slate-50/80 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 font-semibold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {demoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <>
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Student
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoFacultyLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-slate-50/80 hover:bg-teal-50/80 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-700 font-semibold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {demoFacultyLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
            ) : (
              <>
                <User className="w-4 h-4 text-teal-600" />
                Faculty
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoAdminLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-slate-50/80 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold text-xs rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {demoAdminLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
            ) : (
              <>
                <Building2 className="w-4 h-4 text-slate-600" />
                Admin
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-5">
          One-click evaluation using seeded student, faculty, or administrator credentials.
        </p>

        {/* Register Navigation Row */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
          <span>Don&apos;t have an account?</span>{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition"
          >
            Create an account
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

