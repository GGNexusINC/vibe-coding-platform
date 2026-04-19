import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch package logs (admin gets all, users get own)
export async function GET(req: Request) {
  const user = await getSession();
  const admin = await getAdminSession();
  const isAdmin = !!admin?.discord_id;
  
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  
  // Pagination
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  
  // Filters
  const userId = searchParams.get("user_id");
  const action = searchParams.get("action");
  const itemType = searchParams.get("item_type");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  
  let query = supabase
    .from("package_logs")
    .select("*", { count: "exact" });
  
  // Non-admins can only see their own logs
  if (!isAdmin) {
    if (!user?.discord_id) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    query = query.eq("user_id", user.discord_id);
  } else if (userId) {
    // Admin can filter by specific user
    query = query.eq("user_id", userId);
  }
  
  // Apply other filters
  if (action) query = query.eq("action", action);
  if (itemType) query = query.eq("item_type", itemType);
  if (dateFrom) query = query.gte("action_at", dateFrom);
  if (dateTo) query = query.lte("action_at", dateTo);
  
  // Order by newest first
  query = query.order("action_at", { ascending: false });
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1);
  
  const { data: logs, error, count } = await query;
  
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  
  // Get summary stats for admin
  let summary = null;
  if (isAdmin) {
    const { data: stats } = await supabase
      .from("package_logs")
      .select("action, item_type");
    
    if (stats) {
      summary = {
        total: stats.length,
        admin_given: stats.filter(l => l.action === "admin_given").length,
        user_used: stats.filter(l => l.action === "user_used").length,
        user_saved: stats.filter(l => l.action === "user_saved").length,
        admin_revoked: stats.filter(l => l.action === "admin_revoked").length,
        by_type: {
          insurance: stats.filter(l => l.item_type === "insurance").length,
          pack: stats.filter(l => l.item_type === "pack").length,
          construction: stats.filter(l => l.item_type === "construction").length,
          defense: stats.filter(l => l.item_type === "defense").length,
          tactical: stats.filter(l => l.item_type === "tactical").length,
        }
      };
    }
  }
  
  return NextResponse.json({ 
    ok: true, 
    logs: logs || [], 
    count: count || 0,
    summary,
    pagination: {
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    }
  });
}
