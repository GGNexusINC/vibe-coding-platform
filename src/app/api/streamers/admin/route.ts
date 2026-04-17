import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getStreamers } from "@/lib/streamer-store";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const streamers = await getStreamers();
  return NextResponse.json({ ok: true, streamers });
}
