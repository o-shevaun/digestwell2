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
    // await params (Next 15 requirement)
    const { date } = await params;

    const redirect =
      new URL(req.url).searchParams.get("redirect") === "1";

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const userId = (session.user as any).id;
    const plan: any = await MealPlan.findOne({ userId, date });

    if (!plan) {
      if (redirect) {
        return NextResponse.redirect(
          new URL(`/mealplans?err=no-plan`, req.url),
          303
        );
      }
      return NextResponse.json(
        { error: "No plan for date" },
        { status: 404 }
      );
    }

    // Support both HTML form and JSON body
    const contentType = req.headers.get("content-type") || "";
    let mealTypeRaw = "";

    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => ({}))) as any;
      mealTypeRaw = String(body.mealType ?? body.meal_type ?? "");
    } else {
      const form = await req.formData();
      mealTypeRaw = String(
        form.get("mealType") ?? form.get("meal_type") ?? ""
      );
    }

    const mealType = mealTypeRaw.toLowerCase();

    if (!["breakfast", "lunch", "dinner", "supper"].includes(mealType)) {
      if (redirect) {
        return NextResponse.redirect(
          new URL(`/mealplans/${date}?err=bad-mealType`, req.url),
          303
        );
      }
      return NextResponse.json(
        { error: "Invalid mealType" },
        { status: 400 }
      );
    }

    // Normalize to "breakfast" | "lunch" | "dinner"
    const normalizedMealType =
      mealType === "breakfast"
        ? "breakfast"
        : mealType === "lunch"
        ? "lunch"
        : "dinner";

    // Get current meal label for that slot
    let currentMeal: any = null;
    if (normalizedMealType === "breakfast") {
      currentMeal = plan.meals?.breakfast ?? null;
    } else if (normalizedMealType === "lunch") {
      currentMeal = plan.meals?.lunch ?? null;
    } else {
      currentMeal = plan.meals?.dinner ?? null;
    }

    const currentLabel: string | null =
      currentMeal?.label ? String(currentMeal.label) : null;

    const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    // Ask Python backend for a new meal, excluding the current label
    const r = await fetch(`${backend}/model/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: (session!.user as any).id,
    meal_type: mealType,
    exclude_label: currentLabel,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("Backend /model/swap failed:", r.status, text);

      if (redirect) {
        return NextResponse.redirect(
          new URL(`/mealplans/${date}?err=swap`, req.url),
          303
        );
      }

      return NextResponse.json(
        { error: "Swap failed" },
        { status: 502 }
      );
    }

    const data = await r.json(); // { meal, diag }
    const newMeal = data.meal;

    if (!newMeal) {
      if (redirect) {
        return NextResponse.redirect(
          new URL(`/mealplans/${date}?err=no-meal`, req.url),
          303
        );
      }
      return NextResponse.json(
        { error: "No swap result" },
        { status: 500 }
      );
    }

    // 🔎 Log the interaction BEFORE updating the plan
    await MealInteraction.create({
      userId,
      date,
      mealType: normalizedMealType,
      action: "swap",
      previousMeal: currentMeal
        ? {
            id: currentMeal.id,
            label: currentMeal.label,
            image: currentMeal.image,
            sourceUrl: currentMeal.sourceUrl,
          }
        : undefined,
      newMeal: {
        id: newMeal.id,
        label: newMeal.label,
        image: newMeal.image,
        sourceUrl: newMeal.sourceUrl,
      },
    });

    // Update the plan with the new meal in the correct slot
    if (normalizedMealType === "breakfast") {
      plan.meals.breakfast = newMeal;
    } else if (normalizedMealType === "lunch") {
      plan.meals.lunch = newMeal;
    } else {
      plan.meals.dinner = newMeal;
    }

    await plan.save();

    if (redirect) {
      return NextResponse.redirect(
        new URL(`/mealplans/${date}?ok=swap`, req.url),
        303
      );
    }

    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    console.error("Error in /api/mealplans/[date]/swap:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
