import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reconcileUserStorePoints } from "@/lib/store-points";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Auto-reconcile any past store purchases that were not credited
    await reconcileUserStorePoints(supabase, user.discord_id).catch((e) =>
      console.warn("[user/points] Reconciliation failed:", e)
    );

    // Fetch points balance
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("points")
      .eq("discord_id", user.discord_id)
      .maybeSingle();

    const points = profile?.points ?? 0;

    // Fetch recent points history
    const { data: history } = await supabase
      .from("points_ledger")
      .select("id, amount, reason, created_at")
      .eq("discord_id", user.discord_id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ ok: true, points, history: history ?? [] });
  } catch (err: any) {
    console.error("[user/points] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
