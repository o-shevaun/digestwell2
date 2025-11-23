"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent, useTransition } from "react";

export default function SwapForm({ date, locked }: { date: string; locked: boolean }) {
  const router = useRouter();
  const [mealType, setMealType] = useState<"breakfast"|"lunch"|"dinner">("breakfast");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (locked) {
    return <div className="text-sm text-gray-500">Locked — 24 hours passed.</div>;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch(`/api/mealplans/${date}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ mealType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "Swap failed");
        return;
      }
      // Re-render the server page to show the updated meal
      startTransition(() => router.refresh());
      setMsg(data?.message ?? "Swapped!");
    } catch (err: any) {
      setMsg(err?.message ?? "Network error");
    }
  }

  return (
    <div className="p-5 rounded-2xl border bg-white">
      <form onSubmit={onSubmit} className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Swap:</label>
        <select
          value={mealType}
          onChange={e => setMealType(e.target.value as any)}
          className="border rounded px-2 py-2"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Supper</option>
        </select>
        <button
          disabled={pending}
          className="px-3 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
        >
          {pending ? "Swapping…" : "Swap Selected"}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </form>
      <p className="mt-2 text-xs text-gray-500">
        Swapping replaces the chosen meal with a new suggestion and moves the current meal into the alternatives list.
      </p>
    </div>
  );
}
