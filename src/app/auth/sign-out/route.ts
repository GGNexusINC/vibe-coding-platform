import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/session";
import { sendDiscordWebhook } from "@/lib/discord";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const now = new Date().toISOString();
  const user = await getSession();

  await clearSession();

  // Best-effort logout log
  if (user?.discord_id) {
    try {
      await logActivity({
        type: "logout",
        username: user.username,
        discordId: user.discord_id,
        avatarUrl: user.avatar_url ?? undefined,
        globalName: user.global_name,
        discriminator: user.discriminator,
        profile: user.discord_profile,
        details: "User signed out from dashboard.",
      });
      await sendDiscordWebhook({
        content:
          `🚪 **Logout / Cierre de sesion**\n` +
          `User / Usuario: **${user.username}**\n` +
          `Discord ID: \`${user.discord_id}\`\n` +
          `Time / Hora (UTC): \`${now}\`\n` +
          `Origin / Origen: \`${origin}\`\n` +
          `Route / Ruta: \`/auth/sign-out\``,
        username: "NewHopeGGN Logs",
        avatar_url: user.avatar_url ?? undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      console.error("Logout webhook failed", msg);
    }
  }

  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
