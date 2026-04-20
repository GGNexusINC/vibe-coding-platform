import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};
const BUCKET = "uploads";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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

  const supabase = getSupabase();

  // Ensure bucket exists (idempotent — ignores if already created)
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = EXT_MAP[file.type] || ".png";
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const filePath = `arena/${uniqueId}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[upload] Supabase storage error:", uploadError);
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  const url = urlData.publicUrl;

  return NextResponse.json({ ok: true, url, name: file.name, type: file.type });
}
