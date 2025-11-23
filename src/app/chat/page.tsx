"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi! Ask nutrition questions or say “generate plan” to get started.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const q = input.trim();
    if (!q || sending) return;

    setError(null);
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setSending(true);

    try {
      const r = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        const msg =
          j?.error ||
          j?.reply ||
          "Sorry, I couldn’t get a response. Please try again.";
        setMessages((m) => [...m, { role: "assistant", text: String(msg) }]);
        setSending(false);
        return;
      }

      // IMPORTANT: do NOT inject any default “guideline” here
      const reply = j?.reply ? String(j.reply) : "No reply.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e: any) {
      setError(e?.message || "Network error");
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Network error. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-md p-3 ${
              m.role === "user" ? "bg-amber-50" : "bg-gray-100"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 border rounded-md px-3 py-2"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          className="border rounded-md px-4 py-2"
          disabled={sending}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
