import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchUserGuilds, isBotInGuild } from "@/lib/discord-oauth";

export async function GET() {
  const session = await getSession();

  if (!session || !session.access_token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const guilds = await fetchUserGuilds(session.access_token);
    
    // Filter guilds where user has Manage Server (0x20) or Administrator (0x8) permissions
    const managedGuilds = guilds.filter(g => {
      const perms = BigInt(g.permissions);
      const isManager = (perms & 0x20n) === 0x20n;
      const isAdmin = (perms & 0x8n) === 0x8n;
      return isManager || isAdmin || g.owner;
    });

    // Check which guilds the bot is in
    // Note: This could be slow if there are many managed guilds. 
    // In a real SaaS, you'd cache this or use a different strategy.
    const guildsWithBot = await Promise.all(managedGuilds.map(async g => {
      const inGuild = await isBotInGuild(g.id);
      return inGuild ? g : null;
    }));

    const result = guildsWithBot.filter(Boolean);

    return NextResponse.json({ ok: true, guilds: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch guilds";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
