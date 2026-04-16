import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sendDiscordWebhook } from "@/lib/discord";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: Request) {
  const now = new Date().toISOString();
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const body = await req.json().catch(() => ({}));
  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!subject || !message) {
    return NextResponse.json(
      { ok: false, error: "Subject and message are required." },
      { status: 400 },
    );
  }

  if (subject.length > 100 || message.length > 2000) {
    return NextResponse.json(
      { ok: false, error: "Subject or message is too long." },
      { status: 400 },
    );
  }

  const user = await getSession();
  const userLabel = user
    ? `User / Usuario: **${user.username}**\nDiscord ID: \`${user.discord_id}\``
    : "User / Usuario: **Guest / Invitado (sin sesion)**";

  try {
    await logActivity({
      type: "support_ticket",
      username: user?.username,
      discordId: user?.discord_id,
      avatarUrl: user?.avatar_url ?? undefined,
      globalName: user?.global_name,
      discriminator: user?.discriminator,
      profile: user?.discord_profile,
      details: `Ticket submitted: ${subject}`,
    });

    await sendDiscordWebhook(
      {
        username: "NewHopeGGN Support",
        avatar_url: user?.avatar_url ?? undefined,
        content:
          `🎫 **New Support Ticket / Nuevo Ticket de Soporte**\n` +
          `Subject / Asunto: **${subject}**\n` +
          `${userLabel}\n` +
          `Time / Hora (UTC): \`${now}\`\n` +
          `Route / Ruta: \`/api/support/ticket\`\n` +
          `IP (x-forwarded-for): \`${forwardedFor}\`\n` +
          `Message length / Largo del mensaje: \`${message.length}\`\n\n` +
          `**Message / Mensaje**\n${message}\n\n` +
          `UA: \`${userAgent.slice(0, 180)}\``,
      },
      { required: true },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json(
      { ok: false, error: `Failed to send ticket: ${msg}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

