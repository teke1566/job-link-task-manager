// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

/**
 * IMPORTANT:
 * - No PKCE here (removes the /auth/v1/token 400 problem)
 * - detectSessionInUrl handles email links (magic, invite, recovery)
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sb-joblinks-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
