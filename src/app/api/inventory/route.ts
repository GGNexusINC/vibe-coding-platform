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
  const { item_id, action } = body;

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
      used_date: new Date().toISOString()
    };
  } else if (action === "save") {
    // Save for next wipe
    updateData = {
      status: "saved",
      metadata: { ...item.metadata, saved_for_next_wipe: true }
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

  // Send Discord notification to staff when insurance is used
  if (action === "use" && item.item_type === "insurance") {
    try {
      await sendDiscordWebhook({
        username: "NewHopeGGN Insurance",
        avatar_url: user.avatar_url || undefined,
        content: `🛡️ **INSURANCE CLAIMED** 🛡️\n\n` +
          `User: **${user.username}**\n` +
          `Discord ID: \`${user.discord_id}\`\n` +
          `Item: **${item.item_name}**\n` +
          `Purchased: ${new Date(item.purchase_date).toLocaleDateString()}\n\n` +
          `⚠️ <@&STAFF_ROLE_ID> Please process this insurance claim!`
      });
    } catch (e) {
      console.error("Insurance webhook failed:", e);
    }
  }

  return NextResponse.json({ ok: true, item: updated });
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
