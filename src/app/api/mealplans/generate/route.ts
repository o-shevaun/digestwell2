// src/app/api/mealplans/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import MealPlan from "@/models/MealPlan";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session?.user as any)?.id;

  // Body sent from the frontend (caloriesTarget is optional)
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const caloriesTarget = Number(body.caloriesTarget ?? 2100);

  const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
  

  // 🔹 Call FastAPI /model/generate with user_id + calories_target
  const resp = await fetch(`${backend}/model/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      calories_target: caloriesTarget,
      user_id: userId,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Backend /model/generate failed:", resp.status, text);
    return NextResponse.json(
      { error: "Model generation failed" },
      { status: 502 }
    );
  }

  const data = await resp.json();
  const plan = data.plan ?? {};
  const meals = plan.meals ?? {};

  await dbConnect();

  // yyyy-mm-dd for "today"
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // 🔹 Save/update MealPlan document with the real meals
  const doc = await MealPlan.findOneAndUpdate(
    { userId, date: todayStr },
    {
      userId,
      date: todayStr,
      caloriesTarget: plan.calories_target ?? caloriesTarget,
      meals: {
        breakfast: meals.breakfast ?? null,
        lunch: meals.lunch ?? null,
        dinner: meals.dinner ?? null,
      },
      lockedAt: null,
    },
    { new: true, upsert: true }
  );

  // If called with ?redirect=1, send the browser to the detail page
  const redirect = req.nextUrl.searchParams.get("redirect");
  if (redirect === "1") {
    return NextResponse.redirect(
      new URL(`/mealplans/${todayStr}`, req.nextUrl),
      303
    );
  }

  // Otherwise just return JSON
  return NextResponse.json({ ok: true, plan: doc });
}
