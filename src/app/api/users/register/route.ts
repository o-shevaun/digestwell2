import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { dbConnect } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    await dbConnect();
    const exists = await User.findOne({ email: parsed.email });
    if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await User.create({ name: parsed.name, email: parsed.email, passwordHash });
    return NextResponse.json({ id: user._id, email: user.email });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
