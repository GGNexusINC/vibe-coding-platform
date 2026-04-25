import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "webhooks")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      webhooks: data?.value || {},
    });
  } catch (error) {
    console.error("[api/admin/webhooks] GET error:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch webhooks." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const webhooks = body?.webhooks;

    if (!webhooks || typeof webhooks !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid webhooks data." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        {
          key: "webhooks",
          value: webhooks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/webhooks] PATCH error:", error);
    return NextResponse.json({ ok: false, error: "Failed to update webhooks." }, { status: 500 });
  }
}
