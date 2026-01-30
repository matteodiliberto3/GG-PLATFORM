import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getAuthContextFromBearer(bearer?: string) {
  if (!bearer) return null;
  const token = bearer.startsWith("Bearer ") ? bearer.slice("Bearer ".length) : bearer;
  if (!token) return null;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;

  const role = (data.user.app_metadata?.role as string | undefined) ?? "user";
  return { token, user: data.user, role };
}

