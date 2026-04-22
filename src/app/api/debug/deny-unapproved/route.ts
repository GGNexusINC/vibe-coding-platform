import { NextResponse } from "next/server";
import { getAdminSession, isAdminDiscordId } from "@/lib/admin-auth";

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "This maintenance endpoint is disabled. Use the Admin Roster panel instead." },
    { status: 410 },
  );
}

export async function POST() {
  const admin = await getAdminSession();
  if (!admin?.discord_id || !isAdminDiscordId(admin.discord_id)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(
    { ok: false, error: "This maintenance endpoint is disabled. Use the Admin Roster panel instead." },
    { status: 410 },
  );
}
