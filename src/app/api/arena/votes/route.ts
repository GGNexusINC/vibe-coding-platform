import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET votes for an event
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Event ID required" }, { status: 400 });
  }

  // Get vote options with counts
  const { data: options, error } = await supabase
    .from("arena_vote_options")
    .select("*, arena_votes(count)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Get detailed vote results using the function
  const { data: results, error: resultsError } = await supabase
    .rpc("get_vote_results", { event_uuid: eventId });

  // Get all individual votes with team info
  const { data: votes, error: votesError } = await supabase
    .from("arena_votes")
    .select(`
      *,
      team:arena_teams(id, name, tag),
      option:arena_vote_options(name, icon)
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ 
    ok: true, 
    options: options || [],
    results: results || [],
    votes: votes || []
  });
}

// POST cast a vote (team leaders only)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Please sign in with Discord" }, { status: 401 });
  }

  const body = await req.json();
  const { event_id, option_id, team_id } = body;

  if (!event_id || !option_id || !team_id) {
    return NextResponse.json({ ok: false, error: "Event, option, and team required" }, { status: 400 });
  }

  // Verify user is team leader
  const { data: team } = await supabase
    .from("arena_teams")
    .select("name, leader_discord_id")
    .eq("id", team_id)
    .single();

  if (!team) {
    return NextResponse.json({ ok: false, error: "Team not found" }, { status: 404 });
  }

  if (team.leader_discord_id !== session.discord_id) {
    return NextResponse.json({ ok: false, error: "Only team leader can vote" }, { status: 403 });
  }

  // Check if team already voted
  const { data: existingVote } = await supabase
    .from("arena_votes")
    .select("id, option:arena_vote_options(name)")
    .eq("event_id", event_id)
    .eq("team_id", team_id)
    .single();

  if (existingVote) {
    // Update existing vote
    const { data: updated, error } = await supabase
      .from("arena_votes")
      .update({
        option_id,
        voted_by_discord_id: session.discord_id,
        voted_by_username: session.username || "Unknown",
      })
      .eq("id", existingVote.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Get option details for Discord message
    const { data: option } = await supabase
      .from("arena_vote_options")
      .select("name, icon")
      .eq("id", option_id)
      .single();

    await supabase.from("arena_event_logs").insert({
      event_id,
      type: "vote_changed",
      message: `${team.name} changed vote to ${option?.name || "Unknown"}`,
      discord_id: session.discord_id,
      username: session.username || "Unknown",
    });

    return NextResponse.json({ 
      ok: true, 
      vote: updated, 
      message: "Vote updated",
      changed: true 
    });
  }

  // Create new vote
  const { data: vote, error } = await supabase
    .from("arena_votes")
    .insert({
      event_id,
      team_id,
      option_id,
      voted_by_discord_id: session.discord_id,
      voted_by_username: session.username || "Unknown",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Get option details
  const { data: option } = await supabase
    .from("arena_vote_options")
    .select("name, icon")
    .eq("id", option_id)
    .single();

  // Log
  await supabase.from("arena_event_logs").insert({
    event_id,
    type: "vote_cast",
    message: `${team.name} voted for ${option?.name || "Unknown"}`,
    discord_id: session.discord_id,
    username: session.username || "Unknown",
  });

  // Send Discord notification
  try {
    await sendDiscordWebhook({
      content: `🗳️ **Vote Cast!**\n\n${option?.icon || "🎯"} **${team.name}** voted for **${option?.name || "Unknown"}**\n\nTeams can still change their vote until the round starts!`,
      username: "NewHopeGGN Arena",
      avatar_url: session.avatar_url || undefined,
    }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }

  return NextResponse.json({ ok: true, vote, message: "Vote cast" });
}

// DELETE remove vote (admin only, to reset)
export async function DELETE(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Event ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("arena_votes")
    .delete()
    .eq("event_id", eventId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "All votes cleared" });
}
