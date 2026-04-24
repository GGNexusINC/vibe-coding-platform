import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";
import { getRecentActivities, logActivity } from "@/lib/activity-log";
import { sendTicketPresenceStatus } from "@/lib/discord-bot";
import { getSession } from "@/lib/session";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ticketId } = await params;
  const body = await req.json().catch(() => ({}));
  const channelId = String(body?.channelId ?? "").trim();
  const requestedState = String(body?.state ?? "active").toLowerCase();
  const state = requestedState === "closed" ? "closed" : "active";
  const requestedSide = String(body?.side ?? "user").toLowerCase();
  const [user, admin] = await Promise.all([getSession(), getAdminSession()]);

  if (!channelId) {
    return NextResponse.json({ ok: false, error: "channelId required" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Presence store unavailable." }, { status: 500 });
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, discord_channel_id, guest_email")
    .eq("id", ticketId)
    .single();

  const isAdmin = Boolean(admin?.discord_id);
  const ownsTicket = Boolean(user?.discord_id && ticket?.guest_email === `discord:${user.discord_id}`);
  const channelMatches = Boolean(ticket?.discord_channel_id && ticket.discord_channel_id === channelId);
  const ownsGuestTicket = Boolean(channelMatches && !ticket?.guest_email && !user?.discord_id);

  if (!channelMatches || (!isAdmin && !ownsTicket && !ownsGuestTicket)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const side = requestedSide === "staff" && isAdmin ? "staff" : "user";
  const active = side === "staff" ? admin : (user ?? admin);
  const username = active?.username ?? "Guest";

  await logActivity({
    type: "ticket_presence",
    username,
    discordId: active?.discord_id,
    avatarUrl: user?.avatar_url ?? undefined,
    globalName: user?.global_name,
    details: `${side === "staff" ? "Staff" : "User"} ${state === "active" ? "active in" : "left"} ticket ${ticketId}.`,
    metadata: {
      ticketId,
      channelId,
      side,
      state,
    },
  }).catch(() => null);

  const recent = await getRecentActivities(120).catch(() => []);
  async function publishPresenceNotice(sideToNotify: "user" | "staff", stateToNotify: "active" | "closed", viewerName: string) {
    const lastNotice = recent.find((entry) => {
      const meta = entry.metadata ?? {};
      return (
        entry.type === "ticket_presence" &&
        meta.kind === "discord_presence_notice" &&
        meta.ticketId === ticketId &&
        meta.channelId === channelId &&
        meta.side === sideToNotify
      );
    });
    const lastNoticeAt = lastNotice ? new Date(lastNotice.createdAt).getTime() : 0;
    const lastNoticeState = String(lastNotice?.metadata?.state ?? "");
    const now = Date.now();
    const shouldNotifyDiscord =
      stateToNotify === "closed"
        ? lastNoticeState !== "closed" || now - lastNoticeAt > 10_000
        : lastNoticeState !== "active" || now - lastNoticeAt > 60_000;

    if (!shouldNotifyDiscord) return;

    const existingMessageId =
      typeof lastNotice?.metadata?.messageId === "string" ? lastNotice.metadata.messageId : null;
    const messageId = await sendTicketPresenceStatus(channelId, {
      state: stateToNotify,
      side: sideToNotify,
      username: viewerName,
      ticketId,
      messageId: existingMessageId,
    });
    if (messageId) {
      await logActivity({
        type: "ticket_presence",
        username: "Ticket Presence Monitor",
        details: `${sideToNotify} live window ${stateToNotify} notice sent to Discord for ticket ${ticketId}.`,
        metadata: {
          kind: "discord_presence_notice",
          ticketId,
          channelId,
          messageId,
          side: sideToNotify,
          state: stateToNotify,
        },
      }).catch(() => null);
    }
  }

  await publishPresenceNotice(side, state, username);

  if (side === "user" && isAdmin) {
    const staleStaffNotice = recent.find((entry) => {
      const meta = entry.metadata ?? {};
      return (
        entry.type === "ticket_presence" &&
        meta.kind === "discord_presence_notice" &&
        meta.ticketId === ticketId &&
        meta.channelId === channelId &&
        meta.side === "staff" &&
        meta.state === "active"
      );
    });
    if (staleStaffNotice) {
      await publishPresenceNotice("staff", "closed", admin?.username ?? "Staff");
    }
  }

  return NextResponse.json({ ok: true, activeAt: new Date().toISOString() });
}
