import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

// GET - List all pending requests
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sb = getSupabase();

    const { data: requests, error } = await sb
      .from('beta_tester_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, requests: requests || [] });
  } catch (e) {
    console.error("[admin/beta-requests] GET error:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST - Approve, reject, or delete a request
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { requestId, action, notes } = body;

    if (!requestId || !action || !['approve', 'reject', 'delete'].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid action. Use 'approve', 'reject', or 'delete'" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    // Handle delete action - just remove the request
    if (action === 'delete') {
      const { error: deleteError } = await sb
        .from('beta_tester_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      return NextResponse.json({ 
        ok: true, 
        message: "Request removed successfully" 
      });
    }

    // Get the request for approve/reject
    const { data: request, error: reqError } = await sb
      .from('beta_tester_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }

    if (request.status !== 'pending') {
      return NextResponse.json(
        { ok: false, error: "Request has already been processed" },
        { status: 400 }
      );
    }

    // Update request status
    const { error: updateError } = await sb
      .from('beta_tester_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.discord_id || admin.username,
        review_notes: notes?.trim() || null,
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // If approved, add to beta_testers table
    if (action === 'approve') {
      const { data: existing } = await sb
        .from('beta_testers')
        .select('id')
        .eq('discord_id', request.discord_id)
        .single();

      if (!existing) {
        await sb.from('beta_testers').insert({
          discord_id: request.discord_id,
          username: request.username,
          avatar_url: request.avatar_url,
          notes: `Approved by ${admin.username}. ${notes || ''}`.trim(),
          is_active: true,
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        });
      } else {
        await sb
          .from('beta_testers')
          .update({ is_active: true })
          .eq('id', existing.id);
      }

      // Try to send DM to user (don't fail if this doesn't work)
      try {
        await sendApprovalDM(request, true);
      } catch (dmError) {
        console.error("[admin/beta-requests] DM failed but approval succeeded:", dmError);
      }
    } else {
      // Try to send DM for rejection (don't fail if this doesn't work)
      try {
        await sendApprovalDM(request, false, notes);
      } catch (dmError) {
        console.error("[admin/beta-requests] DM failed but rejection succeeded:", dmError);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
    });
  } catch (e) {
    console.error("[admin/beta-requests] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to process request" },
      { status: 500 }
    );
  }
}

async function sendApprovalDM(request: any, approved: boolean, notes?: string) {
  if (!BOT_TOKEN || !request.discord_id) return;

  try {
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: { 
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ recipient_id: request.discord_id }),
    });

    if (!dmRes.ok) return;

    const dm = await dmRes.json();

    const message = approved
      ? `🎉 **Congratulations!**\n\nYour beta tester application has been **APPROVED**!\n\nYou now have access to the Beta Portal with exclusive features like the Raid Switch system.\n\nVisit: ${process.env.NEXT_PUBLIC_SITE_URL}/beta`
      : `❌ **Beta Application Update**\n\nYour beta tester application has been declined.${notes ? `\n\nReason: ${notes}` : ''}\n\nYou can apply again in the future.`;

    await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ content: message }),
    });
  } catch (e) {
    console.error("[admin/beta-requests] DM failed:", e);
  }
}
