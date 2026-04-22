import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";

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

    return NextResponse.json({ ok: true, message: "Joined raid successfully" });
  } catch (e) {
    console.error("[raids/join] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to join raid" },
      { status: 500 }
    );
  }
}
