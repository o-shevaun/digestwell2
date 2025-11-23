import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import MealPlan from "@/models/MealPlan";
import MealInteraction from "@/models/MealInteraction";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const userId = (session.user as any).id;
    const plan: any = await MealPlan.findOne({ userId, date });

    if (!plan) {
      return NextResponse.redirect(
        new URL(`/mealplans?err=no-plan`, req.url),
        303
      );
    }

    // Log reject for each meal in the plan
    const interactionsToCreate: any[] = [];
    const slots: ("breakfast" | "lunch" | "dinner")[] = [
      "breakfast",
      "lunch",
      "dinner",
    ];

    for (const slot of slots) {
      const meal = plan.meals?.[slot];
      if (!meal) continue;

      interactionsToCreate.push({
        userId,
        date,
        mealType: slot,
        action: "reject",
        previousMeal: {
          id: meal.id,
          label: meal.label,
          image: meal.image,
          sourceUrl: meal.sourceUrl,
        },
      });
    }

    if (interactionsToCreate.length > 0) {
      await MealInteraction.insertMany(interactionsToCreate);
    }

    // Remove the plan after rejection
    await plan.deleteOne();

    return NextResponse.redirect(
      new URL(`/mealplans/${date}?ok=reject`, req.url),
      303
    );
  } catch (err) {
    console.error("Error in /api/mealplans/[date]/reject:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
