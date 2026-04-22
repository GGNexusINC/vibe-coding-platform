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

// POST - Leave a raid
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
    const sb = getSupabase();

    // Get participant record
    const { data: participant, error: participantError } = await sb
      .from('raid_participants')
      .select('id, role')
      .eq('raid_id', raidId)
      .eq('discord_id', user.discord_id)
      .single();

    if (participantError && isMissingRaidTableError(participantError)) {
      const fallbackRaid = await getFallbackRaid(sb, raidId);
      const fallbackParticipant = fallbackRaid?.raid_participants.find((item) => item.discord_id === user.discord_id);
      if (!fallbackParticipant) {
        return NextResponse.json({ ok: false, error: "You are not in this raid" }, { status: 400 });
      }

      if (fallbackParticipant.role === 'leader') {
        return NextResponse.json(
          { ok: false, error: "Raid leader cannot leave. Cancel the raid instead." },
          { status: 400 }
        );
      }

      await updateFallbackRaid(sb, raidId, (currentRaid) => ({
        ...currentRaid,
        raid_participants: currentRaid.raid_participants.map((item) =>
          item.discord_id === user.discord_id ? { ...item, status: 'left' } : item
        ),
      }));

      return NextResponse.json({ ok: true, message: "Left raid successfully" });
    }

    if (!participant) {
      return NextResponse.json({ ok: false, error: "You are not in this raid" }, { status: 400 });
    }

    if (participant.role === 'leader') {
      return NextResponse.json(
        { ok: false, error: "Raid leader cannot leave. Cancel the raid instead." },
        { status: 400 }
      );
    }

    // Update status to left
    const { error } = await sb
      .from('raid_participants')
      .update({ status: 'left' })
      .eq('id', participant.id);

    if (error) throw error;

    // Log activity
    await sb.from('raid_activity_log').insert({
      raid_id: raidId,
      actor_id: user.discord_id,
      actor_username: user.username,
      action: 'left',
      details: {},
    });

    return NextResponse.json({ ok: true, message: "Left raid successfully" });
  } catch (e) {
    console.error("[raids/leave] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to leave raid" },
      { status: 500 }
    );
  }
}
