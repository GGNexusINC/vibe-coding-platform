import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

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

    if (error) throw error;

    // Get available roles
    const { data: roles } = await sb
      .from('raid_roles')
      .select('*')
      .order('display_order', { ascending: true });

    return NextResponse.json({ ok: true, raids: raids || [], roles: roles || [] });
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

    if (raidError || !raid) {
      throw raidError || new Error("Failed to create raid");
    }

    // Add creator as leader
    await sb.from('raid_participants').insert({
      raid_id: raid.id,
      discord_id: user.discord_id,
      username: user.username,
      avatar_url: user.avatar_url,
      role: 'leader',
      status: 'confirmed',
    });

    // Log activity
    await sb.from('raid_activity_log').insert({
      raid_id: raid.id,
      actor_id: user.discord_id,
      actor_username: user.username,
      action: 'created',
      details: { target_location: targetLocation, raid_type: raidType },
    });

    // Send Discord notification
    await notifyDiscordRaid(raid, user);

    return NextResponse.json({ ok: true, raid });
  } catch (e) {
    console.error("[raids] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to create raid" },
      { status: 500 }
    );
  }
}

async function notifyDiscordRaid(raid: any, creator: any) {
  const webhookUrl = env.discordWebhookUrlForPage("general-chat");
  if (!webhookUrl) return;

  const raidTypeLabels: Record<string, string> = {
    normal: '🚨 Raid Alert',
    counter: '🛡️ Counter Raid',
    defense: '⚔️ Base Defense',
  };

  const embed = {
    title: raidTypeLabels[raid.raid_type] || '🚨 Raid Alert',
    description: `**${raid.target_location}** is being targeted!`,
    color: raid.raid_type === 'defense' ? 0xef4444 : raid.raid_type === 'counter' ? 0x3b82f6 : 0xf59e0b,
    fields: [
      { name: '🎯 Target', value: raid.target_location, inline: true },
      { name: '👥 Team Size', value: `${raid.team_size} members`, inline: true },
      ...(raid.enemy_count ? [{ name: '⚠️ Enemy Count', value: `${raid.enemy_count}`, inline: true }] : []),
      ...(raid.description ? [{ name: '📝 Details', value: raid.description }] : []),
      { name: '🔗 Join Raid', value: `[Click here to join the raid team](${process.env.NEXT_PUBLIC_SITE_URL}/beta/raids?id=${raid.id})` },
    ],
    author: {
      name: `Called by ${creator.username}`,
      icon_url: creator.avatar_url,
    },
    footer: { text: 'NewHopeGGN Raid System • Join fast!' },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'NewHopeGGN Raid Alert',
        content: '@everyone A raid team is forming!',
        embeds: [embed],
      }),
    });
  } catch (e) {
    console.error("[raids] Discord notification failed:", e);
  }
}
