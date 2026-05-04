import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { sendDiscordWebhook } from "@/lib/discord";
import { getDynamicWebhookUrl } from "@/lib/webhooks";
import { cleanupExpiredRewardItems, REWARD_CLAIM_WINDOW_MS } from "@/lib/reward-inventory";
import { getOnceHumanItemArt } from "@/lib/once-human-items";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

// Discord embed colors per action
const ACTION_COLORS: Record<string, number> = {
  admin_given:    0x22c55e, // green
  user_used:      0xf59e0b, // amber
  user_saved:     0x06b6d4, // cyan
  admin_revoked:  0xef4444, // red
  admin_restored: 0xa855f7, // violet
};

const ACTION_TITLES: Record<string, string> = {
  admin_given:    "📦 Package Given",
  user_used:      "✅ Package Used",
  user_saved:     "💾 Package Saved for Next Wipe",
  admin_revoked:  "🗑️ Package Revoked",
  admin_restored: "♻️ Package Restored",
};

// Discord webhook for package logs
async function logToDiscord(
  action: string,
  itemName: string,
  itemType: string,
  userId: string,
  actorName: string,
  details?: Record<string, any>
) {
  const title = ACTION_TITLES[action] || `📦 ${action}`;
  const color = ACTION_COLORS[action] ?? 0x64748b;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "Item", value: `\`${itemName}\``, inline: true },
    { name: "Type", value: `\`${itemType}\``, inline: true },
    { name: "User", value: `<@${userId}>`, inline: true },
    { name: "Discord ID", value: `\`${userId}\``, inline: true },
    { name: "Action By", value: actorName, inline: true },
  ];

  if (details?.wipe_cycle) {
    fields.push({ name: "Wipe Cycle", value: `\`${details.wipe_cycle}\``, inline: true });
  }
  if (details?.reason && details.reason !== "Admin given" && details.reason !== "User initiated") {
    fields.push({ name: "Reason", value: details.reason, inline: false });
  }
  if (details?.old_status && details?.new_status) {
    fields.push({ name: "Status Change", value: `${details.old_status} → ${details.new_status}`, inline: true });
  }

  const isInsuranceClaim = action === "user_used" && itemType === "insurance";

  try {
    const webhookUrl = await getDynamicWebhookUrl("inventory");
    if (!webhookUrl) return false;

    await sendDiscordWebhook({
      username: "NewHope Package System",
      content: isInsuranceClaim ? `🛡️ <@&${process.env.DISCORD_STAFF_ROLE_ID || "STAFF_ROLE_ID"}> **Insurance claim — staff action required!**` : undefined,
      embeds: [
        {
          title,
          color,
          fields,
          footer: { text: "NewHopeGGN · Package System" },
          timestamp: new Date().toISOString(),
        },
      ],
    }, { webhookUrl });
    return true;
  } catch (e) {
    console.error("Package log webhook failed:", e);
    return false;
  }
}

