import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 500 });
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // Count tickets with Brawl Mode tag
    const { count, error } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .ilike("subject", "%[BRAWL MODE]%");

    if (error) {
      console.error("[brawl-count] Error fetching count:", error);
      return NextResponse.json({ ok: false, count: 0 });
    }

    return NextResponse.json({ ok: true, count: count || 0 });
  } catch (err) {
    console.error("[brawl-count] Unexpected error:", err);
    return NextResponse.json({ ok: false, count: 0 });
  }
}
