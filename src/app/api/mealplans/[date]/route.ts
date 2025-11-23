// frontend/src/app/api/mealplans/[date]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import MealPlan from "@/models/MealPlan";

// (optional) keep this dynamic so Next doesn't cache responses
export const dynamic = "force-dynamic";

/**
 * GET /api/mealplans/[date]?userId=...
 * Returns a consistent shape:
 * {
 *   plan: {
 *     date: string,
 *     meals: { breakfast?: any; lunch?: any; dinner?: any } | undefined,
 *     lockedAt: string | null
 *   }
 * }
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ date: string }> } // <- params can be a Promise: await it
) {
  try {
    const { date } = await ctx.params; // <- FIX: await the params
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const doc = await MealPlan.findOne({ userId, date }).lean<{
      date: string;
      meals?: { breakfast?: any; lunch?: any; dinner?: any };
      lockedAt?: Date | null;
    } | null>();

    return NextResponse.json({
      plan: doc
        ? {
          date: doc.date,
          meals: doc.meals ?? undefined,
          lockedAt: doc.lockedAt ?? null,
        }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
