import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { sendDiscordWebhook } from "@/lib/discord";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET - retrieve user's UID
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 });
  }

  const { data, error } = await sb
    .from("user_profiles")
    .select("uid")
    .eq("discord_id", user.discord_id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, uid: data?.uid ?? null });
}

// POST - save user's UID
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const uid = String(body?.uid ?? "").trim();

  if (!uid) {
    return NextResponse.json({ ok: false, error: "UID is required" }, { status: 400 });
  }

  if (uid.length < 3 || uid.length > 50) {
    return NextResponse.json({ ok: false, error: "UID must be 3-50 characters" }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 });
  }

  // Upsert the UID
  const { error } = await sb
    .from("user_profiles")
    .upsert({
      discord_id: user.discord_id,
      username: user.username,
      uid: uid,
      updated_at: new Date().toISOString(),
    }, { onConflict: "discord_id" });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Send Discord webhook notification
  try {
    await sendDiscordWebhook({
      content: 
        `🆔 **UID Linked**\n` +
        `**User:** ${user.username} (${user.discord_id})\n` +
        `**UID:** \`${uid}\`\n` +
        `**Time:** ${new Date().toISOString()}`,
      username: "NewHopeGGN UID Log",
    });
  } catch (e) {
    // Non-critical - don't fail if webhook fails
    console.error("[uid] webhook failed:", e);
  }

  return NextResponse.json({ ok: true, uid });
}
