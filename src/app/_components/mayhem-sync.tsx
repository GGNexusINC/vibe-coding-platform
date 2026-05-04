"use client";

import { useEffect, useState } from "react";

export function MayhemSync() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Initial fetch
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/admin/mayhem-mode");
        const data = await res.json();
        if (data.ok) {
          setEnabled(data.enabled);
        }
      } catch (e) {
        console.error("Failed to sync mayhem mode:", e);
      }
    };

    fetchStatus();

    // Poll every 5 seconds for global changes
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (enabled) {
      document.body.classList.add("mayhem-mode");
    } else {
      document.body.classList.remove("mayhem-mode");
    }
  }, [enabled]);

  return null;
}