// GET - Fetch all inventory (admin only) with optional filters
export async function GET(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  await cleanupExpiredRewardItems(supabase);

  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const item_type = searchParams.get("item_type");
  const status = searchParams.get("status");
  const wipe_cycle = searchParams.get("wipe_cycle");

  let query = supabase.from("user_inventory").select("*");

  if (user_id) query = query.eq("user_id", user_id);
  if (item_type) query = query.eq("item_type", item_type);
  if (status) query = query.eq("status", status);
  if (wipe_cycle) query = query.eq("wipe_cycle", wipe_cycle);

  const { data: items, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Get summary stats
  const { data: stats } = await supabase
    .from("user_inventory")
    .select("status, item_type");

  const summary = {
    total: stats?.length || 0,
    available: stats?.filter(i => i.status === "available").length || 0,
    used: stats?.filter(i => i.status === "used").length || 0,
    saved: stats?.filter(i => i.status === "saved").length || 0,
    insurance_count: stats?.filter(i => i.item_type === "insurance").length || 0,
  };

  return NextResponse.json({ ok: true, items: items || [], summary });
}

// POST - Batch update items (admin only)
export async function POST(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const body = await req.json().catch(() => ({}));
  const { item_ids, action } = body;

  if (!item_ids || !Array.isArray(item_ids) || !action) {
    return NextResponse.json({ ok: false, error: "Missing item_ids or action" }, { status: 400 });
  }

  // Fetch items for logging BEFORE update/delete
  const { data: itemsToLog } = await supabase
    .from("user_inventory")
    .select("*")
    .in("id", item_ids);

  let updateData: any = {};
  const actorName = adminSession.username || adminSession.discord_id;

  if (action === "mark_used") {
    updateData = { status: "used", used_date: new Date().toISOString() };
  } else if (action === "mark_available") {
    updateData = { status: "available", used_date: null };
  } else if (action === "mark_saved") {
    updateData = { status: "saved" };
  } else if (action === "delete") {
    const { error } = await supabase
      .from("user_inventory")
      .delete()
      .in("id", item_ids);
    
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Log deletion
    if (itemsToLog) {
      for (const item of itemsToLog) {
        await logToDiscord("admin_revoked", item.item_name, item.item_type, item.user_id, actorName, { 
          reason: "Admin deleted",
          wipe_cycle: item.wipe_cycle
        });
      }
    }

    return NextResponse.json({ ok: true, message: `${item_ids.length} items deleted` });
  } else {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_inventory")
    .update(updateData)
    .in("id", item_ids);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Log updates
  if (itemsToLog) {
    for (const item of itemsToLog) {
      await logToDiscord(
        action === "mark_used" ? "user_used" : action === "mark_saved" ? "user_saved" : "admin_restored",
        item.item_name,
        item.item_type,
        item.user_id,
        actorName,
        { 
          old_status: item.status, 
          new_status: updateData.status || action,
          wipe_cycle: item.wipe_cycle
        }
      );
    }
  }

  return NextResponse.json({ ok: true, message: `${item_ids.length} items updated` });
}

// PUT - Give a package to a user (admin only)
export async function PUT(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession?.discord_id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const body = await req.json().catch(() => ({}));
  const { 
    user_id, 
    user_name,
    item_type, 
    item_slug, 
    item_name, 
    wipe_cycle,
    expires_at,
    reason,
    metadata = {} 
  } = body;

  if (!user_id || !item_type || !item_slug) {
    return NextResponse.json({ 
      ok: false, 
      error: "Missing required fields: user_id, item_type, item_slug" 
    }, { status: 400 });
  }

  const adminName = adminSession.username || adminSession.discord_id;
  const itemDisplayName = item_name || item_slug;
  const currentWipe = wipe_cycle || getCurrentWipeCycle();
  const isReward = item_type === "reward" || Boolean(metadata?.reward_source);
  const now = new Date().toISOString();
  const rewardExpiresAt = isReward
    ? expires_at || new Date(new Date(now).getTime() + REWARD_CLAIM_WINDOW_MS).toISOString()
    : expires_at || null;
  const art = getOnceHumanItemArt(
    typeof metadata?.reward_prize === "string" ? metadata.reward_prize : itemDisplayName,
  );
  const itemMetadata = {
    ...metadata,
    ...(isReward
      ? {
          reward_source: metadata?.reward_source || "admin",
          reward_prize: metadata?.reward_prize || itemDisplayName.replace(/^Whack-a-Mole Reward:\s*/i, ""),
          reward_won_at: metadata?.reward_won_at || now,
          reward_claim_expires_at: metadata?.reward_claim_expires_at || rewardExpiresAt,
          reward_claim_window_hours: metadata?.reward_claim_window_hours || 48,
          reward_claim_note: metadata?.reward_claim_note || "Admin-granted reward. Claim within 48 hours.",
          item_image_url: metadata?.item_image_url || art?.image,
          item_art_source_name: metadata?.item_art_source_name || art?.sourceName,
          item_art_source_url: metadata?.item_art_source_url || art?.sourceUrl,
          item_art_verified: metadata?.item_art_verified ?? Boolean(art?.image),
        }
      : {}),
    given_by: adminSession.discord_id,
    given_by_name: adminName,
    reason: reason || (isReward ? "Admin reward given" : "Admin given"),
    given_at: now,
  };

  // Create the inventory item
  const insertPayload = {
    user_id,
    item_type,
    item_slug,
    item_name: itemDisplayName,
    wipe_cycle: currentWipe,
    status: "available",
    expires_at: rewardExpiresAt,
    metadata: itemMetadata,
  };

  const { data: item, error } = await supabase
    .from("user_inventory")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    if (String(error.message || "").includes("expires_at")) {
      const fallbackPayload = { ...insertPayload } as Record<string, unknown>;
      delete fallbackPayload.expires_at;
      const fallback = await supabase
        .from("user_inventory")
        .insert(fallbackPayload)
        .select()
        .single();

      if (fallback.error) {
        return NextResponse.json({ ok: false, error: fallback.error.message }, { status: 500 });
      }

      const discordNotified = await logToDiscord(
        "admin_given",
        itemDisplayName,
        item_type,
        user_id,
        adminName,
        { reason: reason || (isReward ? "Admin reward given" : "Admin given"), wipe_cycle: currentWipe }
      );

      return NextResponse.json({
        ok: true,
        item: fallback.data,
        message: `Package "${itemDisplayName}" given to user ${user_id}`,
        discord_notified: discordNotified,
      });
    }

    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Log to Discord (this happens via trigger too, but we want immediate Discord notification)
  const discordNotified = await logToDiscord(
    "admin_given",
    itemDisplayName,
    item_type,
    user_id,
    adminName,
    { reason: reason || (isReward ? "Admin reward given" : "Admin given"), wipe_cycle: currentWipe }
  );

  return NextResponse.json({ 
    ok: true, 
    item,
    message: `Package "${itemDisplayName}" given to user ${user_id}`,
    discord_notified: discordNotified,
  });
}

function getCurrentWipeCycle(): string {
  const now = new Date();
  return `wipe-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
