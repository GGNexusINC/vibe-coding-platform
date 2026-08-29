import { NextResponse } from "next/server";
import { performLotteryDraw, hasDrawnThisWeek } from "@/lib/lottery-store";

/**
 * Weekly automatic lottery draw. Runs on Vercel Cron (see vercel.json).
 * Skips if a draw — manual (admin panel) or automatic — already happened
 * this ISO week, so admins can still draw early without causing a double-draw.
 */
async function runWeeklyDraw() {
  if (await hasDrawnThisWeek()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "A draw already happened this week." });
  }

  const winner = await performLotteryDraw({ clearAfter: true });
  if (!winner) {
    return NextResponse.json({ ok: true, skipped: true, reason: "No entries in the lottery this week." });
  }

  return NextResponse.json({ ok: true, winner });
}

export async function GET(req: Request) {
  const isCron = req.headers.get("x-vercel-cron") === "1";
  const secret = new URL(req.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!isCron && (!expected || secret !== expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return runWeeklyDraw();
}

export async function POST(req: Request) {
  return GET(req);
}
