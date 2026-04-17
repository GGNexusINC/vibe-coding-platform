import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: "Only JPEG, PNG, GIF, and WebP images are allowed." },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Image must be under 8 MB." },
      { status: 400 },
    );
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  return NextResponse.json({ ok: true, dataUrl, name: file.name, type: file.type });
}
