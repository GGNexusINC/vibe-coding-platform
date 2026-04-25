import { NextResponse } from "next/server";
import { getDynamicWebhookUrl } from "@/lib/webhooks";
import { sendDiscordWebhook } from "@/lib/discord";

/**
 * PayPal Webhook Handler
 * Target URL for PayPal: https://newhopeggn.vercel.app/api/webhooks/paypal
 * Events to subscribe to: PAYMENT.SALE.COMPLETED, CHECKOUT.ORDER.APPROVED
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`[paypal-webhook] Received ${eventType}`);

    // Get the sales webhook URL from our dynamic settings
    const salesWebhookUrl = await getDynamicWebhookUrl("store-sales");
    if (!salesWebhookUrl) {
      console.warn("[paypal-webhook] No store-sales webhook configured");
      return NextResponse.json({ ok: true, message: "No webhook configured" });
    }

    // Extract details based on event type
    let amount = "0.00";
    let currency = "USD";
    let status = "Unknown";
    let buyerEmail = "Unknown";
    let customId = "";
    let packName = "Store Purchase";

    if (eventType === "PAYMENT.SALE.COMPLETED") {
      amount = resource.amount.total;
      currency = resource.amount.currency;
      status = resource.state;
      buyerEmail = resource.parent_payment || "N/A";
      customId = resource.custom || "";
    } else if (eventType === "CHECKOUT.ORDER.APPROVED") {
      const purchase = resource.purchase_units?.[0];
      amount = purchase?.amount?.value || "0.00";
      currency = purchase?.amount?.currency_code || "USD";
      status = resource.status;
      buyerEmail = resource.payer?.email_address || "N/A";
      customId = purchase?.custom_id || "";
    } else {
      // Unhandled event
      return NextResponse.json({ ok: true });
    }

    // Try to extract user info from customId if we passed it in the button
    // (We'll update the button to pass user info in the custom field)
    const [userId, username, packSlug] = customId.split("|");
    if (packSlug) packName = packSlug.charAt(0).toUpperCase() + packSlug.slice(1) + " Package";

    // Format Discord Embed
    const embed = {
      title: "💰 New Successful Sale!",
      color: 0x22c55e, // Emerald Green
      fields: [
        { name: "Amount", value: `**$${amount} ${currency}**`, inline: true },
        { name: "Status", value: `\`${status}\``, inline: true },
        { name: "Buyer Email", value: buyerEmail, inline: true },
        { name: "User", value: userId ? `<@${userId}> (${username})` : "Guest", inline: false },
        { name: "Item", value: packName, inline: true },
        { name: "Transaction ID", value: `\`${resource.id}\``, inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "PayPal Automation · NewHopeGGN" },
    };

    await sendDiscordWebhook(
      {
        username: "PayPal Sales Bot",
        avatar_url: "https://www.paypalobjects.com/webstatic/icon/pp258.png",
        embeds: [embed],
      },
      { webhookUrl: salesWebhookUrl }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[paypal-webhook] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// Support GET for testing if the endpoint exists
export async function GET() {
  return new Response("PayPal Webhook Listener Active", { status: 200 });
}
