"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export default function SupportPage() {
  const supportStaff = ["Kilo", "Buzzworthy", "Zeus", "Hope", "Encriptado", "Jon", "Cortez"];
  const stars = [
    { top: "10%", left: "8%", delay: "0s" },
    { top: "16%", left: "28%", delay: "0.7s" },
    { top: "9%", left: "56%", delay: "1.2s" },
    { top: "20%", left: "86%", delay: "0.5s" },
    { top: "35%", left: "20%", delay: "1.4s" },
    { top: "48%", left: "48%", delay: "0.4s" },
    { top: "58%", left: "74%", delay: "1.1s" },
    { top: "72%", left: "14%", delay: "0.9s" },
    { top: "80%", left: "62%", delay: "1.7s" },
    { top: "86%", left: "90%", delay: "0.3s" },
  ];
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

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
    setStatus("Ticket submitted. Staff was notified on Discord.");
    setLoading(false);
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-black/65 to-violet-950/35" />
      <div className="rz-parallax-galaxy pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_82%_30%,rgba(168,85,247,0.17),transparent_40%),radial-gradient(circle_at_56%_82%,rgba(217,70,239,0.14),transparent_38%)]" />
      <div className="rz-starfield pointer-events-none">
        {stars.map((star, idx) => (
          <span
            key={`support-star-${idx}`}
            className="rz-star"
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-20" />
      <h1 className="text-2xl font-bold text-white">Support</h1>
      <p className="mt-2 text-zinc-300">
        Send your issue directly to staff through Discord support alerts.
      </p>
      <div className="rz-lux-panel mt-4 rounded-2xl p-4">
        <div className="text-xs uppercase tracking-wider text-cyan-200">Support Team</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {supportStaff.map((name) => (
            <span
              key={name}
              className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-white"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <form
        className="rz-lux-panel mt-8 rounded-2xl p-5"
        onSubmit={submitTicket}
      >
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-white">Subject</span>
            <input
              className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600"
              placeholder="Payment issue / UID link / Pack delivery..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-white">Message</span>
            <textarea
              className="min-h-28 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
              placeholder="Tell us what happened. Include any order info."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
            />
          </label>

          <button
            className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Submitting..." : "Submit Ticket"}
          </button>
          {status ? <div className="text-sm text-zinc-200">{status}</div> : null}
        </div>
      </form>
    </div>
  );
}

