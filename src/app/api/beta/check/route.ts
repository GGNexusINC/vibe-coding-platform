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
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`[beta/check] beta_testers lookup failed for ${user.discord_id}:`, error.message);
    }

    // Some older approvals may exist in requests before the beta_testers row was synced.
    // Check if user has a request (any status)
    const { data: request } = await sb
      .from('beta_tester_requests')
      .select('*')
      .eq('discord_id', user.discord_id)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!betaTester) {
      const isApproved = request?.status === 'approved';
      return NextResponse.json({ 
        ok: true, 
        isBetaTester: isApproved,
        request: request || null,
        message: isApproved ? "Welcome to Beta" : request ? `Your request is ${request.status}` : "You are not a beta tester"
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
