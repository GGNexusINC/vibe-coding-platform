import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanupExpiredRewardItems } from "@/lib/reward-inventory";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function runCleanup() {
  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 500 });
  }
  const result = await cleanupExpiredRewardItems(sb);
  return NextResponse.json({
    ok: true,
    cleaned: result.expired ?? 0,
    expiredAt: result.expiredAt ?? new Date().toISOString(),
  });
}

export async function GET(req: Request) {
  const isCron = req.headers.get("x-vercel-cron") === "1";
  const secret = new URL(req.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!isCron && (!expected || secret !== expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return runCleanup();
}

export async function POST(req: Request) {
  return GET(req);
}
