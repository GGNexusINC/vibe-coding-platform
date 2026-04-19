import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";
import { sendDiscordWebhook } from "@/lib/discord";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST join a team
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Please sign in with Discord" }, { status: 401 });
  }

  const body = await req.json();
  const { team_id, event_id } = body;

  if (!team_id || !event_id) {
    return NextResponse.json({ ok: false, error: "Team ID and Event ID required" }, { status: 400 });
  }

  // Check if already in this event
  const { data: existingMembership } = await supabase
    .from("arena_team_members")
    .select("team_id, role, arena_teams!inner(name, leader_username)")
    .eq("event_id", event_id)
    .eq("discord_id", session.discord_id)
    .single();

  if (existingMembership) {
    // Get team name from the array (arena_teams is an array from the join)
    const teamInfo = (existingMembership.arena_teams as unknown as { name: string }[])?.[0];
    return NextResponse.json({ 
      ok: false, 
      error: "You are already in a team for this event",
      currentTeam: teamInfo?.name
    }, { status: 409 });
  }

  // Get team info
  const { data: team } = await supabase
    .from("arena_teams")
    .select("name, event_id, leader_discord_id, leader_username")
    .eq("id", team_id)
    .single();

  if (!team) {
    return NextResponse.json({ ok: false, error: "Team not found" }, { status: 404 });
  }

  // Check team size limit
  const { data: memberCount } = await supabase
    .from("arena_team_members")
    .select("id", { count: "exact" })
    .eq("team_id", team_id);

  // Get event max team size
  const { data: event } = await supabase
    .from("arena_events")
    .select("team_size")
    .eq("id", event_id)
    .single();

  if (memberCount && memberCount.length >= (event?.team_size || 4)) {
    return NextResponse.json({ ok: false, error: "Team is full" }, { status: 403 });
  }

  // Add member
  const { data: member, error } = await supabase
    .from("arena_team_members")
    .insert({
      team_id,
      event_id,
      discord_id: session.discord_id,
      username: session.username || "Unknown",
      avatar_url: session.avatar_url,
      role: "member",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Log event
  await supabase.from("arena_event_logs").insert({
    event_id,
    type: "member_joined",
    message: `${session.username} joined team "${team.name}"`,
    discord_id: session.discord_id,
    username: session.username || "Unknown",
  });

  return NextResponse.json({ ok: true, member, teamName: team.name });
}

// DELETE kick/leave team (leader kicks member, or member leaves)
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const team_id = searchParams.get("teamId");
  const member_id = searchParams.get("memberId"); // specific member to kick (leader only)

  if (!team_id) {
    return NextResponse.json({ ok: false, error: "Team ID required" }, { status: 400 });
  }

  // Get team info
  const { data: team } = await supabase
    .from("arena_teams")
    .select("name, event_id, leader_discord_id, leader_username")
    .eq("id", team_id)
    .single();

  if (!team) {
    return NextResponse.json({ ok: false, error: "Team not found" }, { status: 404 });
  }

  const isLeader = team.leader_discord_id === session.discord_id;

  // Determine who to remove
  let targetMemberId = member_id;
  
  if (!targetMemberId) {
    // No member specified - self removal (leaving)
    const { data: selfMember } = await supabase
      .from("arena_team_members")
      .select("id, role")
      .eq("team_id", team_id)
      .eq("discord_id", session.discord_id)
      .single();

    if (!selfMember) {
      return NextResponse.json({ ok: false, error: "You are not in this team" }, { status: 404 });
    }

    if (selfMember.role === "leader") {
      return NextResponse.json({ 
        ok: false, 
        error: "Team leader cannot leave. Transfer leadership or delete the team." 
      }, { status: 403 });
    }

    targetMemberId = selfMember.id;
  } else {
    // Leader kicking specific member
    if (!isLeader) {
      return NextResponse.json({ ok: false, error: "Only team leader can kick members" }, { status: 403 });
    }

    // Verify member exists in this team
    const { data: targetMember } = await supabase
      .from("arena_team_members")
      .select("id, discord_id, username, role")
      .eq("id", targetMemberId)
      .eq("team_id", team_id)
      .single();

    if (!targetMember) {
      return NextResponse.json({ ok: false, error: "Member not found in this team" }, { status: 404 });
    }

    if (targetMember.role === "leader") {
      return NextResponse.json({ ok: false, error: "Cannot kick the team leader" }, { status: 403 });
    }
  }

  // Get member info before deletion (for logging)
  const { data: memberToRemove } = await supabase
    .from("arena_team_members")
    .select("discord_id, username")
    .eq("id", targetMemberId)
    .single();

  // Remove member
  const { error } = await supabase
    .from("arena_team_members")
    .delete()
    .eq("id", targetMemberId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const actionType = isLeader && member_id ? "member_kicked" : "member_left";
  const message = isLeader && member_id 
    ? `${team.leader_username} kicked ${memberToRemove?.username} from "${team.name}"`
    : `${session.username} left team "${team.name}"`;

  // Log event
  await supabase.from("arena_event_logs").insert({
    event_id: team.event_id,
    type: actionType,
    message,
    discord_id: session.discord_id,
    username: session.username || "Unknown",
  });

  // Send Discord notification for kicks
  if (isLeader && member_id && memberToRemove) {
    try {
      await sendDiscordWebhook({
        content: `⚠️ **Team Update**\n\n${memberToRemove.username} was kicked from **${team.name}** by ${team.leader_username}`,
        username: "NewHopeGGN Arena",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
      });
    } catch (e) {
      console.error("Discord webhook failed:", e);
    }
  }

  return NextResponse.json({ 
    ok: true, 
    message: isLeader && member_id ? "Member kicked" : "Left team",
    teamName: team.name 
  });
}
