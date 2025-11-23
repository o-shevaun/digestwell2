import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import MealPlan from "@/models/MealPlan";
import Calendar from "@/components/Calendar";

export default async function Plans() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return <div>Please login.</div>;
  await dbConnect();
  const plans = await MealPlan.find({ userId: (session.user as any).id }, { date: 1 }).sort({ date: 1 });
  const dates = plans.map((p: any) => p.date);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Your Meal Plans Calendar</h1>
      <Calendar dates={dates} />
    </div>
  );
}
