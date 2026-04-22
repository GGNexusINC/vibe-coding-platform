import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { sendDiscordWebhook } from "@/lib/discord";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in first" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { reason, experience, playTime } = body;
    const sb = getSupabase();

    const { data: existingTester } = await sb
      .from("beta_testers")
      .select("id")
      .eq("discord_id", user.discord_id)
      .eq("is_active", true)
      .single();

    if (existingTester) {
      return NextResponse.json({ ok: false, error: "You are already a beta tester." }, { status: 400 });
    }

    const { data: existingRequest } = await sb
      .from("beta_tester_requests")
      .select("id, status")
      .eq("discord_id", user.discord_id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .single();

    if (existingRequest?.status === "pending") {
      return NextResponse.json({ ok: false, error: "You already have a pending request. Please wait for approval." }, { status: 400 });
    }

    if (existingRequest?.status === "approved") {
      return NextResponse.json({ ok: false, error: "You are already a beta tester. Check /beta portal." }, { status: 400 });
    }

    if (existingRequest?.status === "rejected") {
      const { error: updateError } = await sb
        .from("beta_tester_requests")
        .update({
          status: "pending",
          reason: reason?.trim() || null,
          experience: experience?.trim() || null,
          play_time: playTime?.trim() || null,
          requested_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
          review_notes: null,
        })
        .eq("id", existingRequest.id);

      if (updateError) throw updateError;

      const { data: updatedRequest } = await sb
        .from("beta_tester_requests")
        .select("*")
        .eq("id", existingRequest.id)
        .single();

      if (updatedRequest) await notifyAdmins(updatedRequest, user);

      return NextResponse.json({ ok: true, message: "Re-application submitted. Admins will review your application." });
    }

    const { data: request, error } = await sb
      .from("beta_tester_requests")
      .insert({
        discord_id: user.discord_id,
        username: user.username,
        avatar_url: user.avatar_url,
        reason: reason?.trim() || null,
        experience: experience?.trim() || null,
        play_time: playTime?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    await notifyAdmins(request, user);

    return NextResponse.json({ ok: true, message: "Request submitted. Admins will review your application." });
  } catch (e) {
    console.error("[beta/request] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to submit request" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sb = getSupabase();
    const { data: request } = await sb
      .from("beta_tester_requests")
      .select("*")
      .eq("discord_id", user.discord_id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ ok: true, request: request || null });
  } catch {
    return NextResponse.json({ ok: true, request: null });
  }
}

async function notifyAdmins(request: any, user: any) {
  const logsWebhookUrl = env.discordWebhookUrlForPage("tickets") || env.discordWebhookUrlForPage("support");
  if (!logsWebhookUrl) return;

  try {
    await sendDiscordWebhook(
      {
        username: "NewHopeGGN Beta Requests",
        content: "@here New beta tester application received.",
        embeds: [
          {
            title: "Beta Tester Request",
            description: `**${user.username}** wants to join the beta program.`,
            color: 0xf59e0b,
            fields: [
              { name: "User", value: `<@${user.discord_id}>`, inline: true },
              { name: "Username", value: user.username, inline: true },
              ...(request.reason ? [{ name: "Why Join?", value: request.reason }] : []),
              ...(request.experience ? [{ name: "Experience", value: request.experience }] : []),
              ...(request.play_time ? [{ name: "Play Time", value: request.play_time }] : []),
              { name: "Review", value: `[Open Admin Panel](${process.env.NEXT_PUBLIC_SITE_URL}/admin?tab=beta) -> Beta Tester Requests`, inline: false },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      },
      { webhookUrl: logsWebhookUrl },
    );
  } catch (e) {
    console.error("[beta/request] Admin notification failed:", e);
  }
}
