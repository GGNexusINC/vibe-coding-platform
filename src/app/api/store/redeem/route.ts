import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentWipeCycle } from "@/lib/reward-inventory";
import { REWARDS } from "@/lib/rewards";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  let body: { rewardSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const reward = REWARDS.find((r) => r.slug === body.rewardSlug);
  if (!reward) {
    return NextResponse.json({ ok: false, error: "Reward not found" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Fetch current points
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("points")
      .eq("discord_id", user.discord_id)
      .maybeSingle();

    const currentPoints = profile?.points ?? 0;

    if (currentPoints < reward.cost) {
      return NextResponse.json(
        { ok: false, error: `Not enough points. You have ${currentPoints} but need ${reward.cost}.` },
        { status: 400 }
      );
    }

    const newBalance = currentPoints - reward.cost;

    // Deduct points
    await supabase
      .from("user_profiles")
      .update({ points: newBalance })
      .eq("discord_id", user.discord_id);

    // Log in ledger (negative amount)
    await supabase.from("points_ledger").insert({
      discord_id: user.discord_id,
      amount: -reward.cost,
      reason: `Redeemed: ${reward.name}`,
      metadata: { item_slug: reward.slug, source: "points_redeem" },
    });

    // Add to user inventory as pending fulfillment
    await supabase.from("user_inventory").insert({
      user_id: user.discord_id,
      item_type: "reward",
      item_slug: reward.slug,
      item_name: reward.name,
      wipe_cycle: getCurrentWipeCycle(),
      status: "pending",
      metadata: {
        source: "points_redeem",
        points_cost: reward.cost,
        redeemed_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({ ok: true, newBalance, reward: reward.name });
  } catch (err: any) {
    console.error("[store/redeem] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
