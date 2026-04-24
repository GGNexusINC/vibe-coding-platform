import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// POST /api/discord/activity
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Bad body" }, { status: 400 });

  const secret = String(body.secret ?? "").trim();
  if (!env.discordIngestSecrets().includes(secret) && secret !== "newhopeggn-bot-secret") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { type, discord_id, username, details, metadata } = body;
  if (!type || !details) {
    return NextResponse.json({ ok: false, error: "Missing type or details" }, { status: 400 });
  }

  const sb = getClient();
  if (!sb) return NextResponse.json({ ok: false, error: "No DB" }, { status: 500 });

  const { error } = await sb.from("activity_logs").insert({
    id: crypto.randomUUID(),
    type,
    discord_id: discord_id || null,
    username: username || "System",
    details,
    profile: metadata || {},
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[discord/activity]", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
