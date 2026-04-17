import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { drawLotteryWinner, saveLotteryDraw, clearLotteryEntries, getLotteryDraws } from "@/lib/lottery-store";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const clearAfter = body?.clearAfter !== false;

  const winner = await drawLotteryWinner();
  if (!winner) {
    return NextResponse.json({ ok: false, error: "No entries in the lottery." }, { status: 400 });
  }

  const now = new Date().toISOString();
  await saveLotteryDraw({
    winnerId: winner.discordId,
    winnerUsername: winner.username,
    winnerAvatarUrl: winner.avatarUrl ?? null,
    prize: winner.prize,
    drawnAt: now,
    notified: true,
  });

  // Send to Discord
  const webhookUrl = env.discordWebhookUrlForPage("general-chat");
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "NewHopeGGN Lottery",
        content: `🎉 **LOTTERY WINNER DRAWN!**`,
        embeds: [{
          title: "🏆 We have a winner!",
          description: `Congratulations to **${winner.username}**!\n\nThey have won: **${winner.prize}**`,
          color: 0xfacc15,
          fields: [
            { name: "Winner", value: winner.username, inline: true },
            { name: "Discord ID", value: `\`${winner.discordId}\``, inline: true },
            { name: "Prize", value: winner.prize, inline: false },
            { name: "Drawn At", value: `<t:${Math.floor(new Date(now).getTime() / 1000)}:F>`, inline: false },
          ],
          thumbnail: winner.avatarUrl ? { url: winner.avatarUrl } : undefined,
          footer: { text: "NewHopeGGN Lottery System" },
          timestamp: now,
        }],
      }),
    }).catch(() => null);
  }

  if (clearAfter) await clearLotteryEntries();

  return NextResponse.json({ ok: true, winner });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const draws = await getLotteryDraws();
  return NextResponse.json({ ok: true, draws });
}
