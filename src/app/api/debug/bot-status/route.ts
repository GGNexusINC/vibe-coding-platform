import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  const botToken = env.discordBotToken();
  const guildId = env.discordGuildId();
  
  if (!botToken) {
    return NextResponse.json({ 
      ok: false, 
      error: "DISCORD_BOT_TOKEN not configured in environment variables",
      hasToken: false,
      guildId,
    });
  }

  // Test the bot token by fetching bot info
  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { "Authorization": `Bot ${botToken}` },
    });

    if (!res.ok) {
      return NextResponse.json({ 
        ok: false, 
        error: `Bot token invalid: ${res.status}`,
        hasToken: true,
        tokenValid: false,
        guildId,
      });
    }

    const bot = await res.json();
    
    // Try to fetch guild info
    const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { "Authorization": `Bot ${botToken}` },
    });

    return NextResponse.json({ 
      ok: true,
      hasToken: true,
      tokenValid: true,
      bot: {
        id: bot.id,
        username: bot.username,
        discriminator: bot.discriminator,
      },
      guildId,
      inGuild: guildRes.ok,
      guildError: guildRes.ok ? null : `${guildRes.status} - Bot may not be in the server`,
      message: "Bot is configured correctly! Ticket channels should work.",
    });

  } catch (e) {
    return NextResponse.json({ 
      ok: false, 
      error: `Failed to test bot: ${e instanceof Error ? e.message : "unknown"}`,
      hasToken: true,
      guildId,
    });
  }
}
