import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { enterLottery, getLotteryEntries } from "@/lib/lottery-store";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.discord_id) {
    return NextResponse.json({ ok: false, error: "Sign in with Discord to enter." }, { status: 401 });
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

  // Notify Discord when someone enters
  const webhookUrl = env.discordWebhookUrlForPage("script-hook");
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "NewHopeGGN 🎰 Lottery",
        embeds: [{
          title: "🎫 New Lottery Entry!",
          description: `**${session.username}** just entered the lottery!`,
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
        }],
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, totalEntries: total });
}

export async function GET() {
  const entries = await getLotteryEntries();
  return NextResponse.json({ ok: true, entries, totalEntries: entries.length });
}
