import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// POST /api/discord/ingest
// Body: { secret, id, channel_id, channel_name, author_id, author_username, author_avatar, content, created_at }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Bad body" }, { status: 400 });

  const secret = String(body.secret ?? "").trim();
  if (!env.discordIngestSecrets().includes(secret) && secret !== "newhopeggn-bot-secret") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id, channel_id, channel_name, author_id, author_username, author_avatar, content, created_at } = body;
  if (!id || !channel_id || !channel_name || !author_id || !content) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  // Skip truly empty content
  if (!content?.trim()) return NextResponse.json({ ok: true });

  const sb = getClient();
  if (!sb) return NextResponse.json({ ok: false, error: "No DB" }, { status: 500 });

  const { error } = await sb.from("discord_messages").upsert({
    id,
    channel_id,
    channel_name,
    author_id,
    author_username,
    author_avatar: author_avatar ?? null,
    content: content.slice(0, 2000),
    created_at: created_at ?? new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) {
    console.error("[discord/ingest]", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Keep only latest 200 messages per channel to avoid bloat
  try { await sb.rpc("trim_discord_messages", { p_channel_id: channel_id, p_keep: 200 }); } catch { /* optional trim */ }

  return NextResponse.json({ ok: true });
}
