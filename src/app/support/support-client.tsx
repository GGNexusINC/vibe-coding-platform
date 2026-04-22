"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { TicketChat } from "./ticket-chat";
import { TeamFlairBoard } from "@/app/_components/team-flair-board";

const GUILD_ID = "1419522458075005023";
const WIDGET_URL = `https://discord.com/api/guilds/${GUILD_ID}/widget.json`;

type WidgetMember = {
  id: string;
  username: string;
  status: string;
};

type Widget = {
  members: WidgetMember[];
};

export default function SupportClient() {
  const supportStaff = ["Kilo", "Buzzworthy", "Zeus", "Hope", "Encriptado", "Jon", "Cortez"];
  const modStaff = ["BÛTTÊR", "reda", "Rem", "♠Zenon♠", "Whiispperss"];
  const [onlineStaff, setOnlineStaff] = useState<Set<string>>(new Set());
  const [loadingStaff, setLoadingStaff] = useState(true);

  const searchParams = useSearchParams();
  const [subject, setSubject] = useState(searchParams.get("subject") ?? "");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<{id: string, channelId: string} | null>(null);

  // Fetch real Discord online status
  useEffect(() => {
    async function loadStaffStatus() {
      try {
        const res = await fetch(WIDGET_URL);
        if (!res.ok) { setLoadingStaff(false); return; }
        const data: Widget = await res.json();
        const online = new Set<string>();
        data.members?.forEach((m) => {
          // Check if member username matches any staff (case insensitive)
          const staffMatch = supportStaff.find(
            (s) => s.toLowerCase() === m.username.toLowerCase()
          );
          if (staffMatch) online.add(staffMatch);
        });
        setOnlineStaff(online);
      } catch {
        // Silently fail - widget might be disabled
      } finally {
        setLoadingStaff(false);
      }
    }
    loadStaffStatus();
    // Refresh every 30 seconds
    const interval = setInterval(loadStaffStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function submitTicket(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const res = await fetch("/api/support/ticket", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.error ?? "Could not submit ticket.");
      setLoading(false);
      return;
    }

    setSubject("");
    setMessage("");
    setStatus(data?.message || "Ticket submitted!");
    
    // Show chat if ticket was created with channel
    if (data?.ticketId && data?.channelId) {
      setActiveTicket({ id: data.ticketId, channelId: data.channelId });
    }
    setLoading(false);
  }


  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-black/80 to-violet-950/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(34,211,238,0.15),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(168,85,247,0.12),transparent_50%)]" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="rz-chip mb-4">Help Center</div>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Support
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
          Need help? Submit a ticket and chat live with our staff directly from this page.
        </p>
      </div>

      {/* Response time strip */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Typical response: <strong>under 2 hours</strong>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-slate-400">
          🕐 Staff active: <strong className="text-slate-300">daily 10am – midnight ET</strong>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-slate-400">
          💬 Replies sync to <strong className="text-slate-300">Discord in real time</strong>
        </div>
      </div>

      {/* 🆕 Live Chat Announcement Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 via-violet-950/40 to-cyan-950/60 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.12),transparent_70%)]" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-cyan-500/30">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-semibold text-white">Live Chat is Now Available!</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                New
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Submit a ticket and instantly open a <span className="text-cyan-400 font-medium">live chat</span> with our staff — messages sync directly with our Discord in real time.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500">
            <svg className="h-4 w-4 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Powered by GG Nexus
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Left Column - Info Cards */}
        <div className="space-y-4">

          {/* Live Chat Feature Card */}
          <div className="rz-surface rz-panel-border rounded-[1.5rem] p-5 border-cyan-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Live Chat Support</div>
                <div className="text-xs text-cyan-400/80">Real-time with Discord</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              After submitting your ticket, a private Discord channel is created instantly. Chat back and forth with staff — all messages sync in real time between the website and Discord.
            </p>
          </div>

          {/* Response Time Card */}
          <div className="rz-surface rz-panel-border rounded-[1.5rem] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Fast Response</div>
                <div className="text-xs text-slate-400">Typically under 4 hours</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Staff are actively monitoring tickets on Discord 24/7. Live chat makes it even faster.
            </p>
          </div>

          {/* Common Issues Card */}
          <div className="rz-surface rz-panel-border rounded-[1.5rem] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-white">Common Issues</div>
            </div>
            <ul className="space-y-2">
              {[
                "Package not delivered after purchase",
                "Wrong UID linked to account",
                "VIP role not assigned",
                "Technical issues with the website",
              ].map((issue) => (
                <li key={issue} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="mt-1 h-1 w-1 rounded-full bg-slate-500 shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>

          {/* Staff Team Card */}
          <TeamFlairBoard variant="support" onlineNames={[...onlineStaff]} />
        </div>

        {/* Right Column - Ticket Form */}
        <div className="rz-surface rz-panel-border rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#a855f7)]">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Submit a Ticket</h2>
              <p className="text-xs text-slate-400">A live chat will open after submission</p>
            </div>
          </div>

          {/* How it works mini steps */}
          {!activeTicket && (
            <div className="flex items-center gap-2 mb-6 mt-4 rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
              {[
                { step: "1", label: "Submit ticket" },
                { step: "2", label: "Channel created" },
                { step: "3", label: "Chat live" },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">{item.step}</span>
                    <span className="text-[11px] text-slate-400">{item.label}</span>
                  </div>
                  {i < 2 && <span className="text-slate-600 text-xs">→</span>}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submitTicket} className="space-y-5">
            {/* Subject Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Package not delivered, Wrong UID linked..."
                maxLength={100}
                required
                className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              <div className="text-[10px] text-slate-600 text-right">{subject.length}/100</div>
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail. Include your in-game UID, Discord username, and any relevant order information."
                maxLength={2000}
                required
                rows={5}
                className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              <div className="text-[10px] text-slate-600 text-right">{message.length}/2000</div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating your ticket...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit & Open Live Chat
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            {/* Status Message */}
            {status && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                status.includes("submitted") || status.includes("created") || status.includes("channel")
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}>
                <div className="flex items-center gap-2">
                  {(status.includes("submitted") || status.includes("created") || status.includes("channel")) ? (
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {status}
                </div>
              </div>
            )}
          </form>

          {/* Live Chat - shown after ticket is created (outside form) */}
          {activeTicket && (
            <TicketChat 
              ticketId={activeTicket.id} 
              channelId={activeTicket.channelId}
            />
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-500">
          For urgent issues, you can also reach us directly on{" "}
          <a href="https://discord.gg/5Fcw9XSEeZ" className="text-cyan-400 hover:text-cyan-300 underline">
            Discord
          </a>
        </p>
      </div>
    </div>
  );
}
