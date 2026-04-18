import { NextResponse } from "next/server";

// Verify Discord Ed25519 signature
async function verifyDiscordSignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = hexToUint8Array(publicKey);
    const sigData = hexToUint8Array(signature);
    const message = encoder.encode(timestamp + body);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    return await crypto.subtle.verify("Ed25519", cryptoKey, sigData, message);
  } catch (e) {
    console.error("[discord-interactions] Signature verification error:", e);
    return false;
  }
}

function hexToUint8Array(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

// Discord interactions endpoint for button clicks
export async function GET() {
  return NextResponse.json({ message: "Discord interactions endpoint ready" });
}

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";
  const rawBody = await req.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY || "";
  
  console.log("[discord-interactions] publicKey present:", !!publicKey, "sig:", signature?.slice(0,10), "ts:", timestamp);

  if (publicKey) {
    const isValid = await verifyDiscordSignature(publicKey, signature, timestamp, rawBody);
    console.log("[discord-interactions] signature valid:", isValid);
    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }
  } else {
    console.log("[discord-interactions] WARNING: No DISCORD_PUBLIC_KEY set, skipping verification");
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  
  console.log("[discord-interactions] type:", body.type, "custom_id:", body.data?.custom_id);
  
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
