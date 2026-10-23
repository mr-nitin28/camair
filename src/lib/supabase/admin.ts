import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is not defined in environment variables');
  }

  return createSupabaseClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
