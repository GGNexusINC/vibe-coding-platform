import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { KNOWN_ADMINS } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/activity-log";

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = process.env.GUILD_ID || "1419522458075005023";
const BOT_TOKEN = process.env.BOT_TOKEN;
const MOD_WEBHOOK = "https://discord.com/api/webhooks/1494203915053563986/UmeAj1IZseuwq5S9_zkDV-uIQd4Cq1hbdCMQ8peF-5dq4zjd_LOQR1Tr44OHrCrnkVu5";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isOwnerSession(discordId?: string): boolean {
  if (!discordId) return false;
  return KNOWN_ADMINS.some((a) => a.discordId === discordId && a.role === "owner");
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

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
      const errBody = discordResult.body;
      let hint = "";
      if (res.status === 403 && errBody.includes("Missing Permissions")) {
        hint = " Fix: (1) Give bot 'Ban Members' permission. (2) Drag bot role ABOVE target member's highest role in Server Settings > Roles.";
      }
      return NextResponse.json(
        { ok: false, error: `Discord ban failed (${res.status}): ${errBody}${hint}` },
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
              author: { name: "NewHopeGGN · Official Warning" },
              title: "⚠️ You have received a warning",
              description: `> ${reason}`,
              color: 0xf59e0b,
              fields: [
                { name: "Issued By", value: actorName, inline: true },
                { name: "Server", value: "NewHopeGGN", inline: true },
              ],
              footer: { text: "Please review our server rules to avoid further action." },
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

  // Log to activity feed
  const actionLabel = action === "warn" ? "⚠️ Warning" : action === "ban" ? "🔨 Ban" : "✅ Unban";
  await logActivity({
    type: "admin_broadcast",
    username: actorName,
    discordId: actorId,
    details: `${actionLabel} issued to <@${targetDiscordId}>: ${reason}`,
  });

  // Post to moderation webhook
  const embedColor = action === "warn" ? 0xf59e0b : action === "ban" ? 0xef4444 : 0x22c55e;
  const embedTitle = action === "warn" ? "⚠️ Warning Issued" : action === "ban" ? "🔨 Member Banned" : "✅ Member Unbanned";
  const embedDesc = action === "warn"
    ? "A formal warning has been issued to this member."
    : action === "ban"
    ? "This member has been banned from the server."
    : "This member's ban has been lifted.";

  await fetch(MOD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "NewHopeGGN Moderation",
      embeds: [{
        author: { name: "NewHopeGGN · Moderation Log" },
        title: embedTitle,
        description: embedDesc,
        color: embedColor,
        fields: [
          { name: "👤 Member", value: `<@${targetDiscordId}>\n\`${targetDiscordId}\``, inline: true },
          { name: "🛡️ Actioned By", value: actorName, inline: true },
          { name: "\u200b", value: "\u200b", inline: true },
          { name: "📋 Reason", value: reason },
        ],
        footer: { text: "NewHopeGGN Admin Panel" },
        timestamp: new Date().toISOString(),
      }],
    }),
  }).catch(() => { /* webhook failure is non-fatal */ });

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
