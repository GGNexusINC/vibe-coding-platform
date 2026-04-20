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

// Send DM to a Discord user
async function sendDiscordDM(userId: string, message: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!botToken) return false;
  try {
    const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: userId }),
    });
    if (!dmRes.ok) return false;
    const dmChannel = await dmRes.json();
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    return msgRes.ok;
  } catch (e) {
    console.error("DM error:", e);
    return false;
  }
}

// GET all events (exclude completed unless ?all=true)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  let query = supabase
    .from("arena_events")
    .select("*, arena_teams(count)")
    .order("created_at", { ascending: false });

  if (!showAll) {
    query = query.neq("status", "completed");
  }

  const { data: events, error } = await query;

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
    }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
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

  // Update event fields if any provided
  const updateData: any = {};
  if (image_url !== undefined) updateData.image_url = image_url;
  if (registration_open !== undefined) updateData.registration_open = registration_open;
  if (status !== undefined) updateData.status = status;
  if (current_round !== undefined) updateData.current_round = current_round;

  let event: any;
  
  if (Object.keys(updateData).length > 0) {
    // Update and get event
    const { data: events, error } = await supabase
      .from("arena_events")
      .update(updateData)
      .eq("id", event_id)
      .select();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    event = events?.[0];
  } else {
    // Just fetch the event
    const { data: events, error } = await supabase
      .from("arena_events")
      .select("*")
      .eq("id", event_id)
      .single();
    
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    event = events;
  }

  if (!event) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  // ── Update game rules ──
  if (action === "update_rules") {
    const { rules } = body;
    if (!rules) return NextResponse.json({ ok: false, error: "No rules provided" }, { status: 400 });

    const updatedMeta = { ...(event.metadata || {}), rules };
    await supabase.from("arena_events").update({ metadata: updatedMeta }).eq("id", event_id);

    // Build rules summary for Discord
    const ruleLines: string[] = [];
    if (rules.mode) ruleLines.push(`🎮 **Mode:** ${rules.mode}`);
    if (rules.ffa) ruleLines.push(`⚔️ **Free For All** — every player for themselves`);
    if (rules.weapons?.length) ruleLines.push(`🔫 **Allowed Weapons:** ${rules.weapons.join(", ")}`);
    if (rules.no_deviants) ruleLines.push(`🚫 **No Deviants** — all deviant abilities disabled`);
    if (rules.extra) ruleLines.push(`📋 **Notes:** ${rules.extra}`);

    try {
      await sendDiscordWebhook({
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        embeds: [{
          title: `📋 ${event.name} — Rules Updated`,
          description: ruleLines.join("\n") || "Rules have been updated.",
          color: 0x8b5cf6,
          footer: { text: "NewHopeGGN Arena System" },
          timestamp: new Date().toISOString(),
        }],
      }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
    } catch (e) { console.error("Webhook failed:", e); }

    return NextResponse.json({ ok: true, metadata: updatedMeta });
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

      // Send Discord notifications to each team
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
        } else if (teams.length === 1) {
          opponentText = "\n⏳ **Waiting for more teams to join...**";
        } else {
          opponentText = "\n🏆 **Bye round - you advance automatically!**";
        }
        
        try {
          await sendDiscordWebhook({
            content: `🔊 **${assignment.team_name}** - Please join your designated voice channel!\n\n**👉 ${assignment.vc_channel}**${opponentText}\n\nRound 1 is starting soon. Good luck! 🎮`,
            username: "NewHopeGGN Arena",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
          }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
        } catch (e) {
          console.error("Failed to send VC notification:", e);
        }
      }

      // Also send DMs to all team members if bot token available
      if (process.env.DISCORD_BOT_TOKEN) {
        for (const team of teams) {
          const match = matches.find(m => 
            m.team1_id === team.id || m.team2_id === team.id
          );
          const opponentName = match 
            ? (match.team1_id === team.id ? match.team2_name : match.team1_name)
            : null;
          
          const dmMessage = opponentName 
            ? `🎮 **It's your turn in the arena!**\n\nYou're fighting: **${opponentName}**\nJoin voice channel: **${vcAssignments.find(v => v.team_id === team.id)?.vc_channel}**\n\nGood luck! ⚔️`
            : `🎮 **You're registered for the arena!**\n\nJoin voice channel: **${vcAssignments.find(v => v.team_id === team.id)?.vc_channel}**\n\nWaiting for the event to start... ⏳`;

          // DM team leader
          if (team.leader_discord_id) {
            await sendDiscordDM(team.leader_discord_id, dmMessage);
          }
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
        }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
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

  // ── Shared bracket generation helper ──
  async function buildBracket(roundNum: number) {
    const isFFA = !!(event.metadata?.rules?.ffa);

    const { data: teams } = await supabase
      .from("arena_teams")
      .select("*, arena_team_members(*)")
      .eq("event_id", event_id)
      .order("seed", { ascending: true });

    if (!teams || teams.length === 0) return { matches: [], vcAssignments: [], ffa_participants: [] };

    const vcAssignments: any[] = [];
    const matches: any[] = [];
    let ffa_participants: any[] = [];

    if (isFFA) {
      // Collect every individual player across all teams
      const players: any[] = [];
      for (const team of teams) {
        for (const member of (team.arena_team_members || [])) {
          players.push({
            id: member.discord_id,
            name: member.username,
            avatar_url: member.avatar_url,
            team_name: team.name,
            team_id: team.id,
          });
        }
      }
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      ffa_participants = shuffled.map((p, i) => ({
        ...p,
        vc_channel: `RaidZone-${i + 1}`,
        status: "active",
        rank: null,
      }));
      // One "FFA" meta-match for tracking the winner
      matches.push({
        event_id,
        round: roundNum,
        match_number: 1,
        team1_id: teams[0]?.id,
        team1_name: "FFA",
        team2_id: teams[0]?.id,
        team2_name: "FFA",
        team1_vc: "All Players",
        team2_vc: "All Players",
        status: "live",
      });
    } else {
      // Standard team mode — pair teams
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      shuffled.forEach((team, index) => {
        vcAssignments.push({
          team_id: team.id,
          vc_channel: `RaidZone-${index + 1}`,
          team_name: team.name,
          leader_username: team.leader_username,
        });
      });
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matches.push({
            event_id,
            round: roundNum,
            match_number: Math.floor(i / 2) + 1,
            team1_id: shuffled[i].id,
            team1_name: shuffled[i].name,
            team2_id: shuffled[i + 1].id,
            team2_name: shuffled[i + 1].name,
            team1_vc: `RaidZone-${i + 1}`,
            team2_vc: `RaidZone-${i + 2}`,
            status: "live",
          });
        }
      }
    }

    // Clear old round matches and insert new
    await supabase.from("arena_matches").delete().eq("event_id", event_id).eq("round", roundNum);
    if (matches.length > 0) await supabase.from("arena_matches").insert(matches);

    return { matches, vcAssignments, ffa_participants };
  }

  if (action === "generate_bracket") {
    const roundNum = event.current_round || 1;
    const { matches, vcAssignments, ffa_participants } = await buildBracket(roundNum);

    const isFFA = !!(event.metadata?.rules?.ffa);
    const newMeta = {
      ...(event.metadata || {}),
      matches,
      vc_assignments: vcAssignments,
      ffa_participants: ffa_participants.length ? ffa_participants : undefined,
      round: roundNum,
    };
    await supabase.from("arena_events").update({ metadata: newMeta, status: "active" }).eq("id", event_id);

    // Discord embed
    const modeLabel = isFFA ? "🔥 Free For All" : `⚔️ ${event.metadata?.rules?.mode || "Team"} Mode`;
    const fields = isFFA
      ? ffa_participants.map((p: any, i: number) => ({
          name: `#${i + 1} ${p.name}`,
          value: `Team: ${p.team_name} • VC: ${p.vc_channel}`,
          inline: true,
        }))
      : matches.map((m: any, i: number) => ({
          name: `⚔️ Match ${i + 1}`,
          value: `**${m.team1_name}** vs **${m.team2_name}**`,
          inline: false,
        }));

    try {
      await sendDiscordWebhook({
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        embeds: [{
          title: `🏟️ ${event.name} — Round ${roundNum} Bracket Generated`,
          description: `${modeLabel} — ${isFFA ? `${ffa_participants.length} players` : `${matches.length} matches`} set up. Get ready!`,
          color: isFFA ? 0xef4444 : 0xf59e0b,
          fields: fields.slice(0, 25),
          footer: { text: "NewHopeGGN Arena System" },
          timestamp: new Date().toISOString(),
        }],
      }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
    } catch (e) { console.error("Webhook failed:", e); }

    const { data: updatedEvent } = await supabase.from("arena_events").select("*").eq("id", event_id).single();
    return NextResponse.json({ ok: true, event: updatedEvent, matches, vc_assignments: vcAssignments, ffa_participants });
  }

  if (action === "set_ffa_winner") {
    const { winner_name, winner_discord_id, winner_team_name } = body;
    if (!winner_name) return NextResponse.json({ ok: false, error: "winner_name required" }, { status: 400 });

    // Mark all participants — find winner team id
    const { data: winnerTeam } = await supabase
      .from("arena_teams")
      .select("id")
      .eq("event_id", event_id)
      .eq("name", winner_team_name || "")
      .maybeSingle();

    await supabase.from("arena_matches")
      .update({ status: "completed", winner_id: winnerTeam?.id || null })
      .eq("event_id", event_id)
      .eq("round", event.current_round || 1);

    const updatedParticipants = (event.metadata?.ffa_participants || []).map((p: any) => ({
      ...p,
      status: p.name === winner_name ? "winner" : "eliminated",
    }));

    const winnerMatch = { match_number: 1, status: "completed", winner_name, winner_id: winnerTeam?.id };
    const newMeta = {
      ...(event.metadata || {}),
      ffa_participants: updatedParticipants,
      matches: [winnerMatch],
    };
    await supabase.from("arena_events").update({ metadata: newMeta }).eq("id", event_id);

    try {
      await sendDiscordWebhook({
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        embeds: [{
          title: `🏆 FFA Winner — ${event.name}`,
          description: `**${winner_name}** wins the Free For All! 🔥`,
          color: 0xf59e0b,
          footer: { text: "NewHopeGGN Arena System" },
          timestamp: new Date().toISOString(),
        }],
      }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
    } catch (e) { console.error("Webhook failed:", e); }

    const { data: updatedEvent } = await supabase.from("arena_events").select("*").eq("id", event_id).single();
    return NextResponse.json({ ok: true, event: updatedEvent });
  }

  if (action === "start_event") {
    // Close registration
    await supabase
      .from("arena_events")
      .update({ registration_open: false, status: "active" })
      .eq("id", event_id);

    // Re-fetch event with updated rules
    const { data: freshEvent } = await supabase.from("arena_events").select("*").eq("id", event_id).single();
    if (freshEvent) Object.assign(event, freshEvent);

    const { matches, vcAssignments, ffa_participants } = await buildBracket(1);
    const isFFA = !!(event.metadata?.rules?.ffa);

    await supabase
      .from("arena_events")
      .update({
        current_round: 1,
        metadata: {
          ...(event.metadata || {}),
          vc_assignments: vcAssignments,
          matches,
          ffa_participants: ffa_participants.length ? ffa_participants : undefined,
          round: 1,
        },
      })
      .eq("id", event_id);

    // Notify Discord
    const isFFA2 = !!(event.metadata?.rules?.ffa);
    const startFields = isFFA2
      ? ffa_participants.map((p: any, i: number) => ({ name: `#${i + 1} ${p.name}`, value: `Team: ${p.team_name} • VC: ${p.vc_channel}`, inline: true }))
      : matches.map((m: any, idx: number) => ({ name: `⚔️ Match ${idx + 1}`, value: `**${m.team1_name}** (${m.team1_vc}) vs **${m.team2_name}** (${m.team2_vc})`, inline: false }));

    try {
      await sendDiscordWebhook({
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        embeds: [{
          title: `🏆 ${event.name} — Round 1 ${isFFA2 ? "FFA" : "Bracket"}`,
          description: isFFA2
            ? `Registration closed. **${ffa_participants.length} players** competing in Free For All! ⚔️`
            : `Registration closed. Bracket generated. Check your voice channel and good luck! ⚔️`,
          color: isFFA2 ? 0xef4444 : 0xf59e0b,
          fields: startFields.slice(0, 25),
          footer: { text: "NewHopeGGN Arena System" },
          timestamp: new Date().toISOString(),
        }],
      }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
    } catch (e) { console.error("Discord webhook failed:", e); }

    // Re-fetch updated event
    const { data: updatedEvent } = await supabase.from("arena_events").select("*").eq("id", event_id).single();
    return NextResponse.json({ ok: true, event: updatedEvent, matches, vc_assignments: vcAssignments, ffa_participants });
  }

  if (action === "next_round") {
    const newRound = (event.current_round || 1) + 1;

    // Pull completed matches from DB (join winner team for name)
    const { data: completedMatches } = await supabase
      .from("arena_matches")
      .select(`*, winner:arena_teams!arena_matches_winner_id_fkey(id, name), team1:arena_teams!arena_matches_team1_id_fkey(id, name), team2:arena_teams!arena_matches_team2_id_fkey(id, name)`)
      .eq("event_id", event_id)
      .eq("round", event.current_round || 1)
      .eq("status", "completed")
      .order("match_number", { ascending: true });

    // Also check metadata matches as fallback (winner_name stored there)
    const metaMatches: any[] = event.metadata?.matches || [];

    if (!completedMatches || completedMatches.length === 0) {
      return NextResponse.json({ ok: false, error: "No completed matches found for current round" }, { status: 400 });
    }

    // Collect winners — prefer DB join, fall back to metadata winner_name
    const winners = completedMatches
      .map((m: any) => {
        const meta = metaMatches.find((mm: any) => mm.match_number === m.match_number);
        const winnerId = m.winner_id || m.team1_id;
        const winnerName = m.winner?.name || meta?.winner_name || m.team1?.name || m.team1_name;
        return { id: winnerId, name: winnerName };
      })
      .filter((w: any) => w.id && w.name);

    if (winners.length < 2) {
      return NextResponse.json({ ok: false, error: "Need at least 2 winners to generate next round" }, { status: 400 });
    }

    // Pair winners: 1v2, 3v4, etc. Odd winner gets a bye
    const newMatches: any[] = [];
    const vcAssignments: any[] = [];

    winners.forEach((winner: any, index: number) => {
      vcAssignments.push({
        team_id: winner.id,
        vc_channel: `RaidZone-${index + 1}`,
        team_name: winner.name,
      });
    });

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        newMatches.push({
          event_id,
          round: newRound,
          match_number: Math.floor(i / 2) + 1,
          team1_id: winners[i].id,
          team1_name: winners[i].name,
          team2_id: winners[i + 1].id,
          team2_name: winners[i + 1].name,
          team1_vc: `RaidZone-${i + 1}`,
          team2_vc: `RaidZone-${i + 2}`,
          status: "live",
        });
      }
    }

    // Insert new round matches into DB
    if (newMatches.length > 0) {
      await supabase.from("arena_matches").insert(newMatches);
    }

    // Update event: bump round + store new matches + vc_assignments in metadata
    await supabase
      .from("arena_events")
      .update({
        current_round: newRound,
        metadata: { vc_assignments: vcAssignments, matches: newMatches, round: newRound },
      })
      .eq("id", event_id);

    // Build rich bracket embed for Discord
    const matchFields = newMatches.map((m: any, idx: number) => ({
      name: `⚔️ Match ${idx + 1}`,
      value: `**${m.team1_name}** (${m.team1_vc}) vs **${m.team2_name}** (${m.team2_vc})`,
      inline: false,
    }));

    // Bye winner if odd number
    if (winners.length % 2 !== 0) {
      const byeWinner = winners[winners.length - 1];
      matchFields.push({
        name: "🏅 Bye",
        value: `**${byeWinner.name}** advances automatically`,
        inline: false,
      });
    }

    try {
      await sendDiscordWebhook({
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        embeds: [{
          title: `🏆 ${event.name} — Round ${newRound} Bracket`,
          description: `Round ${event.current_round || 1} is over! **${winners.length} teams** advance. New matchups below — join your voice channels! ⚔️`,
          color: 0x06b6d4,
          fields: matchFields,
          footer: { text: "NewHopeGGN Arena System" },
          timestamp: new Date().toISOString(),
        }],
      }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
    } catch (e) {
      console.error("Discord webhook failed:", e);
    }

    // Re-fetch updated event
    const { data: updatedEvent } = await supabase
      .from("arena_events")
      .select("*")
      .eq("id", event_id)
      .single();

    return NextResponse.json({ ok: true, event: updatedEvent, matches: newMatches, vc_assignments: vcAssignments });
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
        }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
      } catch (e) {
        console.error("Discord webhook failed:", e);
      }

      return NextResponse.json({ ok: true, event: updatedEvent, matches: newMatches });
    }
  }

  if (action === "set_winner") {
    const { match_number, winner_id, winner_name, loser_name } = body;
    if (!match_number || !winner_id || !winner_name) {
      return NextResponse.json({ ok: false, error: "Missing match_number, winner_id, or winner_name" }, { status: 400 });
    }

    // Update the match row in arena_matches
    await supabase
      .from("arena_matches")
      .update({ status: "completed", winner_id })
      .eq("event_id", event_id)
      .eq("match_number", match_number);

    // Patch metadata matches array
    const existingMatches: any[] = event.metadata?.matches || [];
    const updatedMatches = existingMatches.map((m: any) =>
      m.match_number === match_number
        ? { ...m, status: "completed", winner_id, winner_name }
        : m
    );

    const { data: updatedEvent } = await supabase
      .from("arena_events")
      .update({ metadata: { ...(event.metadata || {}), matches: updatedMatches } })
      .eq("id", event_id)
      .select()
      .single();

    try {
      await sendDiscordWebhook({
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        embeds: [{
          title: `🏆 Match ${match_number} Result`,
          description: `**${winner_name}** wins!${loser_name ? `\n${loser_name} has been eliminated.` : ""}`,
          color: 0xf59e0b,
          footer: { text: "NewHopeGGN Arena System" },
          timestamp: new Date().toISOString(),
        }],
      }, { webhookUrl: env.discordWebhookUrlForPage("arena") });
    } catch (e) {
      console.error("Discord webhook failed:", e);
    }

    return NextResponse.json({ ok: true, event: updatedEvent, matches: updatedMatches });
  }

  return NextResponse.json({ ok: true, event });
}
