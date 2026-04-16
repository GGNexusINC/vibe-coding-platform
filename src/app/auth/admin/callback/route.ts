import { NextResponse } from "next/server";
import {
  exchangeDiscordCodeForToken,
  fetchDiscordUser,
  getDiscordAvatarUrl,
} from "@/lib/discord-oauth";
import { setAdminSession, isAdminDiscordId } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";
import { logActivity } from "@/lib/activity-log";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const now = new Date().toISOString();
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/admin?auth=missing_code`);
  }

  try {
    const token = await exchangeDiscordCodeForToken({ origin, code, adminCallback: true });
    const u = await fetchDiscordUser(token.access_token);
    const avatarUrl = getDiscordAvatarUrl(u);
    const username = u.global_name || u.username;

    if (!isAdminDiscordId(u.id)) {
      return NextResponse.redirect(
        `${origin}/admin?auth=unauthorized&msg=${encodeURIComponent("Your Discord account is not authorized as an admin.")}`,
      );
    }

    await setAdminSession({ discord_id: u.id, username });

    try {
      await logActivity({
        type: "login",
        username,
        discordId: u.id,
        avatarUrl: avatarUrl ?? undefined,
        globalName: u.global_name,
        discriminator: u.discriminator ?? null,
        profile: u as unknown as Record<string, unknown>,
        details: "Admin signed in via Discord OAuth.",
      });
      await sendDiscordWebhook({
        content:
          `🔐 **Admin Login / Acceso Admin**\n` +
          `Admin: **${username}**\n` +
          `Discord ID: \`${u.id}\`\n` +
          `Time / Hora (UTC): \`${now}\`\n` +
          `Origin: \`${origin}\``,
        username: "NewHopeGGN Logs",
        avatar_url: avatarUrl ?? undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      console.error("Admin login webhook failed", msg);
    }

    return NextResponse.redirect(`${origin}/admin?auth=ok`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      `${origin}/admin?auth=error&msg=${encodeURIComponent(msg)}`,
    );
  }
}
