import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
