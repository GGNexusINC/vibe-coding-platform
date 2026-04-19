import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";
import { env } from "@/lib/env";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET bracket for an event
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Event ID required" }, { status: 400 });
  }

  // Get event info
  const { data: event } = await supabase
    .from("arena_events")
    .select("*, arena_teams(id, name, tag, leader_username, status)")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  // Get matches
  const { data: matches } = await supabase
    .from("arena_matches")
    .select(`
      *,
      team1:arena_teams!arena_matches_team1_id_fkey(id, name, tag),
      team2:arena_teams!arena_matches_team2_id_fkey(id, name, tag),
      winner:arena_teams!arena_matches_winner_id_fkey(id, name, tag)
    `)
    .eq("event_id", eventId)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  return NextResponse.json({ 
    ok: true, 
    event,
    matches: matches || [],
    teams: event.arena_teams || []
  });
}

// POST generate bracket (admin only)
export async function POST(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { event_id } = body;

  if (!event_id) {
    return NextResponse.json({ ok: false, error: "Event ID required" }, { status: 400 });
  }

  // Get event and teams
  const { data: event } = await supabase
    .from("arena_events")
    .select("*, arena_teams(id, name, seed)")
    .eq("id", event_id)
    .single();

  if (!event) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  const teams = event.arena_teams || [];
  if (teams.length < 2) {
    return NextResponse.json({ ok: false, error: "Need at least 2 teams" }, { status: 400 });
  }

  // Sort teams by seed or random if no seeds
  const sortedTeams = teams.sort((a: { seed?: number }, b: { seed?: number }) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    return Math.random() - 0.5; // Randomize unseeded
  });

  // Calculate bracket size (next power of 2)
  const teamCount = sortedTeams.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const byes = bracketSize - teamCount;

  // Generate first round matches
  const matches = [];
  const firstRoundMatches = bracketSize / 2;
  
  for (let i = 0; i < firstRoundMatches; i++) {
    const team1Index = i * 2;
    const team2Index = i * 2 + 1;
    
    const team1 = sortedTeams[team1Index];
    const team2 = sortedTeams[team2Index];
    
    // If there's a bye, auto-advance the team
    if (!team2 && team1) {
      // Team gets a bye - could auto-advance them
    }

    matches.push({
      event_id,
      round: 1,
      match_number: i + 1,
      team1_id: team1?.id || null,
      team2_id: team2?.id || null,
      status: team1 && team2 ? "pending" : "completed", // Bye match
      winner_id: !team2 && team1 ? team1.id : null, // Auto-win for bye
    });
  }

  // Clear existing matches
  await supabase.from("arena_matches").delete().eq("event_id", event_id);

  // Insert new matches
  const { data: createdMatches, error } = await supabase
    .from("arena_matches")
    .insert(matches)
    .select();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Update event status
  await supabase
    .from("arena_events")
    .update({ 
      status: "active", 
      registration_open: false,
      current_round: 1 
    })
    .eq("id", event_id);

  // Log and notify
  await supabase.from("arena_event_logs").insert({
    event_id,
    type: "bracket_generated",
    message: `Tournament bracket generated with ${teams.length} teams`,
    metadata: { team_count: teams.length, bracket_size: bracketSize }
  });

  try {
    await sendDiscordWebhook({
      content: `🏆 **${event.name} Bracket Generated!**\n\n${teams.length} teams entered\n${byes} byes assigned\nBracket size: ${bracketSize}\n\nRound 1 begins soon!`,
      username: "NewHopeGGN Arena",
    }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }

  return NextResponse.json({ 
    ok: true, 
    matches: createdMatches,
    bracketSize,
    byes
  });
}

// PATCH update match result (admin only)
export async function PATCH(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { match_id, winner_id, team1_score, team2_score, status } = body;

  if (!match_id) {
    return NextResponse.json({ ok: false, error: "Match ID required" }, { status: 400 });
  }

  // Get match info
  const { data: match } = await supabase
    .from("arena_matches")
    .select("*, arena_events(name)")
    .eq("id", match_id)
    .single();

  if (!match) {
    return NextResponse.json({ ok: false, error: "Match not found" }, { status: 404 });
  }

  // Update match
  const updateData: Record<string, unknown> = {};
  if (winner_id) updateData.winner_id = winner_id;
  if (team1_score !== undefined) updateData.team1_score = team1_score;
  if (team2_score !== undefined) updateData.team2_score = team2_score;
  if (status) updateData.status = status;
  if (status === "completed") updateData.completed_at = new Date().toISOString();

  const { data: updatedMatch, error } = await supabase
    .from("arena_matches")
    .update(updateData)
    .eq("id", match_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // If match completed with winner, advance to next round
  if (status === "completed" && winner_id) {
    await advanceWinner(match.event_id, match.round, match.match_number, winner_id);
  }

  // Log
  await supabase.from("arena_event_logs").insert({
    event_id: match.event_id,
    type: "match_completed",
    message: `Match completed - Winner advanced`,
    metadata: { match_id, winner_id, team1_score, team2_score }
  });

  // Notify Discord
  try {
    const { data: winnerTeam } = await supabase
      .from("arena_teams")
      .select("name")
      .eq("id", winner_id)
      .single();
    
    await sendDiscordWebhook({
      content: `⚔️ **Match Complete!**\n\n🏆 **${winnerTeam?.name || "Unknown"}** advances to the next round!\n📊 Score: ${team1_score || 0}-${team2_score || 0}\n🎮 Event: ${match.arena_events?.name}`,
      username: "NewHopeGGN Arena",
    }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }

  return NextResponse.json({ ok: true, match: updatedMatch });
}

// Advance winner to next round match
async function advanceWinner(
  eventId: string, 
  currentRound: number, 
  currentMatchNumber: number, 
  winnerId: string
) {
  const nextRound = currentRound + 1;
  const nextMatchNumber = Math.ceil(currentMatchNumber / 2);
  const isTeam1Slot = currentMatchNumber % 2 === 1; // Odd matches go to team1 slot

  // Check if next round match exists
  const { data: nextMatch } = await supabase
    .from("arena_matches")
    .select("id, team1_id, team2_id")
    .eq("event_id", eventId)
    .eq("round", nextRound)
    .eq("match_number", nextMatchNumber)
    .single();

  if (nextMatch) {
    // Update existing match
    const updateData = isTeam1Slot 
      ? { team1_id: winnerId }
      : { team2_id: winnerId };
    
    await supabase
      .from("arena_matches")
      .update(updateData)
      .eq("id", nextMatch.id);
  } else {
    // Create new match for next round
    const newMatch = isTeam1Slot
      ? { event_id: eventId, round: nextRound, match_number: nextMatchNumber, team1_id: winnerId }
      : { event_id: eventId, round: nextRound, match_number: nextMatchNumber, team2_id: winnerId };
    
    await supabase.from("arena_matches").insert(newMatch);
  }

  // Update event current round if this is the highest round
  const { data: event } = await supabase
    .from("arena_events")
    .select("current_round")
    .eq("id", eventId)
    .single();
  
  if (event && nextRound > event.current_round) {
    await supabase
      .from("arena_events")
      .update({ current_round: nextRound })
      .eq("id", eventId);
  }
}
