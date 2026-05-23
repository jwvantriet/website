import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client for the marketing site. We don't do any
// auth flow here, so there's no need to read/write cookies — every
// request goes through the anon key + Row Level Security.
//
// We deliberately avoid `@supabase/ssr` here. With cookie passthrough
// enabled, any stale Supabase-looking cookie on the visitor's browser
// can override the anon key and present a JWT we don't recognise to
// PostgREST. That happens to look like an RLS failure even though the
// policy is correct — which is exactly the symptom we chased down in
// the vacancy_applications saga.
//
// The wrapper around createSupabaseClient is lazy: env vars are read
// at call time (not module load) so Next.js's build-time prerender
// pass doesn't fail when the env vars are absent on the local machine.
export function createClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.',
    );
  }
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { 'x-confair-source': 'website-server-action' },
    },
  });
}
