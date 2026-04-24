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

// GET — public, returns current wipe timer
export async function GET() {
  const sb = getSupabase();
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "wipe_timer")
    .single();

  if (!data) return NextResponse.json({ ok: true, wipeAt: null, label: null });

  const val = data.value as { wipeAt?: string | null; label?: string | null; setAt?: string | null };
  const wipeMs = val.wipeAt ? new Date(val.wipeAt).getTime() : NaN;
  const wipeAt = Number.isFinite(wipeMs) ? new Date(wipeMs).toISOString() : null;
  return NextResponse.json({
    ok: true,
    wipeAt,
    wipeAtMs: wipeAt ? wipeMs : null,
    label: val.label ?? null,
    serverNow: new Date().toISOString(),
    serverNowMs: Date.now(),
    setAt: val.setAt ?? null,
  });
}

// POST — admin only, sets wipe timer
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rawWipeAt: string | null = body?.wipeAt ?? null;   // ISO string or null to clear
  const label: string = String(body?.label ?? "Server Wipe").trim().slice(0, 80);
  const wipeMs = rawWipeAt ? new Date(rawWipeAt).getTime() : NaN;
  const wipeAt = rawWipeAt === null
    ? null
    : Number.isFinite(wipeMs)
      ? new Date(wipeMs).toISOString()
      : undefined;

  if (wipeAt === undefined) {
    return NextResponse.json({ ok: false, error: "Invalid wipe date/time." }, { status: 400 });
  }

  const sb = getSupabase();
  const { error } = await sb.from("site_settings").upsert(
    { key: "wipe_timer", value: { wipeAt, label, setAt: new Date().toISOString() } },
    { onConflict: "key" }
  );

  if (error) {
    console.error("[wipe-timer] Supabase error:", JSON.stringify(error));
    return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    wipeAt,
    wipeAtMs: wipeAt ? new Date(wipeAt).getTime() : null,
    label,
    serverNow: new Date().toISOString(),
    serverNowMs: Date.now(),
  });
}
