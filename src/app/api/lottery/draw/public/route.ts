import { NextResponse } from "next/server";
import { getLotteryDraws } from "@/lib/lottery-store";

export async function GET() {
  const draws = await getLotteryDraws();
  return NextResponse.json({ ok: true, draws });
}
