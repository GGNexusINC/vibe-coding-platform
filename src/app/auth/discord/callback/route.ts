import { NextResponse } from "next/server";
import {
  exchangeDiscordCodeForToken,
  fetchDiscordUser,
  getDiscordAvatarUrl,
} from "@/lib/discord-oauth";
import { sendDiscordWebhook } from "@/lib/discord";
import { setSession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const now = new Date().toISOString();
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") ?? "";

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?auth=missing_code`);
  }

  const next = (() => {
    const parts = stateRaw.split(":");
    const encodedNext = parts.slice(1).join(":");
    try {
      return decodeURIComponent(encodedNext || "/dashboard");
    } catch {
      return "/dashboard";
    }
  })();

  try {
    const token = await exchangeDiscordCodeForToken({ origin, code });
    const u = await fetchDiscordUser(token.access_token);
    const avatarUrl = getDiscordAvatarUrl(u);
    const username = u.global_name || u.username;

    await setSession({
      discord_id: u.id,
      username,
      avatar_url: avatarUrl,
      global_name: u.global_name,
      discriminator: u.discriminator ?? null,
      discord_profile: u as unknown as Record<string, unknown>,
    });

    // Best-effort login log
    try {
      await logActivity({
        type: "login",
        username,
        discordId: u.id,
        avatarUrl: avatarUrl ?? undefined,
        globalName: u.global_name,
        discriminator: u.discriminator ?? null,
        profile: u as unknown as Record<string, unknown>,
        details: "User signed in via Discord OAuth.",
      });
      await sendDiscordWebhook({
        content:
          `✅ **Login / Inicio de sesion**\n` +
          `User / Usuario: **${username}**\n` +
          `Discord ID: \`${u.id}\`\n` +
          `Time / Hora (UTC): \`${now}\`\n` +
          `Origin / Origen: \`${origin}\`\n` +
          `Next route / Ruta siguiente: \`${next}\``,
        username: "NewHopeGGN Logs",
        avatar_url: avatarUrl ?? undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      console.error("Login webhook failed", msg);
    }

    return NextResponse.redirect(`${origin}${next}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      `${origin}/dashboard?auth=error&msg=${encodeURIComponent(msg)}`,
    );
  }
}

