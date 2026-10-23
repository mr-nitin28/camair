-- Migration: fix_auth_admin_grants
-- Description: Grant supabase_auth_admin necessary permissions to resolve 
-- "Database error" issues when GoTrue queries auth.users.
-- The private schema functions used in RLS policies need to be accessible
-- to the supabase_auth_admin role when GoTrue performs user lookups.

-- Grant usage on private schema to supabase_auth_admin 
GRANT USAGE ON SCHEMA private TO supabase_auth_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO supabase_auth_admin;

-- Also ensure supabase_auth_admin can read user_profiles (needed by private.current_institution_id)
GRANT SELECT ON public.user_profiles TO supabase_auth_admin;
GRANT SELECT ON public.user_roles TO supabase_auth_admin;

-- Ensure service_role can bypass RLS (already default, but make explicit)
ALTER ROLE service_role SET statement_timeout = '120s';
