import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

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

  // Save to /public/uploads/ with a unique filename
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = EXT_MAP[file.type] || ".png";
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const filename = `${uniqueId}${ext}`;
  const filePath = path.join(uploadsDir, filename);

  await fs.writeFile(filePath, Buffer.from(arrayBuffer));

  const url = `/uploads/${filename}`;

  return NextResponse.json({ ok: true, url, name: file.name, type: file.type });
}
