import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET - Check if current user is a beta tester
export async function GET() {
  const user = await getSession();
  
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sb = getSupabase();

    // Check if user is in beta_testers table
    const { data: betaTester, error } = await sb
      .from('beta_testers')
      .select('id, permissions, notes, joined_at, is_active')
      .eq('discord_id', user.discord_id)
      .single();

    // If no record found or not active
    if (error || !betaTester) {
      console.log(`[beta/check] User ${user.discord_id} not found in beta_testers`);
      return NextResponse.json({ 
        ok: true, 
        isBetaTester: false,
        message: "You are not a beta tester"
      });
    }

    // Check if active
    if (!betaTester.is_active) {
      console.log(`[beta/check] User ${user.discord_id} found but is_active=false`);
      return NextResponse.json({ 
        ok: true, 
        isBetaTester: false,
        message: "Your beta access is inactive"
      });
    }

    // Update last active
    await sb
      .from('beta_testers')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', betaTester.id);

    return NextResponse.json({
      ok: true,
      isBetaTester: true,
      permissions: betaTester.permissions || [],
      notes: betaTester.notes,
      joinedAt: betaTester.joined_at,
    });
  } catch (e) {
    console.error("[beta/check] GET error:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to check beta status" },
      { status: 500 }
    );
  }
}
