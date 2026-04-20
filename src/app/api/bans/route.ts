import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await sb
    .from("admin_actions")
    .select("id, target_discord_id, actor_username, reason, created_at")
    .eq("action", "ban")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ ok: false, bans: [] });
  return NextResponse.json({ ok: true, bans: data ?? [] });
}
