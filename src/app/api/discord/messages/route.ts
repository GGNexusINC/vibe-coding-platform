import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const PUBLIC_CHANNEL_HINTS = [
  "announcement",
  "general",
  "chat",
  "equipos",
  "teams",
  "memes",
  "fotos",
  "photos",
  "videos",
  "sugerencias",
  "suggestions",
  "subscriptions",
  "guias",
  "guides",
];

const PRIVATE_CHANNEL_HINTS = [
  "admin",
  "approved",
  "bot",
  "log",
  "mod",
  "owner",
  "staff",
  "ticket",
  "voice",
];

function normalizeChannelName(name: string | null | undefined) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isPublicCommunityChannel(name: string | null | undefined) {
  const normalized = normalizeChannelName(name);
  if (!normalized) return false;
  if (PRIVATE_CHANNEL_HINTS.some((hint) => normalized.includes(hint))) return false;
  return PUBLIC_CHANNEL_HINTS.some((hint) => normalized.includes(hint));
}

// GET /api/discord/messages?channel=NAME&limit=50
// GET /api/discord/messages?channels=1 -> returns distinct public channel names
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sb = getClient();
  if (!sb) return NextResponse.json({ ok: false, messages: [], channels: [] });

  if (searchParams.get("channels") === "1") {
    const { data } = await sb
      .from("discord_messages")
      .select("channel_name")
      .order("created_at", { ascending: false })
      .limit(500);

    const unique = [...new Set((data ?? []).map((r: { channel_name: string }) => r.channel_name))]
      .filter(isPublicCommunityChannel);

    return NextResponse.json({ ok: true, channels: unique });
  }

  const channel = searchParams.get("channel");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  if (channel && !isPublicCommunityChannel(channel)) {
    return NextResponse.json({ ok: true, messages: [] });
  }

  let query = sb
    .from("discord_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(channel ? limit : Math.max(limit * 3, 120));

  if (channel) {
    query = query.eq("channel_name", channel);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, messages: [] });

  const messages = (data ?? [])
    .filter((message: { channel_name?: string | null }) => isPublicCommunityChannel(message.channel_name))
    .slice(0, limit)
    .reverse();

  return NextResponse.json({ ok: true, messages });
}
