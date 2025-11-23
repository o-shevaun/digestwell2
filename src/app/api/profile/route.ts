import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import UserProfile from "@/models/UserProfile";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const profile = await UserProfile.findOne({
      userId: (session.user as any).id,
    }).lean();

    return NextResponse.json({ profile: profile || null });
  } catch (err) {
    console.error("Error in GET /api/profile:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();

    const digestiveDisorders: string[] = Array.isArray(body.digestiveDisorders)
      ? body.digestiveDisorders.map((d: any) => String(d))
      : [];

    const dislikedFoods: string[] = Array.isArray(body.dislikedFoods)
      ? body.dislikedFoods.map((x: any) => String(x))
      : [];

    const allergies: string[] = Array.isArray(body.allergies)
      ? body.allergies.map((x: any) => String(x))
      : [];

    const userId = (session.user as any).id;

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        digestiveDisorders,
        dislikedFoods,
        allergies,
      },
      {
        upsert: true,
        new: true,
      }
    ).lean();

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Error in POST /api/profile:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
