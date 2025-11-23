import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import MealPlan from "@/models/MealPlan";
import { dbConnect } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  await dbConnect();
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "30");

  const items = await MealPlan.find({ userId: (user as any).id }).sort({ date: -1 }).skip((page-1)*limit).limit(limit);
  return NextResponse.json({ items });
}
