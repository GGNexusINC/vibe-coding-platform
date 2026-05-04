import { NextResponse } from "next/server";
import { getDynamicWebhookUrl } from "@/lib/webhooks";
import { sendDiscordWebhook } from "@/lib/discord";

/**
 * PayPal Webhook Handler
 * Target URL for PayPal: https://newhopeggn.vercel.app/api/webhooks/paypal
 * Events to subscribe to: PAYMENT.SALE.COMPLETED, CHECKOUT.ORDER.APPROVED
 */
export async function POST(req: Request) {
  const salesWebhookUrl = await getDynamicWebhookUrl("store-sales");
  try {
    const body = await req.json();
    const eventType = body.event_type;
    const resource = body.resource || {};


    console.log(`[paypal-webhook] Received ${eventType} — resource: ${resource.id || "N/A"}`);


    // Extract details based on event type
    let amount = "0.00";
    let currency = "USD";
    let status = "Unknown";
    let buyerEmail = "Unknown";
    let customId = "";
    let packName = "Store Purchase";
    let transactionId = resource.id || "N/A";

    // Handle multiple possible event types
    const isSale = eventType === "PAYMENT.SALE.COMPLETED";
    const isOrder = eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "CHECKOUT.ORDER.COMPLETED";
    const isCapture = eventType === "PAYMENT.CAPTURE.COMPLETED";

    if (isSale) {
      amount = resource.amount?.total || "0.00";
      currency = resource.amount?.currency || "USD";
      status = resource.state || "completed";
      buyerEmail = resource.parent_payment || resource.payer_email || "N/A";
    } else if (isOrder) {
      const purchase = resource.purchase_units?.[0];
      amount = purchase?.amount?.value || "0.00";
      currency = purchase?.amount?.currency_code || "USD";
      status = resource.status || "approved";
      buyerEmail = resource.payer?.email_address || "N/A";
    } else if (isCapture) {
      amount = resource.amount?.value || "0.00";
      currency = resource.amount?.currency_code || "USD";
      status = resource.status || "completed";
      buyerEmail = "Check PayPal Dashboard";
    } else {
      // Unhandled event type — ignore silently
      return NextResponse.json({ ok: true, message: "Event type not handled" });
    }

    // ── ROBUST CUSTOM ID EXTRACTION ──────────────────────────────────────────
    // We search all possible locations for custom_id across v1 and v2 APIs
    customId =
      resource.custom_id ||
      resource.custom ||
      resource.purchase_units?.[0]?.custom_id ||
      resource.purchase_units?.[0]?.custom ||
      resource.supplementary_data?.related_ids?.custom_id ||
      body.custom_id ||
      "";

    if (!customId || !customId.includes("|")) {
      // Deep search entire body for anything matching our format (contains |)
      const findCustomId = (obj: any): string | null => {
        if (!obj || typeof obj !== "object") return null;
        
        // Check direct properties first
        if (typeof obj.custom_id === "string" && obj.custom_id.includes("|")) return obj.custom_id;
        if (typeof obj.custom === "string" && obj.custom.includes("|")) return obj.custom;
        
        // Recurse
        for (const val of Object.values(obj)) {
          if (typeof val === "string" && val.includes("|")) return val;
          if (val && typeof val === "object" && !Array.isArray(val)) {
            const found = findCustomId(val);
            if (found) return found;
          }
        }
        return null;
      };
      const found = findCustomId(body);
      if (found) {
        customId = found;
        console.log(`[paypal-webhook] Deep search found customId: "${customId}"`);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── STORE-ORIGIN GUARD ────────────────────────────────────────────────────
    // Store purchases always embed a customId in the format: userId|username|packSlug|intentId
    // If customId is missing or doesn't match the expected format, it might be a guest purchase 
    // or a non-store transaction. We'll proceed to notify Discord but skip auto-fulfillment.
    // ── IDENTITY RESOLUTION & HEURISTIC RECOVERY ──────────────────────────────
    let parts = (customId || "").split("|");
    let userId = parts[0] || null;
    let username = parts[1] || null;
    let packSlug = parts[2] || null;
    let intentId = parts[3] || null;

    const isGuest = !userId || userId === "guest";
    
    // If identity is missing, try to recover from recent purchase intents
    if (isGuest || !packSlug) {
      try {
        console.log(`[paypal-webhook] Identity missing. Attempting heuristic recovery for amount: $${amount}...`);
        const { readActivityEntries } = await import("@/lib/activity-store");
        const recent = await readActivityEntries(20);
        
        // Find most recent intent that hasn't been fulfilled yet (roughly) 
        // and matches the price. We filter for intents within the last 30 mins.
        const now = new Date().getTime();
        const match = recent.find(r => {
          if (r.type !== "purchase_intent") return false;
          const age = now - new Date(r.createdAt).getTime();
          if (age > 30 * 60 * 1000) return false; // Too old
          
          const intentPrice = r.metadata?.price || 0;
          return String(intentPrice) === String(Math.round(parseFloat(amount)));
        });

        if (match) {
          userId = match.discordId || userId;
          username = match.username || username;
          packSlug = (match.metadata?.packSlug as string) || packSlug;
          intentId = (match.metadata?.intentId as string) || intentId;
          
          console.log(`[paypal-webhook] ⚡ Heuristic recovery success! Linked to ${username} (${userId}) for ${packSlug}`);
        }
      } catch (e) {
        console.error("[paypal-webhook] Heuristic recovery failed:", e);
      }
    }

    const isStorePurchase = Boolean(userId && packSlug && (userId !== "guest"));
    if (!isStorePurchase) {
      console.log(`[paypal-webhook] Could not resolve store purchase for customId: "${customId}"`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (packSlug) {
      packName = packSlug.charAt(0).toUpperCase() + packSlug.slice(1).replace(/-/g, " ") + " Package";
    } else if (resource.description) {
      packName = resource.description.replace(" - NewHopeGGN", "");
    }


    // 1. Log to Discord immediately if we have a URL
    if (salesWebhookUrl) {
      const isTest = transactionId.includes("TEST") || transactionId.includes("SIMULATED");
      const isRecovered = isGuest && userId && userId !== "guest";
      
      const embed = {
        title: isTest ? "🧪 Simulated Sale (Test)" : "💰 New Successful Sale!",
        description: isRecovered 
          ? `A purchase of **${packName}** was linked via heuristic recovery! ⚡`
          : `A purchase of **${packName}** was completed successfully.`,
        color: isRecovered ? 0x06b6d4 : (isTest ? 0x6366f1 : 0x22c55e), // Cyan for recovered, Indigo for test, Emerald for real
        fields: [
          { name: "Amount", value: `**$${amount} ${currency}**`, inline: true },
          { name: "Status", value: `\`${status}\``, inline: true },
          { name: "Buyer", value: buyerEmail, inline: true },
          { name: "User (Discord)", value: (userId && userId !== "guest") ? `<@${userId}> (${username || "Unknown"})` : "Guest / Not Linked", inline: false },
          { name: "Discord ID", value: `\`${userId || "N/A"}\``, inline: true },
          { name: "Pack Identifier", value: `\`${packSlug || "N/A"}\``, inline: true },
          { name: "Transaction ID", value: `\`${transactionId}\``, inline: true },
          { name: "Tracking ID", value: `\`${intentId || "N/A"}\``, inline: true },
          { name: "Fulfillment", value: isStorePurchase ? "✅ Automated" : "⚠️ Manual Required", inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "PayPal Automation · NewHopeGGN" },
      };

      await sendDiscordWebhook(
        {
          username: isTest ? "PayPal Test Bot" : "PayPal Sales Bot",
          avatar_url: "https://www.paypalobjects.com/webstatic/icon/pp258.png",
          embeds: [embed],
        },
        { webhookUrl: salesWebhookUrl }
      ).catch((e) => console.error("[paypal-webhook] Discord notification failed:", e));
    }

    // 2. Log activity for EVERY successful sale (even if not fulfilled)
    try {
      const { logActivity } = await import("@/lib/activity-log");
      await logActivity({
        type: "purchase_success",
        username: username || (userId === "guest" ? "Guest" : "Unknown"),
        discordId: userId && userId !== "guest" ? userId : undefined,
        details: `PayPal Purchase Success: ${packName} ($${amount}). Transaction: ${transactionId} [Identified: ${isStorePurchase ? "YES" : "NO"}]`,
        metadata: { transactionId, amount, currency, packSlug, buyerEmail, eventType, customId }
      }).catch(() => {});
    } catch (e) {
      console.warn("[paypal-webhook] Activity logging failed:", e);
    }

    // 3. Add to User Inventory (Automated Fulfillment) if we know the user
    const canFulfill = userId && userId !== "guest" && packSlug;
    if (canFulfill) {
      try {
        const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
        const { getCurrentWipeCycle } = await import("@/lib/reward-inventory");
        
        const supabase = createSupabaseAdminClient();
        
        // Give the actual pack
        const { error: invError } = await supabase.from("user_inventory").insert({
          user_id: userId,
          item_type: "pack",
          item_slug: packSlug,
          item_name: packName,
          wipe_cycle: getCurrentWipeCycle(),
          status: "available",
          metadata: {
            transaction_id: transactionId,
            price: amount,
            payer_email: buyerEmail,
            purchase_date: new Date().toISOString(),
            source: "paypal_webhook",
          },
        });

        if (invError && salesWebhookUrl) {
          // LOG ERROR TO DISCORD IF FAILED
          await sendDiscordWebhook({
            username: "NewHope System Error",
            embeds: [{
              title: "❌ Fulfillment Error",
              description: `Failed to add **${packName}** to user **${userId}**.`,
              color: 0xef4444, // Red
              fields: [
                { name: "Database Error", value: `\`${invError.message}\`` },
                { name: "Table", value: "`user_inventory`" }
              ],
              timestamp: new Date().toISOString()
            }]
          }, { webhookUrl: salesWebhookUrl }).catch(() => {});
        }

        // Log to package logs
        await supabase.from("package_logs").insert({
          user_id: userId,
          action: "user_purchased",
          item_name: packName,
          item_type: "pack",
          details: `Purchased via PayPal Webhook ($${amount}). Txn: ${transactionId}. Status: ${invError ? "FAILED: " + invError.message : "FULFILLED"}`,
          action_at: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error("[paypal-webhook] Fulfillment/Logging error:", err);
        if (salesWebhookUrl) {
          await sendDiscordWebhook({
            username: "NewHope Critical Error",
            embeds: [{
              title: "🚨 Critical Webhook Error",
              description: `System crashed while fulfilling **${packName}**.`,
              color: 0x991b1b,
              fields: [{ name: "Error", value: `\`${err.message || String(err)}\`` }],
              timestamp: new Date().toISOString()
            }]
          }, { webhookUrl: salesWebhookUrl }).catch(() => {});
        }
      }
    } else {
      console.warn("[paypal-webhook] Could not fulfill: userId or packSlug missing from customId", { customId });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[paypal-webhook] Top-level error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// Support GET for testing if the endpoint exists
export async function GET() {
  return new Response("PayPal Webhook Listener Active", { status: 200 });
}
