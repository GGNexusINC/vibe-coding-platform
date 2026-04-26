"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function GlobalBackgroundVideo() {
  const pathname = usePathname();
  const [styles, setStyles] = useState({
    objectPosition: "center",
    scale: "1",
    opacity: "0.15"
  });

  useEffect(() => {
    // Map paths to specific video framing to keep it "fresh" across pages
    let pos = "center";
    let scale = "1.05"; // Slight zoom to allow for positioning freedom
    let op = "0.15";

    if (pathname === "/") {
      pos = "center";
      scale = "1";
    } else if (pathname.startsWith("/store")) {
      pos = "90% 10%";
      scale = "1.2";
    } else if (pathname.startsWith("/rules")) {
      pos = "10% 10%";
      scale = "1.2";
    } else if (pathname.startsWith("/lottery")) {
      pos = "10% 90%";
      scale = "1.2";
    } else if (pathname.startsWith("/support")) {
      pos = "90% 90%";
      scale = "1.2";
    } else if (pathname.startsWith("/dashboard")) {
      pos = "30% 40%";
      scale = "1.15";
      op = "0.12"; // Slightly dimmer for dashboard focus
    } else if (pathname.startsWith("/admin")) {
      pos = "70% 60%";
      scale = "1.15";
      op = "0.12";
    } else if (pathname.startsWith("/community")) {
      pos = "50% 85%";
      scale = "1.1";
    } else if (pathname.startsWith("/about")) {
      pos = "50% 15%";
      scale = "1.1";
    } else if (pathname.startsWith("/bot")) {
      pos = "center";
      scale = "1.3";
      op = "0.1"; // Very subtle for bot pages
    } else {
      pos = "center";
      scale = "1.1";
    }

    setStyles({ objectPosition: pos, scale, opacity: op });
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0d06]">
      <video
        src="/AZ2Xd1Tx6lhyVmCtVBpXGQ-AZ2Xd1TxHNndMCl7LDOOBg.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="/raidzone-bg.png"
        style={{ 
          objectPosition: styles.objectPosition,
          transform: `scale(${styles.scale})`,
          opacity: styles.opacity
        }}
        className="h-full w-full object-cover transition-all duration-[2000ms] ease-in-out md:block hidden"
        onError={(e) => {
          (e.currentTarget as HTMLVideoElement).style.display = "none";
        }}
      />
      
      {/* Visual Overlays to tie everything together */}
      <div className="absolute inset-0 rz-bg opacity-[0.06] rz-drift mix-blend-overlay" />
      <div className="absolute inset-0 rz-grid opacity-[0.12]" />
      
      {/* Global Vignette and Depth Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,13,6,0.4)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d06]/60 via-transparent to-[#0a0d06]/90" />
      
      {/* Subtle Glow Orbs that drift based on position (CSS only for perf) */}
      <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-orange-500/10 blur-[120px] animate-pulse" />
      <div className="absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-lime-500/5 blur-[120px] animate-pulse [animation-delay:2s]" />
    </div>
  );
}
