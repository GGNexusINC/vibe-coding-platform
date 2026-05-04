import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET — public, returns current mayhem mode status
export async function GET() {
  const sb = getSupabase();
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "mayhem_mode")
    .single();

  if (!data) return NextResponse.json({ ok: true, enabled: false });

  const val = data.value as { enabled: boolean };
  return NextResponse.json({
    ok: true,
    enabled: !!val.enabled,
  });
}

// POST — admin only, toggles mayhem mode
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const enabled: boolean = !!body?.enabled;

  const sb = getSupabase();
  const { error } = await sb.from("site_settings").upsert(
    { key: "mayhem_mode", value: { enabled, setAt: new Date().toISOString() } },
    { onConflict: "key" }
  );

  if (error) {
    console.error("[mayhem-mode] Supabase error:", JSON.stringify(error));
    return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    enabled,
  });
}
