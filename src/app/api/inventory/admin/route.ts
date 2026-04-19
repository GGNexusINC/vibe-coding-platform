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

// Discord webhook for package logs
async function logToDiscord(
  action: string,
  itemName: string,
  userId: string,
  adminName: string,
  details?: Record<string, any>
) {
  const icons: Record<string, string> = {
    admin_given: "🎁",
    user_used: "✅",
    user_saved: "💾",
    admin_revoked: "🗑️",
    admin_restored: "♻️",
    status_changed: "📝",
  };

  const actionLabels: Record<string, string> = {
    admin_given: "Package Given",
    user_used: "Package Used",
    user_saved: "Package Saved",
    admin_revoked: "Package Revoked",
    admin_restored: "Package Restored",
    status_changed: "Status Changed",
  };

  const icon = icons[action] || "📦";
  const label = actionLabels[action] || action;

  let content = `${icon} **${label}**\n\n`;
  content += `**Item:** ${itemName}\n`;
  content += `**User:** <@${userId}> (\`${userId}\`)\n`;
  content += `**By:** ${adminName}\n`;
  
  if (details?.reason) {
    content += `**Reason:** ${details.reason}\n`;
  }
  if (details?.wipe_cycle) {
    content += `**Wipe:** ${details.wipe_cycle}\n`;
  }
  if (details?.old_status && details?.new_status) {
    content += `**Change:** ${details.old_status} → ${details.new_status}\n`;
  }
  
  content += `\n<:yellow:STAFF_ROLE_ID> **Package Log**`;

  try {
    await sendDiscordWebhook({
      username: "NewHopeGGN Packages",
      content,
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
