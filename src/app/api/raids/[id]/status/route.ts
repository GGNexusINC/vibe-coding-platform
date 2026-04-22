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

    // Send Discord notification for status change
    await notifyDiscordStatusChange(raid, newStatus, user);

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

async function notifyDiscordStatusChange(raid: any, status: string, actor: any) {
  const webhookUrl = env.discordWebhookUrlForPage("general-chat");
  if (!webhookUrl) return;

  const statusLabels: Record<string, { text: string; color: number; emoji: string }> = {
    active: { text: 'Raid is now ACTIVE!', color: 0x22c55e, emoji: '🚀' },
    completed: { text: 'Raid COMPLETED!', color: 0x3b82f6, emoji: '✅' },
    cancelled: { text: 'Raid CANCELLED', color: 0xef4444, emoji: '❌' },
  };

  const info = statusLabels[status];
  if (!info) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'NewHopeGGN Raid System',
        embeds: [{
          title: `${info.emoji} ${info.text}`,
          description: `Raid on **${raid.target_location}** has been updated.`,
          color: info.color,
          fields: [
            { name: '🎯 Target', value: raid.target_location, inline: true },
            { name: '👤 Updated By', value: actor.username, inline: true },
            { name: '📊 Status', value: status.toUpperCase(), inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (e) {
    console.error("[raids/status] Discord notification failed:", e);
  }
}
