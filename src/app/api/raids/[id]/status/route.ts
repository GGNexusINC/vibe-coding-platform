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

// POST - Update raid status (start, complete, cancel)
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
    const { status: newStatus } = body;

    if (!newStatus || !['active', 'completed', 'cancelled'].includes(newStatus)) {
      return NextResponse.json(
        { ok: false, error: "Valid status required (active, completed, cancelled)" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    // Get raid and check permissions
    const { data: raid, error: raidError } = await sb
      .from('raids')
      .select('created_by, target_location, status')
      .eq('id', raidId)
      .single();

    if (raidError || !raid) {
      return NextResponse.json({ ok: false, error: "Raid not found" }, { status: 404 });
    }

    // Only creator can change status
    if (raid.created_by !== user.discord_id) {
      return NextResponse.json(
        { ok: false, error: "Only raid leader can change status" },
        { status: 403 }
      );
    }

    // Update status
    const { error: updateError } = await sb
      .from('raids')
      .update({ status: newStatus })
      .eq('id', raidId);

    if (updateError) throw updateError;

    // Log activity
    await sb.from('raid_activity_log').insert({
      raid_id: raidId,
      actor_id: user.discord_id,
      actor_username: user.username,
      action: 'status_changed',
      details: { from: raid.status, to: newStatus },
    });

    // Send DM notifications to participants and log to admin channel
    await notifyStatusChange(raidId, raid, newStatus, user, sb);

    return NextResponse.json({ 
      ok: true, 
      message: `Raid ${newStatus}` 
    });
  } catch (e) {
    console.error("[raids/status] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to update status" },
      { status: 500 }
    );
  }
}

// Send DMs to all participants and log to admin channel
async function notifyStatusChange(raidId: string, raid: any, status: string, actor: any, sb: any) {
  const logsWebhookUrl = env.discordWebhookUrlForPage("tickets") || env.discordWebhookUrlForPage("support");

  const statusLabels: Record<string, { text: string; emoji: string; message: string }> = {
    active: { 
      text: 'ACTIVE', 
      emoji: '🚀',
      message: 'The raid is now **ACTIVE**! Get ready to move out!'
    },
    completed: { 
      text: 'COMPLETED', 
      emoji: '✅',
      message: 'The raid has been **COMPLETED**. Great work team!'
    },
    cancelled: { 
      text: 'CANCELLED', 
      emoji: '❌',
      message: 'The raid has been **CANCELLED**.'
    },
  };

  const info = statusLabels[status];
  if (!info) return;

  // Get all participants
  const { data: participants } = await sb
    .from('raid_participants')
    .select('discord_id, username, status')
    .eq('raid_id', raidId)
    .in('status', ['joined', 'confirmed']);

  // 1. Send DM to all participants
  if (BOT_TOKEN && participants && participants.length > 0) {
    for (const participant of participants) {
      if (!participant.discord_id) continue;
      
      try {
        const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
          method: 'POST',
          headers: { 
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ recipient_id: participant.discord_id }),
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
              content: `${info.emoji} **Raid Update: ${info.text}**\n\n**Target:** ${raid.target_location}\n\n${info.message}\n\nView details: ${process.env.NEXT_PUBLIC_SITE_URL}/beta/raids?id=${raidId}`,
            }),
          });
        }
      } catch (e) {
        console.error(`[raids/status] DM to ${participant.username} failed:`, e);
      }
    }
  }
  
  // 2. Send log to admin channel
  if (logsWebhookUrl) {
    try {
      await fetch(logsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Raid System Logs',
          embeds: [{
            title: `${info.emoji} Raid Status Changed (Log)`,
            color: status === 'active' ? 0x22c55e : status === 'completed' ? 0x3b82f6 : 0xef4444,
            fields: [
              { name: 'Target', value: raid.target_location, inline: true },
              { name: 'Status', value: info.text, inline: true },
              { name: 'Updated By', value: `<@${actor.discord_id}> (${actor.username})`, inline: true },
              { name: 'Participants Notified', value: `${participants?.length || 0} users`, inline: true },
              { name: 'Raid ID', value: raidId, inline: false },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      });
    } catch (e) {
      console.error("[raids/status] Log webhook failed:", e);
    }
  }
}
