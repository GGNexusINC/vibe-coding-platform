import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";
import { createClient } from "@supabase/supabase-js";

// Send DM to a Discord user
async function sendDiscordDM(userId: string, message: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error("DISCORD_BOT_TOKEN not set");
    return false;
  }

  try {
    // First, create/open a DM channel
    const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: userId }),
    });

    if (!dmRes.ok) {
      console.error("Failed to create DM channel:", await dmRes.text());
      return false;
    }

    const dmChannel = await dmRes.json();

    // Then send the message
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: message }),
    });

    if (!msgRes.ok) {
      console.error("Failed to send DM:", await msgRes.text());
      return false;
    }

    return true;
  } catch (e) {
    console.error("Error sending DM:", e);
    return false;
  }
}

// POST - Send notifications to teams
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { event_id, match_id, message, team_name, broadcast, teams } = body;

  if (!message) {
    return NextResponse.json({ ok: false, error: "Message required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Also send to webhook for staff channel visibility
    await sendDiscordWebhook({
      content: broadcast 
        ? `📢 **TO ALL TEAMS**\n\n${message}`
        : `📢 **Team ${team_name || "Notification"}**\n\n${message}`,
      username: "NewHopeGGN Arena",
      avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
    });

    // Get Discord IDs to DM
    let discordIds: string[] = [];

    if (broadcast && event_id) {
      // Get all team members for this event
      const { data: allTeams } = await supabase
        .from("arena_teams")
        .select("leader_discord_id, arena_team_members(discord_id)")
        .eq("event_id", event_id);
      
      allTeams?.forEach((team: any) => {
        if (team.leader_discord_id) discordIds.push(team.leader_discord_id);
        team.arena_team_members?.forEach((m: any) => {
          if (m.discord_id && !discordIds.includes(m.discord_id)) {
            discordIds.push(m.discord_id);
          }
        });
      });
    } else if (teams && teams.length > 0) {
      // Specific teams passed
      const { data: teamData } = await supabase
        .from("arena_teams")
        .select("leader_discord_id, arena_team_members(discord_id)")
        .in("id", teams);
      
      teamData?.forEach((team: any) => {
        if (team.leader_discord_id) discordIds.push(team.leader_discord_id);
        team.arena_team_members?.forEach((m: any) => {
          if (m.discord_id && !discordIds.includes(m.discord_id)) {
            discordIds.push(m.discord_id);
          }
        });
      });
    }

    // Send DMs
    const dmResults = await Promise.all(
      discordIds.map(async (id) => {
        const success = await sendDiscordDM(id, `🏟️ **NewHopeGGN Arena**\n\n${message}`);
        return { id, success };
      })
    );

    const successful = dmResults.filter(r => r.success).length;

    return NextResponse.json({ 
      ok: true, 
      message: "Notification sent",
      dms_sent: successful,
      total_recipients: discordIds.length
    });
  } catch (e) {
    console.error("Failed to send notification:", e);
    return NextResponse.json({ ok: false, error: "Failed to send notification" }, { status: 500 });
  }
}
