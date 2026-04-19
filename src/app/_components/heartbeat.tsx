"use client";

import { useEffect, useRef } from "react";

export function Heartbeat() {
  const pageRef = useRef("/");

  useEffect(() => {
    // Update current page whenever URL changes
    const updatePage = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      pageRef.current = path + search + hash;
    };

    // Track initial page
    updatePage();

    // Listen for navigation changes
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      updatePage();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      updatePage();
    };

    window.addEventListener("popstate", updatePage);

    const beat = () => {
      void fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pageRef.current }),
      }).catch(() => null);
    };

    beat();
    const timer = window.setInterval(beat, 3 * 60 * 1000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("popstate", updatePage);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  return null;
}
