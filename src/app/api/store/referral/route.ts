import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";

/**
 * Log a staff referral before the user redirects to PayPal.
 * This is a best-effort log — we don't block the user if it fails.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { packName, packSlug, price, referredBy, user } = body;

    await logActivity({
      type: "purchase_intent",
      username: user?.username || "Guest",
      discordId: user?.discord_id,
      details: `Store referral logged: ${packName} ($${price}) — Referred by: ${referredBy ?? "None"} — Redirecting to PayPal.`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Non-critical — don't block checkout
    console.error("[store/referral] Error:", error);
    return NextResponse.json({ ok: false });
  }
}
