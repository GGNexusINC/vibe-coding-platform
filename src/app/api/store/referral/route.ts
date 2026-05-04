import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { getDynamicWebhookUrl } from "@/lib/webhooks";
import { brandDiscordWebhookPayload } from "@/lib/discord";

/**
 * Log a staff referral before the user redirects to PayPal.
 * This is a best-effort log — we don't block the user if it fails.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { packName, packSlug, price, referredBy, user, intentId } = body;

    await logActivity({
      type: "purchase_intent",
      username: user?.username || "Guest",
      discordId: user?.discord_id,
      details: `Store referral logged: ${packName} ($${price}) — Referred by: ${referredBy ?? "None"} [Tracking ID: ${intentId || "N/A"}]`,
      metadata: { packName, packSlug, price, referredBy, intentId }
    });

    const attemptsWebhook = await getDynamicWebhookUrl("store-attempts");
    if (attemptsWebhook) {
      await fetch(attemptsWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandDiscordWebhookPayload({
          username: "NewHopeGGN Store",
          embeds: [{
            title: "🛒 Checkout Attempt Started",
            color: 0x8b5cf6, // Violet
            fields: [
              { name: "User", value: user?.username || "Guest", inline: true },
              { name: "Pack", value: packName || "Unknown", inline: true },
              { name: "Price", value: `$${price || 0}`, inline: true },
              { name: "Referred By", value: referredBy || "None", inline: true },
              { name: "Tracking ID", value: `\`${intentId || "N/A"}\``, inline: true },
            ],
            timestamp: new Date().toISOString(),
          }]
        })),
      }).catch(e => console.error("[store/referral] Webhook failed:", e));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Non-critical — don't block checkout
    console.error("[store/referral] Error:", error);
    return NextResponse.json({ ok: false });
  }
}
