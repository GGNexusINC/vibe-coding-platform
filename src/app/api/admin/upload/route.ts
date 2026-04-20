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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const usingKey = serviceKey ? "service_role" : "anon";
  console.log("[upload] Using key:", usingKey, "URL:", supabaseUrl?.slice(0, 30));

  const supabase = createClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false },
  });

  // List existing buckets for debug
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  console.log("[upload] Existing buckets:", buckets?.map(b => b.name), "listErr:", listErr?.message);

  // Ensure bucket exists
  if (!buckets?.find(b => b.name === BUCKET)) {
    const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ALLOWED_TYPES,
    });
    if (bucketError) {
      console.error("[upload] Bucket creation failed:", bucketError);
    } else {
      console.log("[upload] Bucket created successfully");
    }
  }

  const ext = EXT_MAP[file.type] || ".png";
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const filePath = `arena/${uniqueId}${ext}`;
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[upload] Upload error:", JSON.stringify(uploadError));
    return NextResponse.json(
      { ok: false, error: `Upload failed (${usingKey} key): ${uploadError.message}. Buckets found: ${buckets?.map(b => b.name).join(", ") || "none"}` },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  const url = urlData.publicUrl;

  return NextResponse.json({ ok: true, url, name: file.name, type: file.type });
}
