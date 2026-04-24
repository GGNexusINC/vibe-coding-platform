import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchUserGuilds } from "@/lib/discord-oauth";
import { env } from "@/lib/env";

const DISCORD_API = "https://discord.com/api";

async function verifyGuildManager(guildId: string, accessToken: string) {
  const guilds = await fetchUserGuilds(accessToken);
  const guild = guilds.find(g => g.id === guildId);
  if (!guild) return false;

  const perms = BigInt(guild.permissions);
  const isManager = (perms & 0x20n) === 0x20n;
  const isAdmin = (perms & 0x8n) === 0x8n;
  return isManager || isAdmin || guild.owner;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guildId");
  const session = await getSession();

  if (!session || !session.access_token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!guildId) {
    return NextResponse.json({ ok: false, error: "Missing guildId" }, { status: 400 });
  }

  try {
    const canManage = await verifyGuildManager(guildId, session.access_token);
    if (!canManage) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const botToken = env.discordBotToken();
    if (!botToken) {
      return NextResponse.json({ ok: false, error: "Bot token not configured" }, { status: 500 });
    }

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { authorization: `Bot ${botToken}` },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Failed to fetch channels: ${res.status} ${txt}` }, { status: res.status });
    }

    const channels = await res.json();
    // Filter for text (0), news (5), or forum (15) channels if needed, but for now return all and filter in UI or just return all
    const filteredChannels = channels
      .filter((c: any) => c.type === 0 || c.type === 2 || c.type === 4 || c.type === 5 || c.type === 13 || c.type === 15)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent_id
      }));

    return NextResponse.json({ ok: true, channels: filteredChannels });
  } catch (error) {
    console.error("[api/bot/channels] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
