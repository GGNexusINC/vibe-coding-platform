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
  const knownIds = useRef<Set<string>>(new Set());
  const isFirst = useRef(true);

  // Fetch messages with sound notifications
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/ticket/${ticketId}/messages?channelId=${channelId}`);
      const data = await res.json();
      if (data.ok) {
        const msgs: Message[] = data.messages || [];
        // Play sound for new incoming messages (not on first load)
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

  // Poll for new messages every 5 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError(null);
    unlockAudio(); // Ensure audio is unlocked on send

    try {
      const res = await fetch(`/api/support/ticket/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage, channelId }),
      });

      const data = await res.json();
      if (data.ok) {
        setNewMessage("");
        playSendSound(); // Play send sound
        fetchMessages(); // Refresh messages
      } else {
        setError(data.error || "Failed to send");
      }
    } catch (e) {
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Close ticket
  const closeTicket = async () => {
    if (!confirm("Close this ticket? The channel will be deleted.")) return;
    
    setClosing(true);
    try {
      const res = await fetch(`/api/support/ticket/${ticketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      
      if (res.ok) {
        setClosed(true);
        onClose?.();
      } else {
        setError("Failed to close ticket");
      }
    } catch (e) {
      setError("Failed to close ticket");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading chat...</div>;
  }

  if (closed) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 mt-4">
        <div className="text-center text-gray-400 py-8">
          <p className="text-lg mb-2">🔒 Ticket Closed</p>
          <p className="text-sm">This ticket has been closed and the Discord channel deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live Chat with Staff
        </h3>
        <button
          onClick={closeTicket}
          disabled={closing}
          className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white text-sm px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1"
        >
          {closing ? (
            "Closing..."
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close Ticket
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.author_id === userId ? "flex-row-reverse" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {msg.author_username?.[0]?.toUpperCase() || "?"}
              </div>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  msg.author_id === userId
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs opacity-75">{msg.author_username}</span>
                  <span className="text-xs opacity-50">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>{msg.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
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
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>

      {error && (
        <div className="text-red-400 text-sm mt-2">{error}</div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        Messages sync with Discord every 5 seconds
      </div>
    </div>
  );
}
