import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAdminSession, isAdminDiscordId } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const adminSession = await getAdminSession();
  const userSession = await getSession();

  const adminDiscordIds = (process.env.ADMIN_DISCORD_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const actorId = adminSession?.discord_id || userSession?.discord_id || "admin";

  const isAuthorized = Boolean(
    adminSession ||
    (userSession?.discord_id && (isAdminDiscordId(userSession.discord_id) || adminDiscordIds.includes(userSession.discord_id)))
  );

  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { discordId, amount, reason } = await req.json();

    if (!discordId || typeof amount !== "number" || amount <= 0 || !reason) {
      return NextResponse.json({ ok: false, error: "Invalid request payload. Must provide valid target user, amount > 0, and reason." }, { status: 400 });
    }

    const sb = createSupabaseAdminClient();
    let targetDiscordId = String(discordId).trim();
    let targetUsername: string | null = null;

    // 1. Fetch current profile by exact discord_id
    let { data: profile } = await sb
      .from("user_profiles")
      .select("discord_id, points, username")
      .eq("discord_id", targetDiscordId)
      .maybeSingle();

    // If not found by exact discord_id, try case-insensitive match on username
    if (!profile) {
      const { data: profileByName } = await sb
        .from("user_profiles")
        .select("discord_id, points, username")
        .ilike("username", targetDiscordId)
        .maybeSingle();

      if (profileByName?.discord_id) {
        targetDiscordId = profileByName.discord_id;
        targetUsername = profileByName.username;
        profile = profileByName;
      }
    } else {
      targetUsername = profile.username || null;
    }

    const currentPoints = profile?.points || 0;
    const newPoints = currentPoints + amount;

    // 2. Upsert profile with new points balance
    const { error: upsertErr } = await sb
      .from("user_profiles")
      .upsert({ discord_id: targetDiscordId, points: newPoints }, { onConflict: "discord_id" });

    if (upsertErr) {
      console.error("[admin/points/send] Error updating points in user_profiles:", upsertErr);
      return NextResponse.json({ ok: false, error: `Failed to update points: ${upsertErr.message}` }, { status: 500 });
    }

    // 3. Record in points_ledger
    const { error: ledgerErr } = await sb
      .from("points_ledger")
      .insert({
        discord_id: targetDiscordId,
        amount: amount,
        reason: `[Admin Grant] ${reason}`,
        metadata: { admin_id: actorId, action: "admin_send_points" }
      });

    if (ledgerErr) {
      console.warn("[admin/points/send] Ledger entry warning:", ledgerErr);
    }

    // 4. Record in package_logs so it appears in Package Logs & Activity Logs
    try {
      await sb.from("package_logs").insert({
        user_id: targetDiscordId,
        action: "admin_given",
        item_name: `${amount} Theuri Points`,
        item_type: "points",
        details: `Granted ${amount} Theuri Points by admin ${actorId}. Reason: ${reason}. New Balance: ${newPoints} Pts`,
        action_by: actorId,
        action_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("[admin/points/send] Package logs error:", e);
    }

    console.log(`[admin/points/send] Granted ${amount} pts to ${targetDiscordId} (${targetUsername || "N/A"}). New balance: ${newPoints}`);

    return NextResponse.json({
      ok: true,
      targetDiscordId,
      targetUsername,
      pointsAdded: amount,
      previousPoints: currentPoints,
      newPoints,
    });
  } catch (err: any) {
    console.error("[admin/points/send] Server error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
