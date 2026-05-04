import { createSupabaseAdminClient } from "./supabase/admin";
import { env } from "./env";

export const WEBHOOK_SLUGS = [
  { slug: 'ban-page', name: 'Ban Page Logs' },
  { slug: 'general-chat', name: 'General Chat Logs' },
  { slug: 'staff-page', name: 'Staff Page Logs' },
  { slug: 'staff-audits', name: 'Staff Audit Logs' },
  { slug: 'login-audits', name: 'Login Audit Logs' },
  { slug: 'server-audit', name: 'Server Audit Logs' },
  { slug: 'support', name: 'Support Ticket Logs' },
  { slug: 'tickets', name: 'Support Tickets Notification' },
  { slug: 'script-hook', name: 'Script Hook Logs' },
  { slug: 'minigame', name: 'Minigame Logs' },
  { slug: 'wipe', name: 'Wipe Event Logs' },
  { slug: 'arena', name: 'Arena Event Logs' },
  { slug: 'arena-logos', name: 'Arena Logo Logs' },
  { slug: 'lottery-entries', name: 'Lottery Entries Community' },
  { slug: 'lottery-winners', name: 'Lottery Winners Community' },
  { slug: 'device-audit', name: 'Device Hardware Audit' },
  { slug: 'store-attempts', name: 'Store Checkout Attempts' },
  { slug: 'store-sales', name: 'Store Sales (Paid)' },
  { slug: 'streamers', name: 'Streamer Applications' },
  { slug: 'inventory', name: 'Inventory Actions' }
] as const;

export type WebhookSlug = typeof WEBHOOK_SLUGS[number]['slug'];

export async function getDynamicWebhookUrl(slug: string): Promise<string | undefined> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "webhooks")
      .maybeSingle();

    const webhooks = (data?.value as Record<string, string>) || {};
    if (webhooks[slug]) return webhooks[slug];
  } catch (e) {
    console.error(`[webhooks] Failed to fetch dynamic webhook for ${slug}:`, e);
  }

  // Fallback to env vars
  return env.discordWebhookUrlForPage(slug);
}
