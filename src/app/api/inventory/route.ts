import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { sendDiscordWebhook } from "@/lib/discord";
import { getAdminSession } from "@/lib/admin-auth";
import { createTicketChannel, sendTicketMessage, sendTicketToWebhook } from "@/lib/discord-bot";
import { env } from "@/lib/env";
import { cleanupExpiredRewardItems, getCurrentWipeCycle } from "@/lib/reward-inventory";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

// GET - Fetch user's inventory
export async function GET(req: Request) {
  const user = await getSession();
  if (!user?.discord_id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabase();
  await cleanupExpiredRewardItems(supabase, user.discord_id);

  const { data: items, error } = await supabase
    .from("user_inventory")
    .select("*")
    .eq("user_id", user.discord_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: items || [] });
}

// POST - Add item to inventory (admin only or via purchase webhook)
export async function POST(req: Request) {
  const adminSession = await getAdminSession();
  const body = await req.json().catch(() => ({}));
  
  // Allow service role or admin
  const isAdmin = !!adminSession?.discord_id;
  
  if (!isAdmin && !body.service_key) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const { user_id, item_type, item_slug, item_name, wipe_cycle, metadata, expires_at } = body;

  if (!user_id || !item_type || !item_slug) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_inventory")
    .insert({
      user_id,
      item_type,
      item_slug,
      item_name: item_name || item_slug,
      wipe_cycle: wipe_cycle || getCurrentWipeCycle(),
      metadata: metadata || {},
      status: "available",
      expires_at: expires_at || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

// PATCH - Use an item (insurance, etc.)
export async function PATCH(req: Request) {
  const user = await getSession();
  if (!user?.discord_id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabase();
  await cleanupExpiredRewardItems(supabase, user.discord_id);

  const body = await req.json().catch(() => ({}));
  const { item_id, action, reason } = body;

  if (!item_id || !action) {
    return NextResponse.json({ ok: false, error: "Missing item_id or action" }, { status: 400 });
  }

  // Get the item
  const { data: item, error: fetchError } = await supabase
    .from("user_inventory")
    .select("*")
    .eq("id", item_id)
    .eq("user_id", user.discord_id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
  }

  if (item.status !== "available") {
    return NextResponse.json({ ok: false, error: `Item is ${item.status}` }, { status: 400 });
  }

  let updateData: any = {};

  if (action === "use") {
    // Use the item now
    updateData = {
      status: "used",
      used_date: new Date().toISOString(),
      metadata: { 
        ...item.metadata, 
        used_by: user.discord_id,
        used_by_name: user.username,
        used_at: new Date().toISOString(),
        reason: reason || "User initiated",
      }
    };
  } else if (action === "save") {
    // Save for next wipe
    updateData = {
      status: "saved",
      metadata: { 
        ...item.metadata, 
        saved_for_next_wipe: true,
        saved_by: user.discord_id,
        saved_by_name: user.username,
        saved_at: new Date().toISOString(),
      }
    };
  } else {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("user_inventory")
    .update(updateData)
    .eq("id", item_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Send Discord notification
  let discordNotified = false;
  let supportTicket: { id: string; channelId: string | null } | null = null;
  try {
    const isUse = action === "use";
    const isInsurance = item.item_type === "insurance";
    const isReward = item.item_type === "reward" || Boolean(item.metadata?.reward_source);

    const ACTION_COLORS: Record<string, number> = {
      use:  0xf59e0b,  // amber
      save: 0x06b6d4,  // cyan
    };

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      { name: "Item", value: `\`${item.item_name}\``, inline: true },
      { name: "Type", value: `\`${item.item_type}\``, inline: true },
      { name: "User", value: `<@${user.discord_id}>`, inline: true },
      { name: "Discord ID", value: `\`${user.discord_id}\``, inline: true },
      { name: "Wipe Cycle", value: `\`${item.wipe_cycle}\``, inline: true },
    ];

    if (isInsurance) {
      fields.push({ name: "Purchased", value: new Date(item.purchase_date).toLocaleDateString(), inline: true });
    }
    if (reason) {
      fields.push({ name: "Reason", value: reason, inline: false });
    }
    if (isReward) {
      fields.push({ name: "Claim Window", value: item.expires_at ? `<t:${Math.floor(new Date(item.expires_at).getTime() / 1000)}:R>` : "48 hours", inline: true });
      fields.push({ name: "Source", value: String(item.metadata?.reward_source ?? "reward"), inline: true });
    }

    const title = isUse
      ? (isReward ? "🏆 Reward Claimed" : isInsurance ? "🛡️ Insurance Claimed" : "✅ Package Used")
      : isReward ? "💾 Reward Saved" : "💾 Package Saved for Next Wipe";

    await sendDiscordWebhook({
      username: "NewHope Package System",
      avatar_url: user.avatar_url || undefined,
      content: isInsurance && isUse
        ? `<@&${process.env.DISCORD_STAFF_ROLE_ID || "STAFF_ROLE_ID"}> **Insurance claim — staff action required!**`
        : undefined,
      embeds: [
        {
          title,
          color: ACTION_COLORS[action] ?? 0x64748b,
          fields,
          footer: { text: "NewHopeGGN · Package System" },
          timestamp: new Date().toISOString(),
        },
      ],
    });
    discordNotified = true;

    if (isUse) {
      const subject = isReward
        ? `Prize claim: ${item.item_name}`
        : isInsurance
          ? `Insurance claim: ${item.item_name}`
          : `Package claim: ${item.item_name}`;
      const ticketId = crypto.randomUUID();
      const claimMessage = [
        `Item: ${item.item_name}`,
        `Type: ${item.item_type}`,
        isReward ? `Source: ${String(item.metadata?.reward_source ?? "reward")}` : null,
        `User: <@${user.discord_id}> (${user.username})`,
        `Discord ID: ${user.discord_id}`,
        item.metadata?.reward_prize ? `Prize label: ${String(item.metadata.reward_prize)}` : null,
        item.expires_at ? `Claim window: <t:${Math.floor(new Date(item.expires_at).getTime() / 1000)}:F>` : null,
        reason ? `Reason: ${reason}` : null,
      ].filter(Boolean).join("\n");

      const ticketChannel = await createTicketChannel(user.username, subject);
      if (ticketChannel) {
        await sendTicketMessage(
          ticketChannel.id,
          {
            username: user.username,
            discord_id: user.discord_id,
            avatar_url: user.avatar_url || undefined,
          },
          subject,
          claimMessage
        );
      }

      const supportWebhook = env.discordWebhookUrlForPage("support");
      if (supportWebhook) {
        await sendTicketToWebhook(
          supportWebhook,
          {
            username: user.username,
            discord_id: user.discord_id,
            avatar_url: user.avatar_url || undefined,
          },
          subject,
          claimMessage,
          ticketChannel?.id
        );
      }

      const { error: ticketError } = await supabase.from("tickets").insert({
        id: ticketId,
        guest_username: user.username,
        subject,
        message: claimMessage,
        discord_channel_id: ticketChannel?.id ?? null,
        status: "open",
        user_id: user.discord_id,
      });
      if (ticketError) {
        console.error("[inventory] Failed to create reward ticket:", ticketError);
      } else {
        supportTicket = {
          id: ticketId,
          channelId: ticketChannel?.id ?? null,
        };
      }
    }
  } catch (e) {
    console.error("Package webhook failed:", e);
  }

  return NextResponse.json({ 
    ok: true, 
    item: updated,
    discord_notified: discordNotified,
    support_ticket: supportTicket,
  });
}

// DELETE - Remove item (admin only)
export async function DELETE(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const { searchParams } = new URL(req.url);
  const item_id = searchParams.get("item_id");

  if (!item_id) {
    return NextResponse.json({ ok: false, error: "Missing item_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_inventory")
    .delete()
    .eq("id", item_id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
