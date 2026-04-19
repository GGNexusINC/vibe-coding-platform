import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { sendDiscordWebhook } from "@/lib/discord";
import { getAdminSession } from "@/lib/admin-auth";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch user's inventory
export async function GET(req: Request) {
  const user = await getSession();
  if (!user?.discord_id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabase();

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

  const { user_id, item_type, item_slug, item_name, wipe_cycle, metadata } = body;

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
      status: "available"
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
  try {
    const isUse = action === "use";
    const isInsurance = item.item_type === "insurance";

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

    const title = isUse
      ? (isInsurance ? "🛡️ Insurance Claimed" : "✅ Package Used")
      : "� Package Saved for Next Wipe";

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
  } catch (e) {
    console.error("Package webhook failed:", e);
  }

  // Manually log to package_logs (in addition to trigger)
  await supabase.from("package_logs").insert({
    inventory_item_id: item.id,
    user_id: user.discord_id,
    user_name: user.username,
    item_name: item.item_name,
    item_type: item.item_type,
    action: action === "use" ? "user_used" : "user_saved",
    action_by: user.discord_id,
    action_by_name: user.username,
    details: {
      reason: reason || "User initiated",
      wipe_cycle: item.wipe_cycle,
      item_id: item.id,
      used_date: action === "use" ? new Date().toISOString() : null,
    },
    discord_notified: discordNotified,
  });

  return NextResponse.json({ 
    ok: true, 
    item: updated,
    discord_notified: discordNotified,
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

// Helper to get current wipe cycle
function getCurrentWipeCycle(): string {
  const now = new Date();
  return `wipe-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
