import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-auth";
import { applyAsStreamer, getStreamers, updateStreamerStatus } from "@/lib/streamer-store";
import { env } from "@/lib/env";
import { sendDiscordWebhook } from "@/lib/discord";

export async function GET() {
  const streamers = await getStreamers("approved");
  return NextResponse.json({ ok: true, streamers });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Sign in with Discord first." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const streamUrl = String(body?.streamUrl ?? "").trim();
  const streamTitle = String(body?.streamTitle ?? "").trim();
  const platform = String(body?.platform ?? "twitch").trim();

  if (!streamUrl || !streamTitle) {
    return NextResponse.json({ ok: false, error: "Stream URL and title are required." }, { status: 400 });
  }

  const result = await applyAsStreamer({
    discordId: session.discord_id,
    username: session.username ?? "Unknown",
    avatarUrl: session.avatar_url ?? null,
    streamUrl,
    streamTitle,
    platform,
  });

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

  const webhookUrl = env.discordWebhookUrlForPage("general-chat");
  if (webhookUrl) {
    await sendDiscordWebhook(
      {
        username: "NewHopeGGN Streamers",
        embeds: [
          {
            title: "New Streamer Application",
            description: `**${session.username}** wants to stream on the site.`,
            color: 0x38bdf8,
            fields: [
              { name: "Streamer", value: `<@${session.discord_id}> (${session.username})`, inline: false },
              { name: "Platform", value: platform, inline: true },
              { name: "Title", value: streamTitle, inline: true },
              { name: "Stream URL", value: streamUrl, inline: false },
              { name: "Review", value: "Open Admin Panel -> Streamers tab", inline: false },
            ],
            thumbnail: session.avatar_url ? { url: session.avatar_url } : undefined,
          },
        ],
      },
      { webhookUrl },
    ).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const discordId = String(body?.discordId ?? "").trim();
  const status = String(body?.status ?? "").trim();

  if (!discordId || !["approved", "denied", "pending"].includes(status)) {
    return NextResponse.json({ ok: false, error: "discordId and valid status required." }, { status: 400 });
  }

  const ok = await updateStreamerStatus(discordId, status as "approved" | "denied" | "pending");
  if (!ok) return NextResponse.json({ ok: false, error: "Streamer not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
