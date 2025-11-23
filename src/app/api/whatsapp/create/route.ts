import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const backend = process.env.BACKEND_URL!;
  const { date } = await req.json().catch(() => ({}));
  const r = await fetch(`${backend}/whatsapp/intent`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: (user as any).id, action: "CREATE_PLAN", date })
  });
  const data = await r.json();
  return NextResponse.json(data);
}
