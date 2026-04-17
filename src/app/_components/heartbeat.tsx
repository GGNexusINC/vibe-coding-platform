"use client";

import { useEffect } from "react";

export function Heartbeat() {
  useEffect(() => {
    const beat = () =>
      void fetch("/api/heartbeat", { method: "POST" }).catch(() => null);

    beat();
    const timer = window.setInterval(beat, 3 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
