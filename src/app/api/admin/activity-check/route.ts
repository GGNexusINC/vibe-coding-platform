import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { readActivityEntries } from "@/lib/activity-store";

// Suspicious Discord IDs to monitor
const BLOCKED_IDS = new Set([
  "1135694564863254559", // UnknownDarkness
  "draco", "dracio", "drac1o", // Dracio variants
]);

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const activities = await readActivityEntries();
  
  // Filter for blocked users and admin-related activities
  const suspicious = activities.filter(entry => {
    const isBlockedUser = entry.discordId && BLOCKED_IDS.has(entry.discordId);
    const isBlockedUsername = entry.username && 
      /(draco|dracio|drac1o|unknowndarkness|unknown)/i.test(entry.username);
    const isAdminActivity = entry.details?.toLowerCase().includes("admin") ||
      entry.type === "admin_broadcast" ||
      entry.details?.toLowerCase().includes("dashboard");
    
    return (isBlockedUser || isBlockedUsername) && isAdminActivity;
  });

  // Get all activity for these users (last 50)
  const allBlockedUserActivity = activities.filter(entry => {
    const isBlockedUser = entry.discordId && BLOCKED_IDS.has(entry.discordId);
    const isBlockedUsername = entry.username && 
      /(draco|dracio|drac1o|unknowndarkness|unknown)/i.test(entry.username);
    return isBlockedUser || isBlockedUsername;
  }).slice(0, 50);

  return NextResponse.json({
    ok: true,
    suspiciousAdminActivity: suspicious,
    allActivity: allBlockedUserActivity,
    totalChecked: activities.length,
  });
}
