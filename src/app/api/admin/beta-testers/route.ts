import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET - List all beta testers
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sb = getSupabase();

    const { data: testers, error } = await sb
      .from('beta_testers')
      .select('*')
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, testers: testers || [] });
  } catch (e) {
    console.error("[admin/beta-testers] GET error:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch beta testers" },
      { status: 500 }
    );
  }
}

// POST - Add a beta tester
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { discordId, username, avatarUrl, notes, permissions } = body;

    if (!discordId || !username) {
      return NextResponse.json(
        { ok: false, error: "Discord ID and username are required" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    // Check if already exists
    const { data: existing } = await sb
      .from('beta_testers')
      .select('id')
      .eq('discord_id', discordId)
      .single();

    if (existing) {
      // Reactivate if exists
      const { error } = await sb
        .from('beta_testers')
        .update({ is_active: true, notes: notes || null, permissions: permissions || [] })
        .eq('id', existing.id);

      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Beta tester reactivated" });
    }

    // Insert new beta tester
    const { error } = await sb.from('beta_testers').insert({
      discord_id: discordId,
      username: username,
      avatar_url: avatarUrl || null,
      notes: notes || null,
      permissions: permissions || [],
      is_active: true,
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Beta tester added" });
  } catch (e) {
    console.error("[admin/beta-testers] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to add beta tester" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a beta tester
export async function DELETE(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID required" }, { status: 400 });
    }

    const sb = getSupabase();

    const { error } = await sb
      .from('beta_testers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Beta tester removed" });
  } catch (e) {
    console.error("[admin/beta-testers] DELETE error:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to remove beta tester" },
      { status: 500 }
    );
  }
}
