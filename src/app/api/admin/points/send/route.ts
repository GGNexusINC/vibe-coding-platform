import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireEnv } from "@/lib/env";

export async function POST(req: Request) {
  const user = await getSession();
  const adminIds = requireEnv("ADMIN_DISCORD_IDS").split(",");
  if (!user || !adminIds.includes(user.discord_id)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { discordId, amount, reason } = await req.json();

    if (!discordId || typeof amount !== "number" || !reason) {
      return NextResponse.json({ ok: false, error: "Invalid request payload" }, { status: 400 });
    }

    const sb = createSupabaseAdminClient();

    // 1. Fetch current points
    const { data: profile, error: profileErr } = await sb
      .from("user_profiles")
      .select("points")
      .eq("discord_id", discordId)
      .single();

    if (profileErr && profileErr.code !== "PGRST116") {
      console.error("[admin/points/send] Error fetching profile:", profileErr);
      return NextResponse.json({ ok: false, error: "Failed to fetch profile" }, { status: 500 });
    }

    const currentPoints = profile?.points || 0;
    const newPoints = currentPoints + amount;

    // 2. Update or insert profile
    const { error: upsertErr } = await sb
      .from("user_profiles")
      .upsert({ discord_id: discordId, points: newPoints });

    if (upsertErr) {
      console.error("[admin/points/send] Error updating points:", upsertErr);
      return NextResponse.json({ ok: false, error: "Failed to update points" }, { status: 500 });
    }

    // 3. Record ledger entry
    const { error: ledgerErr } = await sb
      .from("points_ledger")
      .insert({
        discord_id: discordId,
        amount: amount,
        reason: `[Admin Adjusted] ${reason}`,
        metadata: { admin_id: user.discord_id, action: "admin_send_points" }
      });

    if (ledgerErr) {
      console.error("[admin/points/send] Ledger error (points updated but ledger failed):", ledgerErr);
    }

    return NextResponse.json({ ok: true, newPoints });
  } catch (err: any) {
    console.error("[admin/points/send] Server error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
