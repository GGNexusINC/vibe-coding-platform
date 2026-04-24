import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

function getSupabaseKeyRole(key: string) {
  if (key.startsWith("sb_secret_")) return "service_role";
  const parts = key.split(".");
  if (parts.length < 2) return "unknown";
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { role?: string };
    return payload.role ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function createSupabaseAdminClient() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!serviceKey) {
    throw new Error("Missing Supabase service role key for admin database access.");
  }

  const role = getSupabaseKeyRole(serviceKey);
  if (role !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is set to a ${role} key. Replace it with the Supabase service_role/secret key to allow admin database writes.`,
    );
  }

  return createClient(env.supabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
