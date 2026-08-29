import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { performLotteryDraw, getLotteryDraws } from "@/lib/lottery-store";

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const clearAfter = body?.clearAfter !== false;

  const winner = await performLotteryDraw({ clearAfter });
  if (!winner) {
    return NextResponse.json({ ok: false, error: "No entries in the lottery." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, winner });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const draws = await getLotteryDraws();
  return NextResponse.json({ ok: true, draws });
}
