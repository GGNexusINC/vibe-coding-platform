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
          content:
            `⏳ **Admin Access Request**\n` +
            `**${username}** (ID: \`${u.id}\`) requested admin access.\n` +
            `Go to the Admin Roster panel to approve or deny.\n` +
            `Time (UTC): \`${now}\``,
          username: "NewHopeGGN Admin Gate",
          avatar_url: avatarUrl ?? undefined,
        });
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
        content:
          `🔐 **Admin Login**\n` +
          `Admin: **${username}**\n` +
          `Discord ID: \`${u.id}\`\n` +
          `Time (UTC): \`${now}\`\n` +
          `Origin: \`${origin}\``,
        username: "NewHopeGGN Logs",
        avatar_url: avatarUrl ?? undefined,
      });
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
