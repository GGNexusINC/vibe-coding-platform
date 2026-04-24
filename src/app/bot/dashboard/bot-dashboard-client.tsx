"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BotSection } from "@/app/_components/bot-control/bot-section";

type Guild = {
  id: string;
  name: string;
  icon: string | null;
};

type User = {
  discord_id: string;
  username?: string;
  avatar_url?: string | null;
  avatar?: string | null;
};

import { TutorialOverlay } from "@/app/_components/bot-control/tutorial-overlay";

export function BotDashboardClient({ user }: { user: User }) {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check if tutorial has been seen
    const seen = localStorage.getItem(`tutorial_seen_${user.discord_id}`);
    if (!seen) {
      setShowTutorial(true);
    }

    let alive = true;
    fetch("/api/bot/guilds", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        if (data?.ok) {
          setGuilds(data.guilds ?? []);
          setError("");
        } else {
          setError(data?.error || "Could not load managed Discord servers.");
        }
      })
      .catch(() => {
        if (alive) setError("Could not reach the bot dashboard API.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [user.discord_id]);

  const tutorialSteps = [
    {
      title: "Welcome to VoxBridge",
      content: "This is your advanced control center. From here, you can manage translation, AI, and logging for all your Discord servers.",
    },
    {
      targetId: "guild-selector",
      title: "Switch Servers",
      content: "Use this dropdown to switch between the Discord servers you manage. Settings will sync in real-time.",
    },
    {
      targetId: "status-pills",
      title: "Real-time Metrics",
      content: "Monitor your bot's health, active voice connections, and uptime at a glance.",
    },
    {
      targetId: "navigation-tabs",
      title: "Advanced Config",
      content: "Navigate through specialized modules for Voice Translation, AI Personas, and Professional Staff Logs.",
    },
    {
      targetId: "save-button",
      title: "Deploy Changes",
      content: "Once you're happy with your configuration, hit Save to push the updates to your Discord server instantly.",
    },
  ];

  const finishTutorial = () => {
    localStorage.setItem(`tutorial_seen_${user.discord_id}`, "true");
    setShowTutorial(false);
  };

  return (
    <main className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      {/* Hyper-futuristic background elements */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[-10%] h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {showTutorial && <TutorialOverlay steps={tutorialSteps} onComplete={finishTutorial} />}

      <section className="mb-8 overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">
               <span className="relative flex h-2 w-2">
                 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                 <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
               </span>
               Management Console
            </div>
            <h1 className="mt-6 text-4xl font-black leading-none tracking-tight text-white sm:text-6xl lg:text-7xl">
              VoxBridge <br />
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Intelligence</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 font-medium">
              Configure translation, voice AI, and premium modules across all your managed Discord servers with real-time sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 px-6 py-4 shadow-xl backdrop-blur-md">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Operator</div>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <div className="text-sm font-black text-white">{user.username || user.discord_id}</div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex h-16 items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/5 px-8 font-black text-white transition-all hover:bg-white/10"
            >
              Back to Apps
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
          <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">
            Syncing managed clusters...
          </div>
        </div>
      ) : (
        <div className="relative">
          {error ? (
            <div className="mb-8 rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm font-bold text-rose-200 backdrop-blur-md">
              <span className="mr-2 text-rose-500">⚠</span> {error}
            </div>
          ) : null}
          <BotSection guilds={guilds} />
        </div>
      )}
    </main>
  );
}
