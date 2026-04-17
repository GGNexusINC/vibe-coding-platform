import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Password login is disabled. Use Discord sign in." },
    { status: 410 },
  );
}
