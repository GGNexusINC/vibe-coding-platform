"use client";

import { useEffect } from "react";

export function Heartbeat() {
  useEffect(() => {
    const beat = () => {
      const page = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      void fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      }).catch(() => null);
    };

    beat();
    const timer = window.setInterval(beat, 3 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
