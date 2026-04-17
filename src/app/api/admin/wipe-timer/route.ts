import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET — public, returns current wipe timer
export async function GET() {
  const sb = getSupabase();
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "wipe_timer")
    .single();

  if (!data) return NextResponse.json({ ok: true, wipeAt: null, label: null });

  const val = data.value as { wipeAt: string; label: string };
  return NextResponse.json({ ok: true, wipeAt: val.wipeAt ?? null, label: val.label ?? null });
}

// POST — admin only, sets wipe timer
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const wipeAt: string | null = body?.wipeAt ?? null;   // ISO string or null to clear
  const label: string = String(body?.label ?? "Server Wipe").trim().slice(0, 80);

  const sb = getSupabase();
  const { error } = await sb.from("site_settings").upsert(
    { key: "wipe_timer", value: { wipeAt, label } },
    { onConflict: "key" }
  );

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, wipeAt, label });
}
