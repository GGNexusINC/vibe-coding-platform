import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import {
  DEFAULT_RAID_ROLES,
  createFallbackRaid,
  isMissingRaidTableError,
  listFallbackRaids,
} from "@/lib/raid-store";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET - List active raids
export async function GET() {
  try {
    const sb = getSupabase();
    
    // Clean expired raids first
    try {
      await sb.rpc('clean_expired_raids');
    } catch { /* ignore RPC errors */ }
    
    // Get active raids with participants
    const { data: raids, error } = await sb
      .from('raids')
      .select(`
        *,
        raid_participants (*)
      `)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingRaidTableError(error)) {
        const fallbackRaids = await listFallbackRaids(sb);
        return NextResponse.json({ ok: true, raids: fallbackRaids, roles: DEFAULT_RAID_ROLES });
      }
      throw error;
    }

    // Get available roles
    const { data: roles, error: rolesError } = await sb
      .from('raid_roles')
      .select('*')
      .order('display_order', { ascending: true });

    const fallbackRaids = await listFallbackRaids(sb).catch((fallbackError) => {
      console.warn("[raids] fallback list unavailable:", fallbackError);
      return [];
    });
    const realRaids = raids || [];
    const mergedRaids = [
      ...fallbackRaids,
      ...realRaids.filter((raid: { id: string }) => !fallbackRaids.some((fallbackRaid) => fallbackRaid.id === raid.id)),
    ];

    return NextResponse.json({ ok: true, raids: mergedRaids, roles: rolesError ? DEFAULT_RAID_ROLES : roles || DEFAULT_RAID_ROLES });
  } catch (e) {
    console.error("[raids] GET error:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch raids" },
      { status: 500 }
    );
  }
}

// POST - Create new raid
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      targetLocation,
      raidType = 'normal',
      enemyCount,
      description,
      teamSize = 4,
      myRole = 'leader',
      startTime,
      expiresInMinutes = 120,
    } = body;

    if (!targetLocation?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Target location is required" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    // Create the raid
    const { data: raid, error: raidError } = await sb
      .from('raids')
      .insert({
        created_by: user.discord_id,
        creator_username: user.username,
        creator_avatar_url: user.avatar_url,
        target_location: targetLocation.trim(),
        raid_type: raidType,
        enemy_count: enemyCount ? parseInt(enemyCount) : null,
        description: description?.trim() || null,
        team_size: parseInt(teamSize) || 4,
        start_time: startTime || null,
        expires_at: new Date(Date.now() + expiresInMinutes * 60000).toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (raidError && isMissingRaidTableError(raidError)) {
      const fallbackRaid = await createFallbackRaid(sb, {
        user,
        targetLocation,
        raidType,
        enemyCount: enemyCount ? parseInt(enemyCount) : null,
        description,
        teamSize: parseInt(teamSize) || 4,
        startTime,
        expiresInMinutes,
        role: myRole || 'leader',
      });
      await notifyRaidCreated(fallbackRaid, user);
      return NextResponse.json({ ok: true, raid: fallbackRaid });
    }

    if (raidError || !raid) {
      throw raidError || new Error("Failed to create raid");
    }

    // Add creator as leader
    const { error: participantError } = await sb.from('raid_participants').insert({
      raid_id: raid.id,
      discord_id: user.discord_id,
      username: user.username,
      avatar_url: user.avatar_url,
      role: myRole || 'leader',
      status: 'confirmed',
    });

    if (participantError && isMissingRaidTableError(participantError)) {
      const fallbackRaid = await createFallbackRaid(sb, {
        user,
        targetLocation,
        raidType,
        enemyCount: enemyCount ? parseInt(enemyCount) : null,
        description,
        teamSize: parseInt(teamSize) || 4,
        startTime,
        expiresInMinutes,
        role: myRole || 'leader',
      });
      await notifyRaidCreated(fallbackRaid, user);
      return NextResponse.json({ ok: true, raid: fallbackRaid });
    }

    if (participantError) throw participantError;

    // Log activity
    await sb.from('raid_activity_log').insert({
      raid_id: raid.id,
      actor_id: user.discord_id,
      actor_username: user.username,
      action: 'created',
      details: { target_location: targetLocation, raid_type: raidType },
    });

    // Send DM to creator and log to admin channel
    await notifyRaidCreated(raid, user);

    return NextResponse.json({ ok: true, raid });
  } catch (e) {
    console.error("[raids] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to create raid" },
      { status: 500 }
    );
  }
}

// Send DM to user and log to admin channel
async function notifyRaidCreated(raid: any, creator: any) {
  const logsWebhookUrl = env.discordWebhookUrlForPage("tickets") || env.discordWebhookUrlForPage("support");
  
  // 1. Send DM to creator
  if (BOT_TOKEN && creator.discord_id) {
    try {
      // Create DM channel
      const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: { 
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ recipient_id: creator.discord_id }),
      });
      
      if (dmRes.ok) {
        const dm = await dmRes.json();
        
        // Send DM
        await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            content: `� **Your raid has been created!**\n\n**Target:** ${raid.target_location}\n**Type:** ${raid.raid_type}\n**Team Size:** ${raid.team_size}\n\nManage your raid: ${process.env.NEXT_PUBLIC_SITE_URL}/beta/raids?id=${raid.id}`,
          }),
        });
      }
    } catch (e) {
      console.error("[raids] DM notification failed:", e);
    }
  }
  
  // 2. Send log to admin logs channel
  if (logsWebhookUrl) {
    try {
      await fetch(logsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Raid System Logs',
          embeds: [{
            title: '📝 Raid Created (Log)',
            description: `**${creator.username}** created a new raid`,
            color: 0x64748b,
            fields: [
              { name: 'Creator', value: `<@${creator.discord_id}> (${creator.username})`, inline: true },
              { name: 'Target', value: raid.target_location, inline: true },
              { name: 'Type', value: raid.raid_type, inline: true },
              { name: 'Team Size', value: `${raid.team_size}`, inline: true },
              { name: 'Raid ID', value: raid.id, inline: false },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      });
    } catch (e) {
      console.error("[raids] Log webhook failed:", e);
    }
  }
}
