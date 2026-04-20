import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(req: Request) {
  const now = new Date().toISOString();
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const body = await req.json().catch(() => ({}));
  const packName = String(body?.packName ?? "").trim();
  const price = Number(body?.price ?? 0);
  const referredBy = String(body?.referredBy ?? "Not specified").trim() || "Not specified";

  if (!packName) {
    return NextResponse.json(
      { ok: false, error: "Pack name is required." },
      { status: 400 },
    );
  }

  const user = await getSession();
  const username = user?.username ?? "Unknown";
  const discordId = user?.discord_id ?? "unknown";

  await logActivity({
    type: "purchase_intent",
    username,
    discordId: user?.discord_id,
    avatarUrl: user?.avatar_url ?? undefined,
    globalName: user?.global_name,
    discriminator: user?.discriminator,
    profile: user?.discord_profile,
    details: `Started purchase flow for ${packName} ($${price}). Referred by: ${referredBy}.`,
  });

  try {
    await sendDiscordWebhook({
      username: "NewHopeGGN Sales",
      avatar_url: user?.avatar_url ?? undefined,
      content:
        `🛒 **Purchase Intent / Intencion de Compra**\n` +
        `User / Usuario: **${username}**\n` +
        `Discord ID: \`${discordId}\`\n` +
        `Pack: **${packName}**\n` +
        `Price / Precio: **$${price}**\n` +
        `👥 Referred by / Referido por: **${referredBy}**\n` +
        `Time / Hora (UTC): \`${now}\`\n` +
        `Route / Ruta: \`/api/store/intent\`\n` +
        `IP (x-forwarded-for): \`${forwardedFor}\`\n` +
        `UA: \`${userAgent.slice(0, 180)}\``,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("Purchase intent webhook failed", msg);
  }

  return NextResponse.json({ ok: true });
}
