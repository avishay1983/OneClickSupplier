import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ijyqtemnhlbamxmgjuzp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqeXF0ZW1uaGxiYW14bWdqdXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MzY2NzksImV4cCI6MjA4MDQxMjY3OX0.CL7HrCHStxINVWS9SqATBdp__QMeD59gxXVkI1KaxqQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = true;
