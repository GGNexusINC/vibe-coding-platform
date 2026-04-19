import { appendActivityEntry, readActivityEntries } from "@/lib/activity-store";

type ActivityType =
  | "login"
  | "logout"
  | "support_ticket"
  | "purchase_intent"
  | "admin_broadcast";

export type ActivityLogEntry = {
  id: string;
  type: ActivityType;
  createdAt: string;
  username?: string;
  discordId?: string;
  avatarUrl?: string;
  globalName?: string | null;
  discriminator?: string | null;
  profile?: Record<string, unknown>;
  details: string;
  metadata?: {
    pageUrl?: string;
    ip?: string;
    os?: string;
    browser?: string;
    device?: string;
    userAgent?: string;
    isAdmin?: boolean;
    timestamp?: string;
    [key: string]: unknown;
  };
};

const MAX_LOGS = 300;

export async function logActivity(input: Omit<ActivityLogEntry, "id" | "createdAt">) {
  const entry: ActivityLogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  await appendActivityEntry(entry, MAX_LOGS);
  return entry;
}

export async function getRecentActivities(limit = 80): Promise<ActivityLogEntry[]> {
  const store = await readActivityEntries();
  return store.slice(0, Math.max(1, Math.min(limit, MAX_LOGS)));
}

export async function getActivitySummary(activeWindowMinutes = 15) {
  const store = await readActivityEntries();
  const activeCutoff = Date.now() - activeWindowMinutes * 60 * 1000;
  const members = new Map<
    string,
    {
      discordId: string;
      username: string;
      globalName?: string | null;
      discriminator?: string | null;
      avatarUrl?: string;
      profile?: Record<string, unknown>;
      lastActiveAt: string;
      events: number;
      days: Set<string>;
      activeNow: boolean;
    }
  >();
  const activeDaysObserved = new Set<string>();

  for (const entry of store) {
    activeDaysObserved.add(entry.createdAt.slice(0, 10));

    if (!entry.discordId) continue;

    const existing = members.get(entry.discordId) ?? {
      discordId: entry.discordId,
      username: entry.username || "Unknown member",
      globalName: entry.globalName,
      discriminator: entry.discriminator,
      avatarUrl: entry.avatarUrl,
      profile: entry.profile,
      lastActiveAt: entry.createdAt,
      events: 0,
      days: new Set<string>(),
      activeNow: false,
    };

    existing.username = entry.username || existing.username;
    existing.globalName = entry.globalName ?? existing.globalName;
    existing.discriminator = entry.discriminator ?? existing.discriminator;
    existing.avatarUrl = entry.avatarUrl ?? existing.avatarUrl;
    existing.profile = entry.profile ?? existing.profile;
    existing.events += 1;
    existing.days.add(entry.createdAt.slice(0, 10));

    if (new Date(entry.createdAt).getTime() > new Date(existing.lastActiveAt).getTime()) {
      existing.lastActiveAt = entry.createdAt;
    }

    if (new Date(entry.createdAt).getTime() >= activeCutoff) {
      existing.activeNow = true;
    }

    members.set(entry.discordId, existing);
  }

  const memberList = [...members.values()]
    .map((member) => ({
      discordId: member.discordId,
      username: member.username,
      globalName: member.globalName,
      discriminator: member.discriminator,
      avatarUrl: member.avatarUrl,
      profile: member.profile,
      lastActiveAt: member.lastActiveAt,
      activeDays: member.days.size,
      events: member.events,
      activeNow: member.activeNow,
    }))
    .sort((a, b) => {
      if (Number(b.activeNow) !== Number(a.activeNow)) {
        return Number(b.activeNow) - Number(a.activeNow);
      }
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    });

  return {
    totalMembersTracked: memberList.length,
    activeNowCount: memberList.filter((member) => member.activeNow).length,
    totalEvents: store.length,
    activeDaysObserved: activeDaysObserved.size,
    members: memberList,
  };
}
