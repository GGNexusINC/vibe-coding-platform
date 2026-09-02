import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAdminSession, isAdminDiscordId } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const adminSession = await getAdminSession();
  const userSession = await getSession();

  const adminDiscordIds = (process.env.ADMIN_DISCORD_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);

  const isAuthorized = Boolean(
    adminSession ||
    (userSession?.discord_id && (isAdminDiscordId(userSession.discord_id) || adminDiscordIds.includes(userSession.discord_id)))
  );

  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const discordId = searchParams.get("id");

  if (!discordId) {
    return NextResponse.json({ ok: false, error: "Missing id param" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("points")
      .eq("discord_id", discordId)
      .maybeSingle();

    const { data: history } = await supabase
      .from("points_ledger")
      .select("id, amount, reason, created_at")
      .eq("discord_id", discordId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Full ledger sum (all rows, not just the last 10) to check the stored balance
    // actually reconciles with every transaction ever logged for this user.
    const { data: allLedgerAmounts } = await supabase
      .from("points_ledger")
      .select("amount")
      .eq("discord_id", discordId);

    const currentPoints = profile?.points ?? 0;
    const ledgerSum = (allLedgerAmounts ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const ledgerEntryCount = allLedgerAmounts?.length ?? 0;

    return NextResponse.json({
      ok: true,
      points: currentPoints,
      history: history ?? [],
      ledgerSum,
      ledgerEntryCount,
      // Non-zero means the profile's stored balance doesn't match the sum of its own transaction
      // history — a red flag worth investigating (manual DB edit, missing ledger entry, bug, etc).
      ledgerDiff: currentPoints - ledgerSum,
    });
  } catch (err: any) {
    console.error("[admin/points] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
