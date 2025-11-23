import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { z } from "zod";
import { Types } from "mongoose";
import { cleanEmail } from "@/lib/normalize";

const schema = z.object({ email: z.string().email() });

type UserLean = {
  _id: Types.ObjectId;
  email: string;
  name?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    const normalized = cleanEmail(email);

    await dbConnect();

    // Use case-insensitive collation just in case older docs are not lowercased
    const user = await User.findOne({ email: normalized })
      .collation({ locale: "en", strength: 2 })
      .select({ _id: 1, email: 1, name: 1 })
      .lean<UserLean | null>();

    if (!user) return NextResponse.json({ found: false });

    return NextResponse.json({
      found: true,
      id: user._id.toString(),
      email: user.email,
      name: user.name ?? "",
    });
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json(
        { error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
