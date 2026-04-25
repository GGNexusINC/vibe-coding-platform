import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { enterLottery, getLotteryEntries } from "@/lib/lottery-store";
import { getAdminByDiscordId } from "@/lib/admin-roster";
import { env } from "@/lib/env";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Sign in with Discord to enter." }, { status: 401 });
  }

  const adminEntry = await getAdminByDiscordId(session.discord_id);
  if (adminEntry?.status === "approved") {
    return NextResponse.json({ ok: false, error: "Staff members are not eligible to enter the lottery." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const prize = String(body?.prize ?? "").trim();
  if (!prize) {
    return NextResponse.json({ ok: false, error: "No active lottery prize specified." }, { status: 400 });
  }

  const result = await enterLottery({
    discordId: session.discord_id,
    username: session.username ?? "Unknown",
    avatarUrl: session.avatar_url ?? null,
    prize,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const entries = await getLotteryEntries();
  const total = entries.length;

  const { getDynamicWebhookUrl } = await import("@/lib/webhooks");
  const webhookUrl = await getDynamicWebhookUrl("script-hook");
  const communityWebhookUrl = await getDynamicWebhookUrl("lottery-entries") || "https://discord.com/api/webhooks/1495516351219892504/tMhiHw58fFrdt4TdMfP8MjdiqFlTLiR31P9rbOhXA7k3tAP1hFK3Z7uK_jDMq_15kCwj";
  
  if (webhookUrl || communityWebhookUrl) {
    const payload = {
      username: "NewHopeGGN Lottery",
      embeds: [
        {
          title: "New Lottery Entry",
          description: `**${session.username}** just entered the lottery.`,
          color: 0xfacc15,
          fields: [
            { name: "Player", value: session.username, inline: true },
            { name: "Prize", value: prize, inline: true },
            { name: "Total Entries", value: `${total}`, inline: true },
            { name: "Discord ID", value: `\`${session.discord_id}\``, inline: false },
          ],
          thumbnail: session.avatar_url ? { url: session.avatar_url } : undefined,
          footer: { text: "NewHopeGGN Lottery" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    if (webhookUrl) {
      await sendDiscordWebhook(payload, { webhookUrl }).catch(() => null);
    }
    if (communityWebhookUrl) {
      await sendDiscordWebhook(payload, { webhookUrl: communityWebhookUrl }).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true, totalEntries: total });
}

export async function GET() {
  const session = await getSession();
  const entries = await getLotteryEntries();
  let isStaff = false;
  if (session?.discord_id) {
    const adminEntry = await getAdminByDiscordId(session.discord_id);
    isStaff = adminEntry?.status === "approved";
  }
  return NextResponse.json({ ok: true, entries, totalEntries: entries.length, isStaff });
}
