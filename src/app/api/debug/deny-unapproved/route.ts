import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// One-time endpoint to deny Draco and Unknown from the admin roster
// DELETE THIS FILE AFTER USE
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "No Supabase config" }, { status: 500 });

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Deny by username (case-insensitive match)
  const usernamesToDeny = ["draco", "unknown"];

  const results = [];
  for (const name of usernamesToDeny) {
    const { data, error } = await sb
      .from("admin_roster")
      .update({ status: "denied", updated_at: new Date().toISOString() })
      .ilike("username", name)
      .select("username, discord_id, status");
    results.push({ name, updated: data, error: error?.message });
  }

  // Also return current roster so we can see all entries
  const { data: roster } = await sb.from("admin_roster").select("username, discord_id, status").order("added_at");

  return NextResponse.json({ ok: true, results, roster });
}
