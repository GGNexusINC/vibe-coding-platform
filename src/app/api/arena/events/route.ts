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
  // Check for admin session first, then regular session
  const [adminSession, userSession] = await Promise.all([
    getAdminSession(),
    getSession()
  ]);
  
  const session = adminSession || userSession;
  
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

// PATCH - Update event (admin only) - close registration, start event, assign VCs, upload image
export async function PATCH(req: Request) {
  const [adminSession, userSession] = await Promise.all([
    getAdminSession(),
    getSession()
  ]);
  
  const session = adminSession || userSession;
  
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { event_id, action, image_url, registration_open, status, current_round } = body;

  if (!event_id) {
    return NextResponse.json({ ok: false, error: "Event ID required" }, { status: 400 });
  }

  // Update event fields
  const updateData: any = {};
  if (image_url !== undefined) updateData.image_url = image_url;
  if (registration_open !== undefined) updateData.registration_open = registration_open;
  if (status !== undefined) updateData.status = status;
  if (current_round !== undefined) updateData.current_round = current_round;

  const { data: events, error } = await supabase
    .from("arena_events")
    .update(updateData)
    .eq("id", event_id)
    .select();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const event = events?.[0];
  if (!event) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  // Handle special actions
  if (action === "assign_vcs") {
    // Assign teams to voice channels and notify
    const { data: teams } = await supabase
      .from("arena_teams")
      .select("*")
      .eq("event_id", event_id)
      .order("seed", { ascending: true });

    if (teams && teams.length > 0) {
      // Discord VC names: RaidZone-1, RaidZone-2, etc.
      const vcAssignments = teams.map((team, index) => ({
        team_id: team.id,
        vc_channel: `RaidZone-${index + 1}`,
        team_name: team.name,
        leader_username: team.leader_username,
      }));

      // Generate matches - pair teams: 1v2, 3v4, 5v6, etc.
      const matches = [];
      for (let i = 0; i < teams.length; i += 2) {
        if (i + 1 < teams.length) {
          const team1 = teams[i];
          const team2 = teams[i + 1];
          const matchNumber = Math.floor(i / 2) + 1;
          
          matches.push({
            event_id,
            round: 1,
            match_number: matchNumber,
            team1_id: team1.id,
            team1_name: team1.name,
            team2_id: team2.id,
            team2_name: team2.name,
            team1_vc: `RaidZone-${i + 1}`,
            team2_vc: `RaidZone-${i + 2}`,
            status: "pending",
          });
        }
      }

      // Store matches in database
      if (matches.length > 0) {
        await supabase.from("arena_matches").insert(matches);
      }

      // Store assignments AND matches in event metadata
      await supabase
        .from("arena_events")
        .update({
          metadata: { vc_assignments: vcAssignments, matches, round: 1 },
          current_round: 1
        })
        .eq("id", event_id);

      // Send Discord notifications to each team with their opponent
      for (const assignment of vcAssignments) {
        // Find match for this team
        const match = matches.find(m => 
          m.team1_id === assignment.team_id || m.team2_id === assignment.team_id
        );
        
        let opponentText = "";
        if (match) {
          const opponentName = match.team1_id === assignment.team_id 
            ? match.team2_name 
            : match.team1_name;
          opponentText = `\n⚔️ **Your Opponent:** ${opponentName}`;
        }
        
        try {
          await sendDiscordWebhook({
            content: `🔊 **${assignment.team_name}** - Please join your designated voice channel!

**👉 ${assignment.vc_channel}**${opponentText}

Round 1 is starting soon. Good luck! 🎮`,
            username: "NewHopeGGN Arena",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
          });
        } catch (e) {
          console.error("Failed to send VC notification:", e);
        }
      }

      // Send bracket overview
      let bracketText = "🏆 **Round 1 Matchups:**\n\n";
      matches.forEach((m, idx) => {
        bracketText += `**Match ${idx + 1}:** ${m.team1_name} vs ${m.team2_name}\n`;
        bracketText += `└ ${m.team1_vc} vs ${m.team2_vc}\n\n`;
      });
      
      try {
        await sendDiscordWebhook({
          content: bracketText + "Good luck to all teams! ⚔️",
          username: "NewHopeGGN Arena",
          avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        });
      } catch (e) {
        console.error("Failed to send bracket:", e);
      }

      return NextResponse.json({
        ok: true,
        event,
        vc_assignments: vcAssignments,
        matches,
        message: `Assigned ${teams.length} teams to voice channels, generated ${matches.length} matches`
      });
    }
  }

  if (action === "start_event") {
    // Close registration and notify all teams
    await supabase
      .from("arena_events")
      .update({ registration_open: false, status: "active" })
      .eq("id", event_id);

    try {
      await sendDiscordWebhook({
        content: `🏆 **${event.name} is STARTING!**

Registration is now **CLOSED**. Teams check your assigned voice channels!

Good luck to all competitors! ⚔️`,
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
      });
    } catch (e) {
      console.error("Discord webhook failed:", e);
    }
  }

  if (action === "next_round") {
    const newRound = (event.current_round || 0) + 1;
    await supabase
      .from("arena_events")
      .update({ current_round: newRound })
      .eq("id", event_id);

    try {
      await sendDiscordWebhook({
        content: `➡️ **Round ${newRound} Starting!**

Teams advance to your next matches. Check brackets and join your voice channels!`,
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
      });
    } catch (e) {
      console.error("Discord webhook failed:", e);
    }

    return NextResponse.json({ ok: true, event: { ...event, current_round: newRound } });
  }

  if (action === "shuffle_matches") {
    // Get all teams and re-shuffle match pairings
    const { data: teams } = await supabase
      .from("arena_teams")
      .select("*")
      .eq("event_id", event_id);

    if (teams && teams.length > 1) {
      // Shuffle teams randomly
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      
      // Generate new matches
      const newMatches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          const team1 = shuffled[i];
          const team2 = shuffled[i + 1];
          newMatches.push({
            event_id,
            round: event.current_round || 1,
            match_number: Math.floor(i / 2) + 1,
            team1_id: team1.id,
            team1_name: team1.name,
            team1_vc: `RaidZone-${i + 1}`,
            team2_id: team2.id,
            team2_name: team2.name,
            team2_vc: `RaidZone-${i + 2}`,
            status: "pending",
          });
        }
      }

      // Update event metadata with new matches
      const { data: updatedEvent } = await supabase
        .from("arena_events")
        .update({
          metadata: { 
            ...(event.metadata || {}),
            matches: newMatches 
          }
        })
        .eq("id", event_id)
        .select()
        .single();

      // Notify about shuffle
      try {
        await sendDiscordWebhook({
          content: `🔀 **Matches Shuffled!**\n\nNew pairings have been generated. Check the bracket and join your assigned voice channels!`,
          username: "NewHopeGGN Arena",
          avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        });
      } catch (e) {
        console.error("Discord webhook failed:", e);
      }

      return NextResponse.json({ ok: true, event: updatedEvent, matches: newMatches });
    }
  }

  return NextResponse.json({ ok: true, event });
}
