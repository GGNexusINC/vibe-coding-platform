import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getRoster, updateAdminStatus } from "@/lib/admin-roster";
import type { AdminStatus } from "@/lib/admin-roster";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const roster = await getRoster();
  return NextResponse.json({ ok: true, roster });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const discordId = String(body?.discordId ?? "").trim();
  const status = String(body?.status ?? "").trim() as AdminStatus;

  if (!discordId || !["approved", "denied", "pending"].includes(status)) {
    return NextResponse.json(
      { ok: false, error: "discordId and valid status required." },
      { status: 400 },
    );
  }

  const ok = await updateAdminStatus(discordId, status);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Admin not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
