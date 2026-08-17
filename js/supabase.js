// ============================================================
// SUPABASE CLIENT
// Only public config here — SUPABASE_URL + SUPABASE_ANON_KEY.
// Never put the service_role key in frontend code.
// ============================================================

const SUPABASE_URL = "https://wkjgyhqytahkpkhxrbaq.supabase.co";

// Public publishable key — safe for browser use.
// Database access must still be protected by RLS.
const SUPABASE_ANON_KEY = "sb_publishable_KvfuSsFHi4ybUSLh1sHCyQ_G_zys30Q";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);