import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const sb = createSupabaseAdminClient();

  try {
    // Fetch top 10 scores
    // We group by discord_id and take the max score for each user
    // However, to keep it simple and performant, we'll just fetch the top 20 spins
    // and then filter for unique users in the app if needed, 
    // or just show the top all-time spins.
    const { data, error } = await sb
      .from("minigame_spins")
      .select("username, discord_id, avatar_url, score, prize_name, prize_rarity, spun_at")
      .order("score", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      scores: data || [],
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[minigame-leaderboard] error:", error);
    return NextResponse.json({ ok: false, scores: [], error: "Failed to load leaderboard" }, { status: 500 });
  }
}
