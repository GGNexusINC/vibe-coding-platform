import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const results: Record<string, unknown> = {
    has_service_key: Boolean(serviceKey),
    has_anon_key: Boolean(anonKey),
    has_supabase_url: Boolean(url),
  };

  if (url && serviceKey) {
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { error, count } = await sb.from("tickets").select("id", { count: "exact", head: true });
    results.service_role_select = {
      ok: !error,
      error: error?.message ?? null,
      code: error?.code ?? null,
      count,
    };
  }

  if (url && anonKey) {
    const sb = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error, count } = await sb.from("tickets").select("id", { count: "exact", head: true });
    results.anon_key_select = {
      ok: !error,
      error: error?.message ?? null,
      code: error?.code ?? null,
      count,
    };
  }

  return NextResponse.json(results);
}
