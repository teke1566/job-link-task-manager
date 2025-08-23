// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const GLOBAL_KEY = "__supabase_joblinks__";

export const supabase =
  globalThis[GLOBAL_KEY] ??
  (globalThis[GLOBAL_KEY] = createClient(url, key, {
    auth: {
      storageKey: "sb-joblinks-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  }));
