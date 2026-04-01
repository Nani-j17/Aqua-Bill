import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || 'https://qfroqrhsbjotjveahufo.supabase.co';
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcm9xcmhzYmpvdGp2ZWFodWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTk3NjAsImV4cCI6MjA2ODgzNTc2MH0.Aq4PFaIR5CYyH4rbLodDgkTe-_f3u6cndtaG9REDImw';

// Persist session for the current browser session (survives reloads, not full browser restarts)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined
  }
});