/**
 * Seed script to create the three demo users in Supabase Auth.
 * Run once with: node scripts/seed-users.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lamggdhtjrxrqbgmdiwn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sCs6rXfi9rVE-F_sh3S3YA_n3uLtIpH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS = [
  { email: 'student@campusos.dev', password: 'password123', role: 'Student' },
  { email: 'faculty@campusos.dev', password: 'password123', role: 'Faculty' },
  { email: 'admin@campusos.dev',   password: 'password123', role: 'Admin' },
];

async function seedUsers() {
  console.log('🌱 Seeding demo users...\n');

  for (const user of USERS) {
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        // Skip email confirmation if Supabase allows it
        emailRedirectTo: undefined,
      },
    });

    console.log(`--- ${user.role} (${user.email}) ---`);
    console.log('Error:', JSON.stringify(error, null, 2));
    console.log('User:', JSON.stringify(data?.user ? {
      id: data.user.id,
      email: data.user.email,
      confirmed_at: data.user.confirmed_at,
      email_confirmed_at: data.user.email_confirmed_at,
      identities: data.user.identities?.length,
    } : null, null, 2));
    console.log('Session:', data?.session ? 'YES' : 'NO');
    console.log('');
  }

  await supabase.auth.signOut();
}

seedUsers();
