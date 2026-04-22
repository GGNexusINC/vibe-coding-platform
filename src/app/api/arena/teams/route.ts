import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET teams for an event
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Event ID required" }, { status: 400 });
  }

  const { data: teams, error } = await supabase
    .from("arena_teams")
    .select(`
      *,
      arena_team_members(*)
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, teams });
}

// POST create new team
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Please sign in with Discord" }, { status: 401 });
  }

  const body = await req.json();
  const { event_id, name, tag, logo_url } = body;

  if (!event_id || !name) {
    return NextResponse.json({ ok: false, error: "Event ID and team name required" }, { status: 400 });
  }

  // Check if registration is open
  const { data: event } = await supabase
    .from("arena_events")
    .select("registration_open, max_teams, discord_webhook_url")
    .eq("id", event_id)
    .single();

  if (!event?.registration_open) {
    return NextResponse.json({ ok: false, error: "Registration is closed for this event" }, { status: 403 });
  }

  // Check if user already has a team in this event
  const { data: existingTeam } = await supabase
    .from("arena_teams")
    .select("id")
    .eq("event_id", event_id)
    .eq("leader_discord_id", session.discord_id)
    .single();

  if (existingTeam) {
    return NextResponse.json({ ok: false, error: "You already created a team for this event" }, { status: 409 });
  }

  // Create team
  const { data: team, error } = await supabase
    .from("arena_teams")
    .insert({
      event_id,
      name,
      tag,
      logo_url,
      leader_discord_id: session.discord_id,
      leader_username: session.username || "Unknown",
      leader_avatar_url: session.avatar_url,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "Team name already taken for this event" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Add leader as first member
  await supabase.from("arena_team_members").insert({
    team_id: team.id,
    event_id,
    discord_id: session.discord_id,
    username: session.username || "Unknown",
    avatar_url: session.avatar_url,
    role: "leader",
  });

  // Log event
  await supabase.from("arena_event_logs").insert({
    event_id,
    type: "team_created",
    message: `Team "${name}" created by ${session.username}`,
    discord_id: session.discord_id,
    username: session.username || "Unknown",
  });

  // Send Discord notification to general
  try {
    await sendDiscordWebhook({
      content: `🎮 **New Team Registered!**\n\n**${name}** ${tag ? `[${tag}]` : ""}\n👤 Leader: ${session.username}\n🏆 Event: Arena Tournament\n\nUse /arena join ${name} to join this team!`,
      username: "NewHopeGGN Arena",
      avatar_url: session.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png",
    }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }

  // Send team logo to dedicated logo channel if logo exists
  if (logo_url) {
    const logoWebhookUrl = env.discordWebhookUrlForPage("arena-logos");
    try {
      if (!logoWebhookUrl) throw new Error("Arena logo webhook is not configured.");
      await fetch(logoWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🎨 **Team Logo: ${name}** ${tag ? `[${tag}]` : ""}\n👤 Leader: ${session.username}\n🖼️ Logo:`,
          embeds: [{
            title: `${name} Team Logo`,
            image: { url: logo_url },
            color: 0xffaa00,
            footer: { text: `Team ID: ${team.id}` }
          }]
        }),
      });
    } catch (e) {
      console.error("Logo webhook failed:", e);
    }
  }

  return NextResponse.json({ ok: true, team });
}
