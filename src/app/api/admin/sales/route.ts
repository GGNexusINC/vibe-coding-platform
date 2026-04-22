import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sb = getSupabase();

  const { data, error } = await sb
    .from("activity_logs")
    .select("details, username, created_at")
    .eq("type", "purchase_intent")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  type SaleEntry = { count: number; revenue: number; recent: { buyer: string; pack: string; at: string }[] };
  const grouped: Record<string, SaleEntry> = {};

  for (const row of data ?? []) {
    const details = row.details ?? "";
    const referredMatch = details.match(/Referred by:\s*(.+?)\./i);
    const packMatch = details.match(/purchase flow for (.+?) \(/i);
    const priceMatch = details.match(/\(\$([0-9.]+)\)/);
    
    const referredBy = referredMatch?.[1]?.trim() ?? "Not specified";
    const pack = packMatch?.[1]?.trim() ?? "Unknown pack";
    const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

    if (!grouped[referredBy]) {
      grouped[referredBy] = { count: 0, revenue: 0, recent: [] };
    }
    grouped[referredBy].count += 1;
    grouped[referredBy].revenue += price;
    if (grouped[referredBy].recent.length < 5) {
      grouped[referredBy].recent.push({ buyer: row.username ?? "Unknown", pack, at: row.created_at });
    }
  }

  const leaderboard = Object.entries(grouped)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ ok: true, leaderboard, total: data?.length ?? 0 });
}
