import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const keyToUse = serviceRoleKey || anonKey;

if (!supabaseUrl || !keyToUse) {
  // eslint-disable-next-line no-console
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabaseAdmin = createClient(supabaseUrl, keyToUse, {
  auth: { persistSession: false }
});
