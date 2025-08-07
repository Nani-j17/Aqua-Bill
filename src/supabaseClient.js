import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfroqrhsbjotjveahufo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcm9xcmhzYmpvdGp2ZWFodWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTk3NjAsImV4cCI6MjA2ODgzNTc2MH0.Aq4PFaIR5CYyH4rbLodDgkTe-_f3u6cndtaG9REDImw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 