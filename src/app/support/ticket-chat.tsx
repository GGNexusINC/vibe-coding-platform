"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { playSendSound, playReceiveSound, unlockAudio } from "@/lib/sounds";

interface Message {
  id: string;
  author_id: string;
  author_username: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

interface TicketChatProps {
  ticketId: string;
  channelId: string;
  userId?: string;
  onClose?: () => void;
}

export function TicketChat({ ticketId, channelId, userId, onClose }: TicketChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const isFirst = useRef(true);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/ticket/${ticketId}/messages?channelId=${channelId}`);
      const data = await res.json();
      if (data.ok) {
        const msgs: Message[] = data.messages || [];
        if (!isFirst.current) {
          const newOnes = msgs.filter(m => !knownIds.current.has(m.id));
          if (newOnes.length > 0) {
            const hasIncoming = newOnes.some(m => m.author_id !== userId);
            if (hasIncoming) playReceiveSound();
          }
        }
        msgs.forEach(m => knownIds.current.add(m.id));
        isFirst.current = false;
        setMessages(msgs);
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    } finally {
      setLoading(false);
    }
  }, [ticketId, channelId, userId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/ticket/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage, channelId }),
      });
      const data = await res.json();
      if (data.ok) {
        playSendSound();
        setNewMessage("");
        fetchMessages();
      } else {
        setError(data.error || "Failed to send");
      }
    } catch {
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!confirm("Close this ticket? The channel will be deleted.")) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/support/ticket/${ticketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (res.ok) { setClosed(true); onClose?.(); }
      else setError("Failed to close ticket");
    } catch {
      setError("Failed to close ticket");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-8 flex items-center gap-3 text-cyan-400">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-sm tracking-widest uppercase">Initializing secure channel...</span>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-950/20 p-8 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-rose-300 font-semibold">Ticket Closed</p>
        <p className="text-sm text-slate-500 mt-1">Channel has been deleted from Discord.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.08)]">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-500/15 bg-cyan-950/20">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Live Staff Channel</span>
          <span className="text-[10px] text-slate-600 font-mono">#{ticketId.slice(-6)}</span>
        </div>
        <button
          onClick={closeTicket}
          disabled={closing}
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40 transition"
        >
          {closing ? (
            <span className="animate-pulse">Closing...</span>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close Ticket
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="h-72 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600">
            <svg className="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs tracking-widest uppercase">Channel open — send your first message</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.author_id === userId;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                {msg.author_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://cdn.discordapp.com/avatars/${msg.author_id}/${msg.author_avatar}.png?size=64`}
                    alt="" className="h-7 w-7 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/10" />
                ) : (
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ring-1 ${isMine ? "bg-cyan-500/20 text-cyan-300 ring-cyan-500/30" : "bg-violet-500/20 text-violet-300 ring-violet-500/30"}`}>
                    {msg.author_username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                {/* Bubble */}
                <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                    <span className={`text-[10px] font-semibold ${isMine ? "text-cyan-400" : "text-violet-400"}`}>
                      {isMine ? "You" : msg.author_username}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className={`rounded-xl px-3.5 py-2 text-sm leading-relaxed ${
                    isMine
                      ? "bg-cyan-500/15 border border-cyan-500/20 text-cyan-50 rounded-tr-sm"
                      : "bg-slate-800/80 border border-white/8 text-slate-200 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/6 bg-slate-950/60 px-4 py-3">
        {error && <div className="text-rose-400 text-xs mb-2 font-mono">{error}</div>}
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={unlockAudio}
            placeholder="Type a message..."
            maxLength={1000}
            className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/15 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-30 transition"
          >
            {sending ? (
              <span className="animate-pulse">···</span>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </>
            )}
          </button>
        </form>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-700 font-mono">
          <span className="h-1 w-1 rounded-full bg-emerald-500/50" />
          Syncing with Discord every 5s
        </div>
      </div>
    </div>
  );
}
