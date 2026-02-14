import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export function getSupabaseBucket() {
  return process.env.SUPABASE_BUCKET ?? "documents";
}

export function getDocumentsTable() {
  return process.env.SUPABASE_DOCUMENTS_TABLE ?? "documents";
}
