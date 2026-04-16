import { NextResponse } from "next/server";
import { getAdminPassword, setAdminSession } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? "");

  if (!password) {
    return NextResponse.json(
      { ok: false, error: "Password is required." },
      { status: 400 },
    );
  }

  if (password !== getAdminPassword()) {
    return NextResponse.json(
      { ok: false, error: "Incorrect admin password." },
      { status: 401 },
    );
  }

  await setAdminSession();
  return NextResponse.json({ ok: true });
}
