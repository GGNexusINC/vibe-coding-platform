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

    return NextResponse.json({
      ok: true,
      points: profile?.points ?? 0,
      history: history ?? [],
    });
  } catch (err: any) {
    console.error("[admin/points] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
