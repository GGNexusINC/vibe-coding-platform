import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

// Get messages for a ticket
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const user = await getSession();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get ticket to find Discord channel
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, discord_messages(*)")
    .eq("id", ticketId)
    .single();

  if (!ticket) {
    return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404 });
  }

  // Check ownership (allow guests with matching email, or authenticated users)
  const userId = (user as any)?.id;
  if (ticket.user_id && ticket.user_id !== userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  // Fetch Discord messages for this channel
  let discordMessages = [];
  if (ticket.discord_channel_id) {
    const { data: messages } = await supabase
      .from("discord_messages")
      .select("*")
      .eq("channel_id", ticket.discord_channel_id)
      .order("created_at", { ascending: true });
    discordMessages = messages || [];
  }

  return NextResponse.json({
    ok: true,
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      channelId: ticket.discord_channel_id,
    },
    messages: discordMessages,
  });
}

// Send message to Discord
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const body = await req.json().catch(() => ({}));
  const content = String(body?.message ?? "").trim();
  const channelId = String(body?.channelId ?? "").trim();

  if (!content) {
    return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
  }

  if (!channelId) {
    return NextResponse.json({ ok: false, error: "Channel ID required" }, { status: 400 });
  }

  const user = await getSession();

  // Send to Discord
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ ok: false, error: "Bot not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `**${user?.username || "Guest"}:** ${content}`,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[ticket-chat] Failed to send to Discord:", error);
      return NextResponse.json({ ok: false, error: "Failed to send message" }, { status: 500 });
    }

    const message = await res.json();

    // Store in database (optional - ignore errors)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from("discord_messages").insert({
        id: message.id,
        channel_id: channelId,
        channel_name: "ticket-channel",
        author_id: user?.discord_id || "guest",
        author_username: user?.username || "Guest",
        author_avatar: user?.avatar_url,
        content,
      });
    } catch {
      // Ignore DB errors
    }

    return NextResponse.json({ ok: true, messageId: message.id });
  } catch (e) {
    console.error("[ticket-chat] Error:", e);
    return NextResponse.json({ ok: false, error: "Failed to send" }, { status: 500 });
  }
}
