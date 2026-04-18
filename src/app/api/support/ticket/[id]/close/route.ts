import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const body = await req.json().catch(() => ({}));
  const channelId = String(body?.channelId ?? "").trim();

  if (!channelId) {
    return NextResponse.json({ ok: false, error: "Channel ID required" }, { status: 400 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ ok: false, error: "Bot not configured" }, { status: 500 });
  }

  try {
    // Send closing message to Discord
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "🔒 **Ticket Closed** - This channel will be deleted in 5 seconds.",
      }),
    });

    // Wait 5 seconds then delete the channel
    setTimeout(async () => {
      await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bot ${botToken}`,
        },
      });
    }, 5000);

    // Update ticket status in DB (ignore errors)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from("tickets").update({ status: "closed" }).eq("id", ticketId);
    } catch {
      // Ignore
    }

    return NextResponse.json({ ok: true, message: "Ticket closed" });
  } catch (e) {
    console.error("[ticket-close] Error:", e);
    return NextResponse.json({ ok: false, error: "Failed to close ticket" }, { status: 500 });
  }
}
