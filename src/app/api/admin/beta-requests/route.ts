import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { env } from "@/lib/env";
import { sendDiscordWebhook } from "@/lib/discord";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

type BetaRequest = {
  id: string;
  discord_id?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  status?: string | null;
};

type AdminSession = {
  discord_id?: string | null;
  username?: string | null;
  role?: string | null;
};

// GET - List all pending requests
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sb = getSupabase();

    const { data: requests, error } = await sb
      .from("beta_tester_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, requests: requests || [] });
  } catch (e) {
    console.error("[admin/beta-requests] GET error:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch requests" },
      { status: 500 },
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

    if (!requestId || !action || !["approve", "reject", "delete"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid action. Use 'approve', 'reject', or 'delete'" },
        { status: 400 },
      );
    }

    const sb = getSupabase();

    // Handle delete action - just remove the request.
    if (action === "delete") {
      const { error: deleteError } = await sb
        .from("beta_tester_requests")
        .delete()
        .eq("id", requestId);

      if (deleteError) throw deleteError;

      return NextResponse.json({
        ok: true,
        message: "Request removed successfully",
      });
    }

    // Get the request for approve/reject.
    const { data: request, error: reqError } = await sb
      .from("beta_tester_requests")
      .select("*")
      .eq("id", requestId)
      .single<BetaRequest>();

    if (reqError || !request) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "Request has already been processed" },
        { status: 400 },
      );
    }

    const cleanNotes = typeof notes === "string" ? notes.trim() : "";
    const approved = action === "approve";

    // Update request status.
    const { error: updateError } = await sb
      .from("beta_tester_requests")
      .update({
        status: approved ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.discord_id || admin.username,
        review_notes: cleanNotes || null,
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    // If approved, add to beta_testers table.
    if (approved) {
      const { data: existing } = await sb
        .from("beta_testers")
        .select("id")
        .eq("discord_id", request.discord_id)
        .single();

      if (!existing) {
        await sb.from("beta_testers").insert({
          discord_id: request.discord_id,
          username: request.username,
          avatar_url: request.avatar_url,
          notes: `Approved by ${admin.username}. ${cleanNotes}`.trim(),
          is_active: true,
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        });
      } else {
        await sb
          .from("beta_testers")
          .update({ is_active: true })
          .eq("id", existing.id);
      }
    }

    let dmSent = false;
    let staffLogSent = false;

    try {
      dmSent = await sendApprovalDM(request, approved, cleanNotes);
    } catch (dmError) {
      console.error("[admin/beta-requests] DM failed but decision succeeded:", dmError);
    }

    try {
      staffLogSent = await sendBetaDecisionLog(request, admin, approved, cleanNotes);
    } catch (logError) {
      console.error("[admin/beta-requests] Staff log failed but decision succeeded:", logError);
    }

    return NextResponse.json({
      ok: true,
      message: `Request ${approved ? "approved" : "rejected"} successfully`,
      dmSent,
      staffLogSent,
    });
  } catch (e) {
    console.error("[admin/beta-requests] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to process request" },
      { status: 500 },
    );
  }
}

async function sendApprovalDM(
  request: BetaRequest,
  approved: boolean,
  notes?: string,
): Promise<boolean> {
  if (!BOT_TOKEN || !request.discord_id) return false;

  try {
    const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: request.discord_id }),
    });

    if (!dmRes.ok) return false;

    const dm = await dmRes.json();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newhopeggn.vercel.app";

    const message = approved
      ? `**NewHopeGGN Beta Access Approved**\n\nYour beta tester application has been approved.\n\nYou now have access to the Beta Portal, Hive Command, Raid Switch, and upcoming test features.\n\nOpen Beta Portal: ${siteUrl}/beta\n\nThank you for helping us test and improve NewHopeGGN.`
      : `**NewHopeGGN Beta Application Update**\n\nYour beta tester application was not approved at this time.${notes ? `\n\nReason: ${notes}` : ""}\n\nYou can apply again in the future.`;

    const sendRes = await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: message }),
    });

    return sendRes.ok;
  } catch (e) {
    console.error("[admin/beta-requests] DM failed:", e);
    return false;
  }
}

async function sendBetaDecisionLog(
  request: BetaRequest,
  admin: AdminSession,
  approved: boolean,
  notes?: string,
): Promise<boolean> {
  const webhookUrl =
    env.discordWebhookUrlForPage("tickets") ||
    env.discordWebhookUrlForPage("support") ||
    env.discordWebhookUrl();

  if (!webhookUrl) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newhopeggn.vercel.app";
  const decision = approved ? "Approved" : "Rejected";
  const adminName = admin.username || admin.discord_id || "Unknown admin";
  const adminValue = admin.discord_id
    ? `<@${admin.discord_id}> (${adminName})`
    : adminName;

  await sendDiscordWebhook(
    {
      username: "NewHopeGGN Beta Logs",
      embeds: [
        {
          title: `Beta Tester ${decision}`,
          description: approved
            ? "A beta tester request was approved from the admin panel."
            : "A beta tester request was rejected from the admin panel.",
          color: approved ? 0x12d17f : 0xff4d6d,
          fields: [
            {
              name: "Applicant",
              value: request.discord_id
                ? `<@${request.discord_id}> (${request.username || "Unknown"})`
                : request.username || "Unknown",
              inline: false,
            },
            {
              name: "Discord ID",
              value: request.discord_id || "Unknown",
              inline: true,
            },
            {
              name: "Reviewed By",
              value: adminValue,
              inline: true,
            },
            {
              name: "Decision",
              value: decision,
              inline: true,
            },
            {
              name: "Notes",
              value: notes || "No notes provided.",
              inline: false,
            },
            {
              name: "Beta Portal",
              value: `${siteUrl}/beta`,
              inline: false,
            },
          ],
        },
      ],
    },
    { webhookUrl },
  );

  return true;
}
