import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { getFallbackRaid, isMissingRaidTableError, updateFallbackRaid } from "@/lib/raid-store";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// POST - Update your own role or admin can update others
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
    const { role, targetDiscordId } = body;

    if (!role) {
      return NextResponse.json({ ok: false, error: "Role is required" }, { status: 400 });
    }

    const sb = getSupabase();

    // Check if user is in the raid
    const { data: requester, error: requesterError } = await sb
      .from('raid_participants')
      .select('role')
      .eq('raid_id', raidId)
      .eq('discord_id', user.discord_id)
      .single();

    if (requesterError && isMissingRaidTableError(requesterError)) {
      const fallbackRaid = await getFallbackRaid(sb, raidId);
      if (!fallbackRaid) {
        return NextResponse.json({ ok: false, error: "Raid not found" }, { status: 404 });
      }

      const fallbackRequester = fallbackRaid.raid_participants.find((item) => item.discord_id === user.discord_id);
      const fallbackTargetId = targetDiscordId || user.discord_id;
      const fallbackIsLeader = fallbackRequester?.role === 'leader';

      if (fallbackTargetId !== user.discord_id && !fallbackIsLeader) {
        return NextResponse.json(
          { ok: false, error: "Only raid leader can assign roles to others" },
          { status: 403 }
        );
      }

      const fallbackTarget = fallbackRaid.raid_participants.find((item) => item.discord_id === fallbackTargetId);
      if (!fallbackTarget) {
        return NextResponse.json(
          { ok: false, error: "Target user is not in this raid" },
          { status: 404 }
        );
      }

      await updateFallbackRaid(sb, raidId, (currentRaid) => ({
        ...currentRaid,
        raid_participants: currentRaid.raid_participants.map((item) =>
          item.discord_id === fallbackTargetId ? { ...item, role } : item
        ),
      }));

      return NextResponse.json({
        ok: true,
        message: `Role updated to ${role}`,
      });
    }

    const isLeader = requester?.role === 'leader';
    const targetId = targetDiscordId || user.discord_id;

    // Only leader can assign roles to others
    if (targetId !== user.discord_id && !isLeader) {
      return NextResponse.json(
        { ok: false, error: "Only raid leader can assign roles to others" },
        { status: 403 }
      );
    }

    // Check target participant exists
    const { data: targetParticipant } = await sb
      .from('raid_participants')
      .select('id, username')
      .eq('raid_id', raidId)
      .eq('discord_id', targetId)
      .single();

    if (!targetParticipant) {
      return NextResponse.json(
        { ok: false, error: "Target user is not in this raid" },
        { status: 404 }
      );
    }

    // Update role
    const { error } = await sb
      .from('raid_participants')
      .update({ role })
      .eq('id', targetParticipant.id);

    if (error) throw error;

    // Log activity
    await sb.from('raid_activity_log').insert({
      raid_id: raidId,
      actor_id: user.discord_id,
      actor_username: user.username,
      action: 'role_changed',
      details: { 
        target_id: targetId,
        target_username: targetParticipant.username,
        new_role: role,
        previous_role: requester?.role || 'member'
      },
    });

    return NextResponse.json({ 
      ok: true, 
      message: `Role updated to ${role}` 
    });
  } catch (e) {
    console.error("[raids/role] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to update role" },
      { status: 500 }
    );
  }
}
