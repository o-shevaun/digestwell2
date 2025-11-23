import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import MealPlan from "@/models/MealPlan";
import DashboardCards from "@/components/DashboardCards";
import Guard from "@/components/Guard";
import Link from "next/link";

function todayYMD(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  let stats = { plans: 0, accepted: 0 };
  if (session?.user) {
    await dbConnect();
    const plans = await MealPlan.countDocuments({ userId: (session.user as any).id });
    const accepted = await MealPlan.countDocuments({ userId: (session.user as any).id, accepted: true });
    stats = { plans, accepted };
  }

  const date = todayYMD();

  return (
    <Guard>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">
          Welcome{session?.user ? `, ${(session.user as any).name || ""}` : ""}
        </h1>
        <p className="text-gray-600">
          Generate daily breakfast, lunch, and dinner plans. Swap individual meals, accept/reject, and view a clean
          calendar history. Plans older than 24 hours become read-only.
        </p>

        {/* This form posts to the API with ?redirect=1, and the API will 303 to /mealplans/[date] */}
        <form action={`/api/mealplans/generate?redirect=1`} method="post" className="flex items-center gap-3">
          <input type="hidden" name="date" value={date} />
          <button className="px-4 py-2 rounded-lg bg-primary text-white">Generate Today’s Plan</button>
          <span className="text-sm text-gray-500">Creates or updates {date} and opens it.</span>
        </form>

        <DashboardCards stats={stats} />

        <div className="flex gap-3">
          <Link href="/mealplans" className="px-3 py-2 rounded border">
            Open Calendar
          </Link>
          <Link href="/chat" className="px-3 py-2 rounded border">
            Chat with Model
          </Link>
        </div>
      </div>
    </Guard>
  );
}
