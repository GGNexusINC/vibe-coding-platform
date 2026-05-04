import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDynamicWebhookUrl } from "@/lib/webhooks";
import { sendDiscordWebhook } from "@/lib/discord";

/**
 * POST /api/store/success
 * Client-side fulfillment fallback called after PayPal SDK capture.
 * Idempotent: checks if transaction already fulfilled before inserting.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();

    const body = await req.json().catch(() => ({}));
    // Support both old call shape (buy-button) and new shape (paypal-checkout)
    const {
      orderId,
      packSlug,
      packName,
      amount,
      price,
      customId,
      transactionId,
      referredBy,
      // Legacy fields from buy-button
      payer,
      user: legacyUser,
    } = body;

    // Parse customId if present — format: userId|username|packSlug|intentId
    const parts = (customId || "").split("|");
    const userIdFromCustomId = parts[0] !== "guest" ? parts[0] : null;
    const usernameFromCustomId = parts[1] !== "guest" ? parts[1] : null;
    const slugFromCustomId = parts[2] || null;
    const intentId = parts[3] || null;

    // Resolve identity — session is authoritative, fall back to customId, then body for guest/legacy calls
    const userId = session?.discord_id || userIdFromCustomId || legacyUser?.discord_id || null;
    const username = session?.username || usernameFromCustomId || legacyUser?.username || "Unknown";

    const resolvedPackSlug = packSlug || slugFromCustomId || "unknown";
    const resolvedPackName = packName ||
      (resolvedPackSlug.charAt(0).toUpperCase() + resolvedPackSlug.slice(1).replace(/-/g, " ") + " Package");
    const resolvedAmount = String(amount || price || "0.00");
    const txnId = transactionId || orderId || "N/A";

    console.log(`[store/success] ${resolvedPackName} for ${username} (${userId}). Txn: ${txnId}`);

    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const { getCurrentWipeCycle } = await import("@/lib/reward-inventory");
    const { logActivity } = await import("@/lib/activity-log");

    const supabase = createSupabaseAdminClient();

    if (userId) {
      // ── IDEMPOTENCY CHECK ───────────────────────────────────────────────────
      // If the webhook already fulfilled this, don't double-grant.
      const { data: existing } = await supabase
        .from("user_inventory")
        .select("id")
        .eq("user_id", userId)
        .eq("item_slug", resolvedPackSlug)
        .contains("metadata", { transaction_id: txnId })
        .maybeSingle();

      if (existing?.id) {
        console.log(`[store/success] Already fulfilled txn ${txnId} — skipping duplicate`);
        return NextResponse.json({ ok: true, message: "Already fulfilled", duplicate: true });
      }
      // ─────────────────────────────────────────────────────────────────────────

      const { error: invError } = await supabase.from("user_inventory").insert({
        user_id: userId,
        item_type: "pack",
        item_slug: resolvedPackSlug,
        item_name: resolvedPackName,
        wipe_cycle: getCurrentWipeCycle(),
        status: "available",
        metadata: {
          transaction_id: txnId,
          order_id: orderId,
          price: resolvedAmount,
          referred_by: referredBy || null,
          payer_email: payer?.email_address || null,
          intent_id: intentId,
          purchase_date: new Date().toISOString(),
          source: "paypal_client_fallback",
        },
      });

      if (invError) {
        console.error("[store/success] Inventory insert failed:", invError.message);
        return NextResponse.json({ ok: false, error: "Fulfillment failed" }, { status: 500 });
      }

      try {
        await supabase.from("package_logs").insert({
          user_id: userId,
          action: "user_purchased",
          item_name: resolvedPackName,
          item_type: "pack",
          details: `Purchased via PayPal SDK client-side ($${resolvedAmount}). Txn: ${txnId}. Order: ${orderId}. Intent: ${intentId || "N/A"}. Referrer: ${referredBy || "Direct"}`,
          action_at: new Date().toISOString(),
        });
      } catch { /* non-critical */ }


      await logActivity({
        type: "purchase_success",
        username,
        discordId: userId,
        details: `PayPal Purchase (client confirmed): ${resolvedPackName} ($${resolvedAmount}). Txn: ${txnId}`,
        metadata: { txnId, orderId, amount: resolvedAmount, packSlug: resolvedPackSlug },
      }).catch(() => {});
    }

    // Discord notification
    const salesWebhookUrl = await getDynamicWebhookUrl("store-sales");
    if (salesWebhookUrl) {
      await sendDiscordWebhook({
        username: "PayPal Sales Bot",
        avatar_url: "https://www.paypalobjects.com/webstatic/icon/pp258.png",
        embeds: [{
          title: "💰 New Successful Sale!",
          description: `**${resolvedPackName}** confirmed via PayPal SDK capture.`,
          color: 0x22c55e,
          fields: [
            { name: "Amount", value: `**$${resolvedAmount} USD**`, inline: true },
            { name: "Status", value: "`CAPTURED`", inline: true },
            { name: "Source", value: "`client_sdk`", inline: true },
            { name: "User (Discord)", value: userId ? `<@${userId}> (${username})` : "Guest / Not Linked", inline: false },
            { name: "Pack", value: `\`${resolvedPackSlug}\``, inline: true },
            { name: "Transaction ID", value: `\`${txnId}\``, inline: true },
            { name: "Order ID", value: `\`${orderId || "N/A"}\``, inline: true },
            { name: "Referrer", value: referredBy || "Direct", inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "PayPal Client SDK · NewHopeGGN" },
        }],
      }, { webhookUrl: salesWebhookUrl }).catch(() => {});
    }

    return NextResponse.json({ ok: true, message: "Pack granted successfully" });
  } catch (err: any) {
    console.error("[store/success] Unhandled error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
