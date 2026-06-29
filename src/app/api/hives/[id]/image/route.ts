import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateHive, listHives } from "@/lib/hive-store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    const sb = createSupabaseAdminClient();
    
    // Verify ownership
    const hives = await listHives(sb);
    const hive = hives.find(h => h.id === id);
    if (!hive) {
      return NextResponse.json({ ok: false, error: "Hive not found" }, { status: 404 });
    }

    if (hive.owner_id !== user.discord_id) {
      const isOfficer = hive.members.some(m => m.discord_id === user.discord_id && m.role === "officer");
      if (!isOfficer) {
        return NextResponse.json({ ok: false, error: "Only owner/officer can upload image" }, { status: 403 });
      }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `hives/${hive.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from("public_assets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("[hive/image] Upload error:", uploadError);
      return NextResponse.json({ ok: false, error: "Failed to upload image" }, { status: 500 });
    }

    const { data: { publicUrl } } = sb.storage.from("public_assets").getPublicUrl(filePath);

    await updateHive(sb, hive.id, (h) => {
      return { ...h, image_url: publicUrl };
    });

    return NextResponse.json({ ok: true, imageUrl: publicUrl });
  } catch (err: any) {
    console.error("[hive/image] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
