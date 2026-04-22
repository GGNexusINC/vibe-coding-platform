import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// POST - Join a raid
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: raidId } = await params;
  const user = await getSession();
  
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { role = 'member' } = body;

    const sb = getSupabase();

    // Check if raid exists and is active
    const { data: raid, error: raidError } = await sb
      .from('raids')
      .select('status, team_size')
      .eq('id', raidId)
      .single();

    if (raidError || !raid) {
      return NextResponse.json({ ok: false, error: "Raid not found" }, { status: 404 });
    }

    if (raid.status === 'completed' || raid.status === 'cancelled' || raid.status === 'expired') {
      return NextResponse.json({ ok: false, error: "Raid is no longer active" }, { status: 400 });
    }

    // Check current participant count
    const { count, error: countError } = await sb
      .from('raid_participants')
      .select('*', { count: 'exact', head: true })
      .eq('raid_id', raidId)
      .in('status', ['joined', 'confirmed']);

    if (countError) throw countError;

    if (count && count >= raid.team_size) {
      return NextResponse.json({ ok: false, error: "Raid team is full" }, { status: 400 });
    }

    // Check if user already joined
    const { data: existing } = await sb
      .from('raid_participants')
      .select('id, status')
      .eq('raid_id', raidId)
      .eq('discord_id', user.discord_id)
      .single();

    if (existing) {
      if (existing.status === 'joined' || existing.status === 'confirmed') {
        return NextResponse.json({ ok: false, error: "You already joined this raid" }, { status: 400 });
      }
      // Update if they previously left/declined
      const { error: updateError } = await sb
        .from('raid_participants')
        .update({ status: 'joined', role, joined_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Join as new participant
      const { error: joinError } = await sb
        .from('raid_participants')
        .insert({
          raid_id: raidId,
          discord_id: user.discord_id,
          username: user.username,
          avatar_url: user.avatar_url,
          role,
          status: 'joined',
        });

      if (joinError) throw joinError;
    }

    // Log activity
    await sb.from('raid_activity_log').insert({
      raid_id: raidId,
      actor_id: user.discord_id,
      actor_username: user.username,
      action: 'joined',
      details: { role },
    });

    // Send notifications
    await notifyJoin(raidId, user, role, sb);

    return NextResponse.json({ ok: true, message: "Joined raid successfully" });
  } catch (e) {
    console.error("[raids/join] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to join raid" },
      { status: 500 }
    );
  }
}

// Send DM to user and log to admin channel
async function notifyJoin(raidId: string, user: any, role: string, sb: any) {
  const logsWebhookUrl = env.discordWebhookUrlForPage("tickets") || env.discordWebhookUrlForPage("support");
  
  // Get raid details
  const { data: raid } = await sb
    .from('raids')
    .select('target_location, raid_type, created_by')
    .eq('id', raidId)
    .single();

  if (!raid) return;

  // 1. Send DM to user who joined
  if (BOT_TOKEN && user.discord_id) {
    try {
      const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: { 
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ recipient_id: user.discord_id }),
      });
      
      if (dmRes.ok) {
        const dm = await dmRes.json();
        await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            content: `✅ **You've joined a raid!**\n\n**Target:** ${raid.target_location}\n**Your Role:** ${role}\n\nView raid: ${process.env.NEXT_PUBLIC_SITE_URL}/beta/raids?id=${raidId}`,
          }),
        });
      }
    } catch (e) {
      console.error("[raids/join] DM to user failed:", e);
    }
  }

  // 2. Send DM to raid creator
  if (BOT_TOKEN && raid.created_by && raid.created_by !== user.discord_id) {
    try {
      const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: { 
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ recipient_id: raid.created_by }),
      });
      
      if (dmRes.ok) {
        const dm = await dmRes.json();
        await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            content: `👥 **New team member!**\n\n**${user.username}** joined your raid on **${raid.target_location}** as **${role}**`,
          }),
        });
      }
    } catch (e) {
      console.error("[raids/join] DM to creator failed:", e);
    }
  }
  
  // 3. Send log to admin channel
  if (logsWebhookUrl) {
    try {
      await fetch(logsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Raid System Logs',
          embeds: [{
            title: '📝 User Joined Raid (Log)',
            color: 0x22c55e,
            fields: [
              { name: 'User', value: `<@${user.discord_id}> (${user.username})`, inline: true },
              { name: 'Role', value: role, inline: true },
              { name: 'Raid Target', value: raid.target_location, inline: true },
              { name: 'Raid ID', value: raidId, inline: false },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      });
    } catch (e) {
      console.error("[raids/join] Log webhook failed:", e);
    }
  }
}
