import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET vote options for an event
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Event ID required" }, { status: 400 });
  }

  const { data: options, error } = await supabase
    .from("arena_vote_options")
    .select(`
      *,
      arena_votes(count)
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, options: options || [] });
}

// POST create vote option (admin only)
export async function POST(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { event_id, name, description, icon } = body;

  if (!event_id || !name) {
    return NextResponse.json({ ok: false, error: "Event ID and name required" }, { status: 400 });
  }

  const { data: option, error } = await supabase
    .from("arena_vote_options")
    .insert({
      event_id,
      name,
      description,
      icon: icon || "🎯",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Get event name for Discord
  const { data: event } = await supabase
    .from("arena_events")
    .select("name")
    .eq("id", event_id)
    .single();

  // Announce to Discord
  try {
    await sendDiscordWebhook({
      content: `🗳️ **New Voting Option Added!**\n\n${icon || "🎯"} **${name}**\n${description || ""}\n\n🎮 Event: ${event?.name || "Arena Event"}\n\nTeam leaders can now vote for this option!`,
      username: "NewHopeGGN Arena",
    }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }

  return NextResponse.json({ ok: true, option });
}

// DELETE vote option (admin only)
export async function DELETE(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const optionId = searchParams.get("optionId");

  if (!optionId) {
    return NextResponse.json({ ok: false, error: "Option ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("arena_vote_options")
    .delete()
    .eq("id", optionId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Option deleted" });
}
