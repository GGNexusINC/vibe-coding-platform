import { NextResponse } from "next/server";
import {
  exchangeDiscordCodeForToken,
  fetchDiscordUser,
  getDiscordAvatarUrl,
} from "@/lib/discord-oauth";
import { setAdminSession, isAdminDiscordId } from "@/lib/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord";
import { logActivity } from "@/lib/activity-log";
import { upsertAdmin, getAdminByDiscordId } from "@/lib/admin-roster";

const STAFF_WEBHOOK = "https://discord.com/api/webhooks/1494203915053563986/UmeAj1IZseuwq5S9_zkDV-uIQd4Cq1hbdCMQ8peF-5dq4zjd_LOQR1Tr44OHrCrnkVu5";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const now = new Date().toISOString();
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/admin?auth=missing_code`);
  }

  try {
    const token = await exchangeDiscordCodeForToken({ origin, code, adminCallback: true });
    const u = await fetchDiscordUser(token.access_token);
    const avatarUrl = getDiscordAvatarUrl(u);
    const username = u.global_name || u.username;

    // Owners listed in ADMIN_DISCORD_IDS env var are auto-approved always
    const isOwner = isAdminDiscordId(u.id);

    // Check roster for existing record
    const existing = await getAdminByDiscordId(u.id);

    // Determine effective status
    let status: "approved" | "pending" | "denied" = "pending";
    if (isOwner) {
      status = "approved";
    } else if (existing) {
      status = existing.status;
    }

    // Upsert into roster (keeps username/avatar up to date)
    await upsertAdmin({
      discordId: u.id,
      username,
      avatarUrl: avatarUrl ?? undefined,
      status,
    });

    if (status === "denied") {
      return NextResponse.redirect(
        `${origin}/admin?auth=unauthorized&msg=${encodeURIComponent("Your admin access has been denied.")}`,
      );
    }

    if (status === "pending") {
      // Notify existing admins via webhook that someone is waiting
      try {
        await sendDiscordWebhook({
          username: "NewHopeGGN Security",
          avatar_url: avatarUrl ?? undefined,
          embeds: [{
            title: "⏳ Admin Access Request",
            color: 0xf59e0b,
            description: `**${username}** wants admin access.\nGo to the Admin Roster panel to approve or deny.`,
            fields: [
              { name: "Discord ID", value: `\`${u.id}\``, inline: true },
              { name: "Time", value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
            ],
            thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
            footer: { text: "NewHopeGGN Admin Panel" },
            timestamp: now,
          }],
        }, { webhookUrl: STAFF_WEBHOOK });
      } catch {
        // non-fatal
      }
      return NextResponse.redirect(
        `${origin}/admin?auth=pending&msg=${encodeURIComponent("Your request is pending approval by an existing admin.")}`,
      );
    }

    // Approved — grant session
    await setAdminSession({ discord_id: u.id, username });

    try {
      await logActivity({
        type: "login",
        username,
        discordId: u.id,
        avatarUrl: avatarUrl ?? undefined,
        globalName: u.global_name,
        discriminator: u.discriminator ?? null,
        profile: u as unknown as Record<string, unknown>,
        details: "Admin signed in via Discord OAuth.",
      });
      await sendDiscordWebhook({
        username: "NewHopeGGN Security",
        avatar_url: avatarUrl ?? undefined,
        embeds: [{
          title: "🔐 Admin Logged In",
          color: 0x22c55e,
          description: `Admin session started <t:${Math.floor(Date.now()/1000)}:R>.`,
          fields: [
            { name: "Admin", value: `<@${u.id}> (${username})`, inline: true },
            { name: "Origin", value: `\`${origin}\``, inline: true },
          ],
          thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
          footer: { text: "NewHopeGGN Admin Panel" },
          timestamp: now,
        }],
      }, { webhookUrl: STAFF_WEBHOOK });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      console.error("Admin login webhook failed", msg);
    }

    return NextResponse.redirect(`${origin}/admin?auth=ok`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      `${origin}/admin?auth=error&msg=${encodeURIComponent(msg)}`,
    );
  }
}
