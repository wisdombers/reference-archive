"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "@/lib/env";

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, anonKey);
}
