import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { enterLottery, getLotteryEntries } from "@/lib/lottery-store";

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
  return NextResponse.json({ ok: true, totalEntries: entries.length });
}

export async function GET() {
  const entries = await getLotteryEntries();
  return NextResponse.json({ ok: true, entries, totalEntries: entries.length });
}
