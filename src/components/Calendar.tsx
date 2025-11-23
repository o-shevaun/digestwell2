"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

export default function Calendar({ dates }: { dates: string[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  const view = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const y = view.getFullYear();
  const m = view.getMonth();

  const planSet = useMemo(() => new Set(dates), [dates]);

  const days = [];
  const firstDay = new Date(y, m, 1).getDay();
  const lastDate = new Date(y, m + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= lastDate; d++) days.push(new Date(y, m, d));

  function ymd(date: Date) { return date.toISOString().slice(0,10); }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <button className="px-2 py-1 border rounded" onClick={()=>setMonthOffset(o=>o-1)}>Prev</button>
        <div className="font-semibold">{view.toLocaleString("default",{ month:"long"})} {y}</div>
        <button className="px-2 py-1 border rounded" onClick={()=>setMonthOffset(o=>o+1)}>Next</button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
          <div key={d} className="text-xs text-gray-500">{d}</div>
        ))}
        {days.map((d,i)=>(
          <div key={i} className="aspect-square border rounded flex items-center justify-center">
            {d ? (
              planSet.has(ymd(d))
                ? <Link href={`/mealplans/${ymd(d)}`} className="text-primary font-medium">{d.getDate()}</Link>
                : <span className="text-gray-400">{d.getDate()}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
