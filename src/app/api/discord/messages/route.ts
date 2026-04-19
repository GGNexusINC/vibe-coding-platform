import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/discord/messages?channel=NAME&limit=50
// GET /api/discord/messages?channels=1  → returns distinct channel names
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sb = getClient();
  if (!sb) return NextResponse.json({ ok: false, messages: [], channels: [] });

  // Return distinct channel names (exclude ticket channels)
  if (searchParams.get("channels") === "1") {
    const { data } = await sb
      .from("discord_messages")
      .select("channel_name")
      .order("created_at", { ascending: false })
      .limit(500);
    const unique = [...new Set((data ?? []).map((r: { channel_name: string }) => r.channel_name))]
      .filter(name => !name?.toLowerCase().includes("ticket")); // Exclude ticket channels
    return NextResponse.json({ ok: true, channels: unique });
  }

  const channel = searchParams.get("channel");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  let query = sb
    .from("discord_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (channel) {
    query = query.eq("channel_name", channel);
  } else {
    // When showing "All", exclude ticket channels (any variant)
    query = query
      .not("channel_name", "ilike", "%ticket%");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, messages: [] });

  return NextResponse.json({ ok: true, messages: (data ?? []).reverse() });
}
