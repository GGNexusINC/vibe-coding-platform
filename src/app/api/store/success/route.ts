import { NextResponse } from "next/server";
import { getDynamicWebhookUrl } from "@/lib/webhooks";
import { sendDiscordWebhook } from "@/lib/discord";
import { logActivity } from "@/lib/activity-log";

/**
 * Handle successful PayPal payment capture from the client
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, payer, packName, price, referredBy, user } = body;

    console.log(`[store-success] Received payment for ${packName} by ${user?.username || "guest"}`);

    // 1. Log to Database Activity
    await logActivity({
      type: "purchase_success",
      username: user?.username || "Guest",
      discordId: user?.discord_id,
      details: `Successful Purchase: ${packName} ($${price}). Order ID: ${orderId}. Referred by: ${referredBy}. Payer: ${payer?.email_address || "N/A"}`,
    });

    // 3. Add to User Inventory (Automated Fulfillment)
    const { createClient } = await import("@supabase/supabase-js");
    const { getCurrentWipeCycle } = await import("@/lib/reward-inventory");
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    if (user?.discord_id) {
      const { error: invError } = await supabase.from("user_inventory").insert({
        user_id: user.discord_id,
        item_type: "pack",
        item_slug: body.packSlug || "unknown",
        item_name: packName,
        wipe_cycle: getCurrentWipeCycle(),
        status: "available",
        metadata: {
          order_id: orderId,
          price: price,
          referred_by: referredBy,
          payer_email: payer?.email_address,
          purchase_date: new Date().toISOString(),
        },
      });

      if (invError) {
        console.error("[store-success] Failed to update inventory:", invError);
      } else {
        // Log to package_logs for admin tracking
        await supabase.from("package_logs").insert({
          user_id: user.discord_id,
          action: "user_purchased",
          item_name: packName,
          item_type: "pack",
          details: `Purchased ${packName} via PayPal ($${price}). Order: ${orderId}. Staff: ${referredBy}`,
          action_at: new Date().toISOString(),
        });
      }
    }

    // 2. Log to Discord "store-sales" Webhook
    const salesWebhookUrl = await getDynamicWebhookUrl("store-sales");
    if (salesWebhookUrl) {
      const embed = {
        title: "💎 New Store Sale!",
        color: 0x10b981, // Emerald 500
        thumbnail: { url: "https://newhopeggn.vercel.app/raidzone-bg.png" },
        fields: [
          { name: "Package", value: `**${packName}**`, inline: true },
          { name: "Amount", value: `**$${price} USD**`, inline: true },
          { name: "Status", value: "✅ Payment Captured", inline: true },
          { name: "Buyer", value: user?.discord_id ? `<@${user.discord_id}> (${user.username})` : "Guest", inline: false },
          { name: "Referrer", value: referredBy || "Direct", inline: true },
          { name: "Order ID", value: `\`${orderId}\``, inline: true },
          { name: "Payer Email", value: payer?.email_address || "N/A", inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "NewHopeGGN Store Automation" },
      };

      await sendDiscordWebhook(
        {
          username: "NewHopeGGN Sales Bot",
          avatar_url: "https://newhopeggn.vercel.app/raidzone-bg.png",
          embeds: [embed],
        },
        { webhookUrl: salesWebhookUrl }
      ).catch(err => console.error("[store-success] Discord log failed:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[store-success] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
