import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { sendDiscordWebhook } from "@/lib/discord";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  const title = ACTION_TITLES[action] || `� ${action}`;
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
    });
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

  let updateData: any = {};

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

  // Create the inventory item
  const { data: item, error } = await supabase
    .from("user_inventory")
    .insert({
      user_id,
      item_type,
      item_slug,
      item_name: itemDisplayName,
      wipe_cycle: currentWipe,
      status: "available",
      metadata: {
        ...metadata,
        given_by: adminSession.discord_id,
        given_by_name: adminName,
        reason: reason || "Admin given",
        given_at: new Date().toISOString(),
      }
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Log to Discord (this happens via trigger too, but we want immediate Discord notification)
  const discordNotified = await logToDiscord(
    "admin_given",
    itemDisplayName,
    item_type,
    user_id,
    adminName,
    { reason: reason || "Admin given", wipe_cycle: currentWipe }
  );

  // Also manually create a log entry with Discord status
  await supabase.from("package_logs").insert({
    inventory_item_id: item.id,
    user_id,
    user_name: user_name || user_id,
    item_name: itemDisplayName,
    item_type,
    action: "admin_given",
    action_by: adminSession.discord_id,
    action_by_name: adminName,
    details: {
      reason: reason || "Admin given",
      wipe_cycle: currentWipe,
      item_id: item.id,
    },
    discord_notified: discordNotified,
  });

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
