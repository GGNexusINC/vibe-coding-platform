import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET all events
export async function GET() {
  const { data: events, error } = await supabase
    .from("arena_events")
    .select("*, arena_teams(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, events });
}

// POST create new event (admin only)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, game_mode, max_teams, team_size, start_time, bracket_type } = body;

  if (!name) {
    return NextResponse.json({ ok: false, error: "Event name required" }, { status: 400 });
  }

  const { data: event, error } = await supabase
    .from("arena_events")
    .insert({
      name,
      description,
      game_mode: game_mode || "PvP",
      max_teams: max_teams || 16,
      team_size: team_size || 4,
      start_time,
      bracket_type: bracket_type || "single_elimination",
      created_by_discord_id: session.discord_id,
      created_by_username: session.username || "Unknown",
      discord_webhook_url: env.discordWebhookUrlForPage("general-chat"),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Send Discord notification
  try {
    await sendDiscordWebhook({
      content: `🎯 **New Arena Event Created!**\n\n**${name}**\n🎮 Mode: ${game_mode || "PvP"}\n👥 Max Teams: ${max_teams || 16}\n📅 Starts: ${start_time ? new Date(start_time).toLocaleString() : "TBA"}\n\nRegister your team now!`,
      username: "NewHopeGGN Arena",
      avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
    });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }

  return NextResponse.json({ ok: true, event });
}
