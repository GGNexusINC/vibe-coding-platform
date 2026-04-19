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

  const { data: event, error } = await supabase
    .from("arena_events")
    .update(updateData)
    .eq("id", event_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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

      // Store assignments in event metadata
      await supabase
        .from("arena_events")
        .update({
          metadata: { vc_assignments: vcAssignments }
        })
        .eq("id", event_id);

      // Send Discord notifications to each team
      for (const assignment of vcAssignments) {
        try {
          await sendDiscordWebhook({
            content: `🔊 **${assignment.team_name}** - Please join your designated voice channel!

**👉 ${assignment.vc_channel}**

Round is starting soon. Good luck! ⚔️`,
            username: "NewHopeGGN Arena",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
          });
        } catch (e) {
          console.error("Failed to send VC notification:", e);
        }
      }

      return NextResponse.json({
        ok: true,
        event,
        vc_assignments: vcAssignments,
        message: `Assigned ${teams.length} teams to voice channels`
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

  return NextResponse.json({ ok: true, event });
}
