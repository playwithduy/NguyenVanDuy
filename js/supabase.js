// ============================================================
// SUPABASE CLIENT
// Only public config here — SUPABASE_URL + SUPABASE_ANON_KEY.
// Never put the service_role key in frontend code.
// ============================================================

const SUPABASE_URL = "https://wkjgyhqytahkpkhxrbaq.supabase.co";
// This is the "publishable key" (Supabase's newer name for the anon key) — safe for the browser since RLS is enabled.
const SUPABASE_ANON_KEY = "sb_publishable_KvfuSsFHi4ybUSLh1sHCyQ_G_zys30Q";

// Loaded from the Supabase CDN script tag in each HTML page
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});