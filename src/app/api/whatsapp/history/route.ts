import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";

export async function GET() {
  const user = await requireAuth();
  const backend = process.env.BACKEND_URL!;
  const r = await fetch(`${backend}/whatsapp/history/${(user as any).id}`);
  const data = await r.json();
  return NextResponse.json(data);
}
