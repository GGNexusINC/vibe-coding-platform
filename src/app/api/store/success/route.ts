import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDynamicWebhookUrl } from "@/lib/webhooks";
import { sendDiscordWebhook } from "@/lib/discord";
import { fulfillPurchasePoints } from "@/lib/store-points";

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

    const resolvedPackSlug = (packSlug || slugFromCustomId || "unknown") as string;
    const resolvedAmount = String(amount || price || "0.00");
    const txnId = transactionId || orderId || "N/A";

    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const { getCurrentWipeCycle } = await import("@/lib/reward-inventory");
    const { logActivity } = await import("@/lib/activity-log");

    const supabase = createSupabaseAdminClient();

    // ── MULTI-ITEM PARSING ───────────────────────────────────────────────────
    // Check if the packSlug contains multiple items (format: slug:qty,slug:qty)
    const itemPairs = resolvedPackSlug.includes(",") 
      ? resolvedPackSlug.split(",") 
      : [resolvedPackSlug.includes(":") ? resolvedPackSlug : `${resolvedPackSlug}:1`];
    
    const itemsToFulfill = itemPairs.map((p: string) => {
      const [slug, qtyStr] = p.split(":");
      return { slug, quantity: parseInt(qtyStr || "1") };
    });
    // ─────────────────────────────────────────────────────────────────────────

    if (userId) {
      for (const item of itemsToFulfill) {
        for (let i = 0; i < item.quantity; i++) {
          const itemName = item.slug.charAt(0).toUpperCase() + item.slug.slice(1).replace(/-/g, " ") + " Package";
          
          // ── IDEMPOTENCY CHECK ───────────────────────────────────────────────
          const { data: existing } = await supabase
            .from("user_inventory")
            .select("id")
            .eq("user_id", userId)
            .eq("item_slug", item.slug)
            .contains("metadata", { transaction_id: txnId, instance: i }) // Use instance to distinguish multiple of same slug
            .maybeSingle();

          if (existing?.id) {
            console.log(`[store/success] Already fulfilled item ${item.slug} instance ${i} — skipping`);
            continue;
          }
          // ───────────────────────────────────────────────────────────────────

          const { error: invError } = await supabase.from("user_inventory").insert({
            user_id: userId,
            item_type: "pack",
            item_slug: item.slug,
            item_name: itemName,
            wipe_cycle: getCurrentWipeCycle(),
            status: "available",
            metadata: {
              transaction_id: txnId,
              instance: i,
              order_id: orderId,
              price: resolvedAmount,
              referred_by: referredBy || null,
              payer_email: payer?.email_address || null,
              intent_id: intentId,
              purchase_date: new Date().toISOString(),
              source: "paypal_client_fallback",
            },
          });

          if (!invError) {
            try {
              await supabase.from("package_logs").insert({
                user_id: userId,
                action: "user_purchased",
                item_name: itemName,
                item_type: "pack",
                details: `Purchased via Cart ($${resolvedAmount}). Item ${i+1}/${item.quantity}. Txn: ${txnId}. Referrer: ${referredBy || "Direct"}`,
                action_at: new Date().toISOString(),
              });
            } catch (e) {
              console.warn("[store/success] Package log failed:", e);
            }
          }
        }
      }

      // ── POINTS FULFILLMENT ───────────────────────────────────────────────
      const pointsGrant = await fulfillPurchasePoints(
        supabase,
        userId,
        txnId,
        resolvedPackSlug,
        resolvedAmount,
        packName || resolvedPackSlug,
        "paypal_client_fallback"
      );

      await logActivity({
        type: "purchase_success",
        username,
        discordId: userId,
        details: `PayPal Cart Purchase (client confirmed): ${resolvedPackSlug} ($${resolvedAmount}). Txn: ${txnId}${
          pointsGrant.pointsEarned > 0 ? ` [Points Awarded: +${pointsGrant.pointsEarned}]` : ""
        }`,
        metadata: { txnId, orderId, amount: resolvedAmount, packSlug: resolvedPackSlug, pointsEarned: pointsGrant.pointsEarned },
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
          description: `**Cart Purchase** (${itemsToFulfill.length} items) confirmed via PayPal SDK capture.`,
          color: 0x22c55e,
          fields: [
            { name: "Amount", value: `**$${resolvedAmount} USD**`, inline: true },
            { name: "Status", value: "`CAPTURED`", inline: true },
            { name: "Source", value: "`client_sdk`", inline: true },
            { name: "User (Discord)", value: userId ? `<@${userId}> (${username})` : "Guest / Not Linked", inline: false },
            { name: "Items", value: `\`${resolvedPackSlug}\``, inline: true },
            { name: "Transaction ID", value: `\`${txnId}\``, inline: true },
            { name: "Order ID", value: `\`${orderId || "N/A"}\``, inline: true },
            { name: "Referrer", value: referredBy || "Direct", inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "PayPal Client SDK · NewHopeGGN" },
        }],
      }, { webhookUrl: salesWebhookUrl }).catch(() => {});
    }

    return NextResponse.json({ ok: true, message: "Cart items granted successfully" });
  } catch (err: any) {
    console.error("[store/success] Unhandled error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
