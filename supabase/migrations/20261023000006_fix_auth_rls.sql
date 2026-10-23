-- Migration: 20261023000006_fix_auth_rls.sql
-- Description: Fix GoTrue "Database error" by adding RLS bypass policies for supabase_auth_admin.
-- The supabase_auth_admin role (used by GoTrue) does NOT bypass RLS (rolbypassrls=false).
-- When GoTrue queries auth.users, FK constraints to public.user_profiles trigger RLS evaluation,
-- which fails because the policies only allow the 'authenticated' role.
-- Fix: Add permissive SELECT policies for supabase_auth_admin on affected tables.

-- Allow supabase_auth_admin to read user_profiles (needed for FK constraint checks on auth.users)
CREATE POLICY "supabase_auth_admin_read_user_profiles"
ON public.user_profiles FOR SELECT TO supabase_auth_admin
USING (true);

-- Allow supabase_auth_admin to read user_roles (needed by private.current_institution_id indirectly)
CREATE POLICY "supabase_auth_admin_read_user_roles"
ON public.user_roles FOR SELECT TO supabase_auth_admin
USING (true);
