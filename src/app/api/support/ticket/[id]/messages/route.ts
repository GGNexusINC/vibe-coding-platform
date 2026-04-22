import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/admin-auth";
import { getSession } from "@/lib/session";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function canAccessTicket(ticketId: string, channelId: string) {
  const [user, admin] = await Promise.all([getSession(), getAdminSession()]);
  if (admin?.discord_id) return { ok: true, user, admin };

  if (!user?.discord_id) return { ok: false, user, admin };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, user, admin };

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, discord_channel_id, guest_email")
    .eq("id", ticketId)
    .single();

  const ownsTicket = ticket?.guest_email === `discord:${user.discord_id}`;
  const channelMatches = Boolean(ticket?.discord_channel_id && ticket.discord_channel_id === channelId);

  return { ok: Boolean(ownsTicket && channelMatches), user, admin };
}

function normalizeMessage(msg: {
  id: string;
  author_id: string;
  author_username: string;
  author_avatar?: string | null;
  content: string;
  created_at: string;
}) {
  return {
    id: msg.id,
    author_id: msg.author_id,
    author_username: msg.author_username,
    author_avatar: msg.author_avatar ?? undefined,
    content: msg.content,
    created_at: msg.created_at,
  };
}

// Get messages for a ticket (persisted history first, Discord fallback)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ ok: false, error: "channelId required" }, { status: 400 });
  }

  const access = await canAccessTicket(ticketId, channelId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const storedMessages = supabase
      ? await supabase
          .from("discord_messages")
          .select("id, author_id, author_username, author_avatar, content, created_at")
          .eq("channel_id", channelId)
          .order("created_at", { ascending: true })
          .limit(250)
      : { data: [], error: null as any };

    const messages = new Map<string, ReturnType<typeof normalizeMessage>>();

    for (const msg of storedMessages.data ?? []) {
      messages.set(msg.id, normalizeMessage(msg));
    }

    const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
    if (botToken) {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=50`, {
        headers: {
          "Authorization": `Bot ${botToken}`,
        },
      });

      if (res.ok) {
        const discordMessages = await res.json();
        for (const msg of discordMessages.reverse()) {
          messages.set(msg.id, normalizeMessage({
            id: msg.id,
            author_id: msg.author.id,
            author_username: msg.author.username,
            author_avatar: msg.author.avatar
              ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
              : undefined,
            content: msg.content,
            created_at: msg.timestamp,
          }));
        }
      }
    }

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticketId,
        channelId: channelId,
      },
      messages: [...messages.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    });
  } catch (e) {
    console.error("[ticket-messages] Error fetching:", e);
    return NextResponse.json({ ok: false, error: "Failed to fetch" }, { status: 500 });
  }
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

  const access = await canAccessTicket(ticketId, channelId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const user = access.user;

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

    // Store in database for the admin panel ticket history
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from("discord_messages").upsert({
          id: message.id,
          channel_id: channelId,
          channel_name: "ticket-channel",
          author_id: user?.discord_id || "guest",
          author_username: user?.username || "Guest",
          author_avatar: user?.avatar_url,
          content,
        });
      }
    } catch {
      // Ignore DB errors
    }

    return NextResponse.json({ ok: true, messageId: message.id });
  } catch (e) {
    console.error("[ticket-chat] Error:", e);
    return NextResponse.json({ ok: false, error: "Failed to send" }, { status: 500 });
  }
}
