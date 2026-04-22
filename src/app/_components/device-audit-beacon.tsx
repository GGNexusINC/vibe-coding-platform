"use client";

import { useEffect } from "react";

type SessionResponse = {
  ok: boolean;
  user?: {
    discord_id?: string;
    username?: string;
    isAdmin?: boolean;
  } | null;
};

function getGpuInfo() {
  if (typeof document === "undefined") {
    return { gpu: "Unavailable", gpuVendor: "Unavailable" };
  }

  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");

  if (!gl) {
    return { gpu: "WebGL unavailable", gpuVendor: "Unknown" };
  }

  const webgl = gl as WebGLRenderingContext;
  const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");

  if (!debugInfo) {
    return {
      gpu: webgl.getParameter(webgl.RENDERER) as string,
      gpuVendor: webgl.getParameter(webgl.VENDOR) as string,
    };
  }

  return {
    gpu: webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string,
    gpuVendor: webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string,
  };
}

function getConnectionInfo() {
  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        type?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    }
  ).connection;

  return {
    connectionType: connection?.type || "Unknown",
    effectiveType: connection?.effectiveType || "Unknown",
    downlink: connection?.downlink ?? null,
    rtt: connection?.rtt ?? null,
    saveData: connection?.saveData ?? false,
  };
}

function buildPayload() {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: {
      platform?: string;
      mobile?: boolean;
      brands?: Array<{ brand: string; version: string }>;
    };
  };
  const gpu = getGpuInfo();

  return {
    pageUrl: window.location.pathname,
    href: window.location.href,
    referrer: document.referrer || "Unknown",
    gpu: gpu.gpu,
    gpuVendor: gpu.gpuVendor,
    userAgent: navigator.userAgent,
    platform: nav.userAgentData?.platform || navigator.platform || "Unknown",
    userAgentBrands: nav.userAgentData?.brands || [],
    mobile: nav.userAgentData?.mobile ?? /Mobi|Android|iPhone/i.test(navigator.userAgent),
    languages: navigator.languages || [navigator.language].filter(Boolean),
    language: navigator.language || "Unknown",
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemory: nav.deviceMemory ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    connection: getConnectionInfo(),
  };
}

export function DeviceAuditBeacon() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const sessionRes = await fetch("/api/session", { cache: "no-store" });
        const session = (await sessionRes.json()) as SessionResponse;
        const discordId = session.user?.discord_id;
        if (!session.ok || !discordId || cancelled) return;

        const day = new Date().toISOString().slice(0, 10);
        const key = `nh-device-audit:${discordId}:${day}`;
        if (localStorage.getItem(key)) return;

        const res = await fetch("/api/activity/device-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
          keepalive: true,
        });

        if (res.ok) {
          localStorage.setItem(key, "1");
        }
      } catch {
        // Silent by design: login should never fail because hardware audit failed.
      }
    };

    const id =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(run)
        : globalThis.setTimeout(run, 1200);

    return () => {
      cancelled = true;
      if ("cancelIdleCallback" in window && "requestIdleCallback" in window) {
        window.cancelIdleCallback(id as number);
      }
    };
  }, []);

  return null;
}
