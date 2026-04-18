import { NextResponse } from "next/server";

// Discord interactions endpoint for button clicks
export async function GET() {
  // Discord sometimes checks with GET first
  return NextResponse.json({ message: "Discord interactions endpoint ready" });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  
  console.log("[discord-interactions] Received:", body);
  
  // PING verification (type 1)
  if (body.type === 1) {
    return NextResponse.json({ type: 1 });
  }
  
  // Must be a button click (type 3 = MESSAGE_COMPONENT)
  if (body.type !== 3) {
    return NextResponse.json({ type: 1 });
  }

  // Get the custom_id from the button
  const customId = body.data?.custom_id || "";
  if (!customId.startsWith("close_ticket_")) {
    return NextResponse.json({ type: 1 });
  }

  const channelId = customId.replace("close_ticket_", "");
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  
  if (!botToken) {
    return NextResponse.json({ 
      type: 4,
      data: { content: "❌ Bot token not configured", flags: 64 }
    });
  }

  // Respond immediately - Discord needs this within 3 seconds
  // Fire and forget the actual closing
  (async () => {
    try {
      // Send closing message to channel
      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "🔒 **Ticket Closed by Staff** - This channel will be deleted in 5 seconds.",
        }),
      });

      // Wait 5 seconds then delete
      await new Promise(r => setTimeout(r, 5000));
      
      await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bot ${botToken}` },
      });
    } catch (e) {
      console.error("[discord-interactions] Error closing:", e);
    }
  })();

  // Return success immediately
  return NextResponse.json({
    type: 4,
    data: { 
      content: "✅ Closing ticket... Channel will be deleted in 5 seconds.",
      flags: 64
    }
  });
}
