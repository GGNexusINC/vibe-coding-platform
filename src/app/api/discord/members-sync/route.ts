import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type MemberPayload = {
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_bot: boolean;
  joined_at: string | null;
  roles: string[];
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Bad body" }, { status: 400 });
  if (!env.discordIngestSecrets().includes(body.secret)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const members: MemberPayload[] = body.members;
  if (!Array.isArray(members) || members.length === 0) {
    return NextResponse.json({ ok: false, error: "No members" }, { status: 400 });
  }

  const sb = getClient();
  if (!sb) return NextResponse.json({ ok: false, error: "No DB" }, { status: 500 });

  const now = new Date().toISOString();
  const rows = members.map((m) => ({
    discord_id:   m.discord_id,
    username:     m.username,
    display_name: m.display_name,
    avatar_url:   m.avatar_url,
    is_bot:       m.is_bot,
    joined_at:    m.joined_at,
    roles:        m.roles,
    last_synced:  now,
  }));

  // Upsert in batches of 200
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await sb.from("guild_members").upsert(batch, { onConflict: "discord_id" });
    if (error) {
      console.error("[members-sync] upsert error", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, synced: rows.length });
}

// GET — returns all non-bot members for use in admin stats
export async function GET(req: Request) {
  const auth = req.headers.get("x-admin-secret");
  if (!env.discordIngestSecrets().includes(auth ?? "")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const sb = getClient();
  if (!sb) return NextResponse.json({ ok: false, error: "No DB" }, { status: 500 });

  const { data, error } = await sb
    .from("guild_members")
    .select("*")
    .order("is_bot", { ascending: true })
    .order("display_name", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, members: data });
}
