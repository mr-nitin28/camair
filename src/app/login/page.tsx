'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Mail, Lock, ArrowRight, AlertCircle, Loader2, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoFacultyLoading, setDemoFacultyLoading] = useState(false);
  const [demoAdminLoading, setDemoAdminLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already logged in, redirect to dashboard, faculty portal, or admin portal
  useEffect(() => {
    // Prefetch all portals for instant navigation
    router.prefetch('/dashboard');
    router.prefetch('/faculty');
    router.prefetch('/admin');

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    // Instant routing for demo credentials
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
      setError('Invalid credentials. Use the demo buttons below.');
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setError(null);
    setDemoLoading(true);
    localStorage.setItem('mock_user_role', 'student');
    router.push('/dashboard');
  };

  const handleDemoFacultyLogin = () => {
    setError(null);
    setDemoFacultyLoading(true);
    localStorage.setItem('mock_user_role', 'faculty');
    router.push('/faculty');
  };

  const handleDemoAdminLogin = () => {
    setError(null);
    setDemoAdminLoading(true);
    localStorage.setItem('mock_user_role', 'admin');
    router.push('/admin');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden px-4">
      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10"
      >
        {/* Top Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">CampusOS</h1>
          <p className="text-sm text-slate-400 mt-1">Unified Campus OS</p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-red-950/50 border border-red-800/60 text-red-200 rounded-lg p-3 flex items-start gap-2 text-sm"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Email / Campus ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="student@campusos.dev / faculty@campusos.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                disabled={loading || demoLoading || demoFacultyLoading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm rounded-lg py-2.5 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
          <div className="absolute inset-0 w-full border-t border-slate-800" />
          <span className="relative z-10 px-3 bg-slate-900/60 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Evaluation Access
          </span>
        </div>

        {/* Quick Demo Access Grid */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-slate-950 border border-indigo-500/20 hover:border-indigo-500 hover:bg-slate-900 active:bg-slate-950 text-indigo-400 hover:text-indigo-300 font-medium text-xs rounded-lg py-2.5 flex items-center justify-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
          >
            {demoLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <GraduationCap className="w-4.5 h-4.5" />
                Student
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoFacultyLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-slate-950 border border-blue-500/20 hover:border-blue-500 hover:bg-slate-900 active:bg-slate-950 text-blue-400 hover:text-blue-300 font-medium text-xs rounded-lg py-2.5 flex items-center justify-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
          >
            {demoFacultyLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <User className="w-4.5 h-4.5" />
                Faculty
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoAdminLogin}
            disabled={loading || demoLoading || demoFacultyLoading || demoAdminLoading}
            className="w-full bg-slate-950 border border-slate-700/25 hover:border-slate-500 hover:bg-slate-900 active:bg-slate-950 text-slate-400 hover:text-slate-200 font-medium text-xs rounded-lg py-2.5 flex items-center justify-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
          >
            {demoAdminLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <User className="w-4.5 h-4.5 text-slate-400" />
                Admin
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-500 mt-6">
          Use the demo buttons to sign in with seeded student, faculty, or admin credentials.
        </p>
      </motion.div>
    </main>
  );
}
