import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";
import { upsertPresence } from "@/lib/presence";

function parseUserAgent(ua: string | null) {
  if (!ua) return { os: "Unknown", browser: "Unknown", device: "Unknown" };
  
  const os = /Windows/.test(ua) ? "Windows" :
    /Mac/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" : "Unknown";
    
  const browser = /Chrome/.test(ua) ? "Chrome" :
    /Firefox/.test(ua) ? "Firefox" :
    /Safari/.test(ua) ? "Safari" :
    /Edge/.test(ua) ? "Edge" : "Unknown";
    
  const device = /Mobile/.test(ua) ? "Mobile" :
    /Tablet/.test(ua) ? "Tablet" : "Desktop";
    
  return { os, browser, device };
}

export async function POST(req: Request) {
  const [session, adminSession, headerList] = await Promise.all([
    getSession(),
    getAdminSession(),
    headers(),
  ]);

  const discordId = session?.discord_id ?? adminSession?.discord_id;
  const username = session?.username ?? adminSession?.username ?? "Unknown";
  const avatarUrl = session?.avatar_url ?? undefined;
  const globalName = session?.global_name ?? null;

  if (!discordId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Get detailed request info
  const userAgent = headerList.get("user-agent");
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "Unknown";
  const { os, browser, device } = parseUserAgent(userAgent);
  
  // Get current page from request body if provided
  let pageUrl = "/";
  try {
    const body = await req.json();
    pageUrl = body?.page || "/";
  } catch {
    // No body provided, use default
  }

  const isAdmin = !!adminSession;

  await Promise.all([
    logActivity({
      type: "login",
      username,
      discordId,
      avatarUrl,
      globalName,
      discriminator: null,
      details: isAdmin 
        ? `Admin active — ${pageUrl}` 
        : `User active — ${pageUrl}`,
      metadata: {
        pageUrl,
        ip,
        os,
        browser,
        device,
        userAgent: userAgent || "Unknown",
        isAdmin,
        timestamp: new Date().toISOString(),
      },
    }),
    upsertPresence({ discordId, username, avatarUrl, globalName }),
  ]);

  return NextResponse.json({ ok: true });
}
