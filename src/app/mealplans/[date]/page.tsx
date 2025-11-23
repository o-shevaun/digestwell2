import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import MealPlan from "@/models/MealPlan";
import MealCard from "@/components/MealCard";
import { isLocked } from "@/lib/permissions";
import SwapForm from "@/components/SwapForm";

export default async function Detail({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  // Next 15 async params
  const { date } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return <div className="p-4">Please login.</div>;
  }

  await dbConnect();

  const plan: any = await MealPlan.findOne({
    userId: (session.user as any).id,
    date,
  });

  if (!plan) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Meal Plan — {date}</h1>
        <div className="p-5 rounded-2xl border bg-white">
          No plan for this date. Go back and generate one from the Home page.
        </div>
      </div>
    );
  }

  const locked = isLocked(plan.lockedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meal Plan — {date}</h1>
          <p className="text-gray-600">
            Plans lock after 24 hours. While unlocked, you can swap a meal,
            accept the plan, or reject to remove it.
          </p>
        </div>

        {!locked ? (
          <div className="flex flex-wrap gap-2">
            <form action={`/api/mealplans/${date}/accept`} method="post">
              <button className="px-3 py-2 rounded-lg border">Accept</button>
            </form>
            <form action={`/api/mealplans/${date}/reject`} method="post">
              <button className="px-3 py-2 rounded-lg border">
                Reject (Remove)
              </button>
            </form>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Locked — 24 hours passed.</div>
        )}
      </div>

      {/* Breakfast → Lunch → Supper cards */}
      <div className="space-y-4">
        <MealCard slotLabel="Breakfast" meal={plan.meals.breakfast} />
        <MealCard slotLabel="Lunch" meal={plan.meals.lunch} />
        <MealCard slotLabel="Supper" meal={plan.meals.dinner} />
      </div>

      {/* Client-side swap form */}
      {!locked && <SwapForm date={date} locked={locked} />}
    </div>
  );
}
