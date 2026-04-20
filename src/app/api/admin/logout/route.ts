import { NextResponse } from "next/server";
import { clearAdminSession, getAdminSession } from "@/lib/admin-auth";

const STAFF_WEBHOOK = "https://discord.com/api/webhooks/1494203915053563986/UmeAj1IZseuwq5S9_zkDV-uIQd4Cq1hbdCMQ8peF-5dq4zjd_LOQR1Tr44OHrCrnkVu5";

export async function POST(req: Request) {
  const session = await getAdminSession();
  const username = session?.username ?? "Unknown Admin";
  const discordId = session?.discord_id ?? null;

  await clearAdminSession();

  // Fire-and-forget — don't block the response
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ts = Math.floor(Date.now() / 1000);
  fetch(STAFF_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "NewHopeGGN Security",
      embeds: [{
        title: "🔓 Admin Logged Out",
        color: 0xf59e0b,
        fields: [
          { name: "Admin", value: discordId ? `<@${discordId}> (${username})` : username, inline: true },
          { name: "IP", value: `\`${ip}\``, inline: true },
        ],
        footer: { text: "NewHopeGGN Admin Panel" },
        timestamp: new Date().toISOString(),
        description: `Admin session ended <t:${ts}:R>.`,
      }],
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
