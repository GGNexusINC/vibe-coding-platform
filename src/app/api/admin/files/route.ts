import { NextResponse } from "next/server";
import { getAdminSession, isAdminDiscordId } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "uploads";
const FOLDER_PREFIX = "admin-files";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — list all files, optionally filter by folder
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") ?? undefined;

  const sb = getSupabase();
  let query = sb.from("admin_files").select("*").order("created_at", { ascending: false });
  if (folder && folder !== "all") query = query.eq("folder", folder);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, files: data ?? [] });
}

// POST — upload a file (multipart/form-data)
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  const folder = String(formData.get("folder") ?? "general").trim() || "general";
  const description = String(formData.get("description") ?? "").trim();

  if (!file) return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });

  const MAX_MB = 20;
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: `File too large. Max ${MAX_MB}MB.` }, { status: 400 });
  }

  const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "File type not allowed." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${FOLDER_PREFIX}/${folder}/${Date.now()}_${safeName}`;

  const sb = getSupabase();
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await sb.from("admin_files").insert({
    uploaded_by: admin.username ?? "Admin",
    uploader_id: admin.discord_id ?? "unknown",
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: storagePath,
    public_url: publicUrl,
    folder,
    description: description || null,
  });

  if (dbError) {
    await sb.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, publicUrl, fileName: file.name });
}

// DELETE — remove a file by id (owners only or uploader)
export async function DELETE(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, error: "Missing file id" }, { status: 400 });

  const sb = getSupabase();
  const { data: file, error: fetchErr } = await sb
    .from("admin_files")
    .select("storage_path, uploader_id")
    .eq("id", id)
    .single();

  if (fetchErr || !file) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });

  const isOwner = admin.discord_id ? isAdminDiscordId(admin.discord_id) : false;
  if (!isOwner && file.uploader_id !== admin.discord_id) {
    return NextResponse.json({ ok: false, error: "Only owners or the uploader can delete files" }, { status: 403 });
  }

  await sb.storage.from(BUCKET).remove([file.storage_path]);
  await sb.from("admin_files").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
