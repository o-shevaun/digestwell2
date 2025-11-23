"use client";

import { useState } from "react";

type Msg = { role: "system"|"user"|"assistant"; content: string };

export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "system", content: "Hi! Ask nutrition questions or say “generate plan” to get started." }
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setMessages(m => [...m, { role: "user", content: text }]);
    setInput("");
    setPending(true);
    try {
      const r = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await r.json();
      const reply = data?.reply ?? "Sorry, I didn’t catch that.";
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Network error." }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-white p-3">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {messages.map((m,i)=>(
            <div key={i}
              className={
                m.role==="user" ? "bg-orange-50 text-gray-900 p-3 rounded-xl self-end" :
                m.role==="assistant" ? "bg-gray-100 p-3 rounded-xl" :
                "bg-gray-50 text-gray-600 p-3 rounded-xl"
              }>
              {m.content}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") send(); }}
          className="flex-1 border rounded-lg px-3 py-2 bg-neutral-900 text-white"
          placeholder="Ask about meals, swaps, etc."
        />
        <button
          onClick={send}
          disabled={pending}
          className="px-3 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Tip: Type <b>“generate plan”</b> to create today’s plan. Use the Calendar to open any date. Plans older than 24h are read-only.
      </p>
    </div>
  );
}
