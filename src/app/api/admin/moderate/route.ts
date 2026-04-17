import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { KNOWN_ADMINS } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = process.env.GUILD_ID || "1419522458075005023";
const BOT_TOKEN = process.env.BOT_TOKEN;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isOwnerSession(discordId?: string): boolean {
  if (!discordId) return false;
  return KNOWN_ADMINS.some((a) => a.discordId === discordId && a.role === "owner");
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  if (!isOwnerSession(admin.discord_id)) {
    return NextResponse.json({ ok: false, error: "Only owners can perform moderation actions." }, { status: 403 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "Bot token not configured on server." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const action: "warn" | "ban" | "unban" = body?.action;
  const targetDiscordId: string = String(body?.targetDiscordId ?? "").trim();
  const reason: string = String(body?.reason ?? "No reason provided").trim().slice(0, 512);

  if (!["warn", "ban", "unban"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Invalid action. Use warn, ban, or unban." }, { status: 400 });
  }
  if (!targetDiscordId || !/^\d{15,20}$/.test(targetDiscordId)) {
    return NextResponse.json({ ok: false, error: "Invalid Discord ID." }, { status: 400 });
  }

  const actorId = admin.discord_id ?? "unknown";
  const actorName = admin.username ?? "Admin";

  let discordResult = { ok: true, status: 0, body: "" };

  if (action === "ban") {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/bans/${targetDiscordId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: `[Admin Panel] ${actorName}: ${reason}`, delete_message_seconds: 0 }),
    });
    discordResult = { ok: res.ok, status: res.status, body: await res.text().catch(() => "") };
    if (!res.ok && res.status !== 204) {
      return NextResponse.json(
        { ok: false, error: `Discord ban failed (${res.status}): ${discordResult.body}` },
        { status: 502 },
      );
    }
  } else if (action === "unban") {
    const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/bans/${targetDiscordId}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    discordResult = { ok: res.ok, status: res.status, body: await res.text().catch(() => "") };
    if (!res.ok && res.status !== 204) {
      return NextResponse.json(
        { ok: false, error: `Discord unban failed (${res.status}): ${discordResult.body}` },
        { status: 502 },
      );
    }
  }
  // "warn" = no Discord API call, just logged + DM attempt below

  if (action === "warn") {
    // Attempt to DM via bot — best-effort, won't fail the request
    try {
      const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_id: targetDiscordId }),
      });
      if (dmRes.ok) {
        const dm = await dmRes.json();
        await fetch(`${DISCORD_API}/channels/${dm.id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            embeds: [{
              title: "⚠️ Official Warning — NewHopeGGN",
              description: reason,
              color: 0xf59e0b,
              footer: { text: `Warning issued by ${actorName} via admin panel` },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      }
    } catch { /* DM failure is non-fatal */ }
  }

  // Log to Supabase admin_actions table
  const sb = getSupabase();
  await sb.from("admin_actions").insert({
    actor_discord_id: actorId,
    actor_username: actorName,
    target_discord_id: targetDiscordId,
    action,
    reason,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, action, targetDiscordId });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const sb = getSupabase();
  const { data, error } = await sb
    .from("admin_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, actions: data ?? [] });
}
