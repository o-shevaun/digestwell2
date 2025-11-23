// frontend/src/app/api/wa/webhook/route.ts
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { sendWhatsAppList, sendWhatsAppText, waMarkRead } from "@/lib/wa";
import { getRedis, redisDel, redisGetJSON, redisSetJSON } from "@/lib/redis";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { cleanEmail } from "@/lib/normalize";

/** Your Next.js base (used to call /api/mealplans/*) */
const APP_URL = process.env.APP_BASE_URL || "http://localhost:3000";
/** Optional: FastAPI chat model for free text */
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";
/** WhatsApp verify */
const WA_VERIFY_TOKEN =
  process.env.WA_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || "";

/** 30 minutes session */
const SESSION_TTL = 60 * 30;

/** Session */
type Step = "menu" | "need-email" | "need-password";
type Session = {
  phone: string;
  userId?: string;
  email?: string;
  step: Step;
  pendingAction?:
    | { kind: "plan" }
    | { kind: "accept" }
    | { kind: "reject" }
    | { kind: "swap"; mealType: "breakfast" | "lunch" | "dinner" }
    | { kind: "show" };
};

const HELLO_TEXT =
  "Hi! 👋 I’m your NutriSuite assistant.\n\n" +
  "• *Generate plan* – create today’s meal plan\n" +
  "• *Accept/Reject* – confirm or discard today’s plan\n" +
  "• *Swap* – replace breakfast, lunch, or dinner\n" +
  "• *Show today* – see today’s plan\n\n" +
  "Tap *Options* to choose, or just ask any nutrition question.";

/* ---------------- DB helpers ---------------- */

async function findUserIdByEmail(emailRaw: string): Promise<string | null> {
  const email = cleanEmail(emailRaw);
  await dbConnect();
  const u = await User.findOne({ email })
    .collation({ locale: "en", strength: 2 })
    .select({ _id: 1 })
    .lean<{ _id: any } | null>();
  return u ? String(u._id) : null;
}

async function findUserByPhone(
  phone: string
): Promise<{ _id: any; email?: string } | null> {
  await dbConnect();
  const u = await User.findOne({ phone })
    .select({ _id: 1, email: 1 })
    .lean<{ _id: any; email?: string } | null>();
  return u;
}

async function linkPhoneToUser(userId: string, phone: string) {
  await dbConnect();
  await User.updateOne({ _id: userId }, { $set: { phone } });
}

async function createUserInstant({
  emailRaw,
  password,
  phone,
}: {
  emailRaw: string;
  password: string;
  phone: string;
}): Promise<{ userId: string; email: string }> {
  const email = cleanEmail(emailRaw);
  await dbConnect();

  const existing = await User.findOne({ email })
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId } | null>();

  if (existing?._id) {
    const idStr = existing._id.toString();
    await linkPhoneToUser(idStr, phone);
    return { userId: idStr, email };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await User.create({
    email,
    name: "",
    role: "User",
    passwordHash,
    phone,
  });

  return { userId: String(created._id), email };
}

/* ---------------- Verify (GET) ---------------- */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WA_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/* ---------------- Utilities (plan normalizer & fmt) ---------------- */

function normalizePlanPayload(raw: any): {
  date?: string;
  meals?: { breakfast?: any; lunch?: any; dinner?: any };
  lockedAt?: string | Date | null;
} {
  if (!raw) return {};
  const inner = raw.plan ?? raw.data ?? raw;

  // { date, meals, lockedAt }
  if (inner?.meals) {
    return { date: inner.date, meals: inner.meals, lockedAt: inner.lockedAt ?? null };
  }

  // { breakfast, lunch, dinner }
  if (inner?.breakfast || inner?.lunch || inner?.dinner) {
    return {
      date: inner.date,
      lockedAt: inner.lockedAt ?? null,
      meals: {
        breakfast: inner.breakfast,
        lunch: inner.lunch,
        dinner: inner.dinner,
      },
    };
  }

  // { plan: { date, meals } } or { plan: { breakfast, ... } }
  if (inner?.plan?.meals) {
    return {
      date: inner.plan?.date,
      meals: inner.plan.meals,
      lockedAt: inner.plan?.lockedAt ?? null,
    };
  }
  if (inner?.plan?.breakfast || inner?.plan?.lunch || inner?.plan?.dinner) {
    return {
      date: inner.plan?.date,
      lockedAt: inner.plan?.lockedAt ?? null,
      meals: {
        breakfast: inner.plan?.breakfast,
        lunch: inner.plan?.lunch,
        dinner: inner.plan?.dinner,
      },
    };
  }

  return {};
}

function fmtMeal(name: string, m: any): string {
  if (!m) return `• ${name}: —`;
  const label = m.label ?? m.name ?? "—";
  const kcal =
    m.calories ??
    m.kcal ??
    (typeof m.nutrition?.calories === "number" ? m.nutrition.calories : undefined);
  const itemsArr: string[] =
    Array.isArray(m.items) && m.items.length
      ? m.items
      : Array.isArray(m.ingredients) && m.ingredients.length
      ? m.ingredients
      : [];
  const items =
    itemsArr.length > 0
      ? `\n   · ${itemsArr.slice(0, 6).join("\n   · ")}`
      : "";
  const energy = typeof kcal === "number" ? ` (${Math.round(kcal)} kcal)` : "";
  return `• ${name}: ${label}${energy}${items}`;
}

function summarizePlan(date: string, meals?: { breakfast?: any; lunch?: any; dinner?: any }) {
  const B = meals?.breakfast;
  const L = meals?.lunch;
  const D = meals?.dinner;
  return (
    `*Today (${date})*\n` +
    `${fmtMeal("Breakfast", B)}\n` +
    `${fmtMeal("Lunch", L)}\n` +
    `${fmtMeal("Dinner", D)}`
  );
}

/* ---------------- Helpers to call your Next.js APIs ---------------- */

async function fetchPlan(userId: string, date: string) {
  const res = await fetch(
    `${APP_URL}/api/mealplans/${date}?userId=${encodeURIComponent(userId)}`
  ).catch(() => null);
  if (!res?.ok) return null;
  const raw = await res.json().catch(() => null as any);
  return normalizePlanPayload(raw);
}

async function ensurePlan(userId: string, date: string, caloriesTarget = 2100) {
  const existing = await fetchPlan(userId, date);
  if (existing?.meals?.breakfast || existing?.meals?.lunch || existing?.meals?.dinner) {
    return existing;
  }
  // Generate then read
  await fetch(`${APP_URL}/api/mealplans/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, caloriesTarget }),
  }).catch(() => null);
  return await fetchPlan(userId, date);
}

/* ---------------- Webhook (POST) ---------------- */

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const change = body?.entry?.[0]?.changes?.[0]?.value;

  if (change?.statuses?.length) return new NextResponse("EVENT_RECEIVED", { status: 200 });

  const message = change?.messages?.[0];
  const fromPhone: string | undefined = message?.from;
  const messageId: string | undefined = message?.id;

  const freeText: string | undefined =
    message?.text?.body ??
    message?.button?.text ??
    message?.interactive?.list_reply?.title ??
    message?.interactive?.button_reply?.title;

  const listReplyId: string | undefined = message?.interactive?.list_reply?.id;

  if (!fromPhone || !messageId)
    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  // idempotency
  try {
    const r = getRedis();
    const key = `wa:seen:${messageId}`;
    if (await r.get(key)) return new NextResponse("EVENT_RECEIVED", { status: 200 });
    await r.set(key, "1", "EX", 300);
  } catch {}
  waMarkRead(messageId).catch(() => {});

  // session
  const sKey = `wa:session:${fromPhone}`;
  let s =
    (await redisGetJSON<Session>(sKey)) ??
    ({ phone: fromPhone, step: "menu" } as Session);
  const persist = async () => redisSetJSON(sKey, s, SESSION_TTL);

  /* ---- hello ---- */
  if ((freeText || "").trim().toLowerCase() === "hello") {
    if (s.userId) {
      await sendWhatsAppText(fromPhone, HELLO_TEXT);
      await sendMainMenu(fromPhone);
      await persist();
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }
    const byPhone = await findUserByPhone(fromPhone);
    if (byPhone) {
      s.userId = String(byPhone._id);
      s.email = byPhone.email ? cleanEmail(byPhone.email) : undefined;
      s.step = "menu";
      await persist();
      await sendWhatsAppText(fromPhone, HELLO_TEXT);
      await sendMainMenu(fromPhone);
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }
    s.step = "need-email";
    s.email = undefined;
    await persist();
    await sendWhatsAppText(fromPhone, "Welcome! Please type your *email address* to continue.");
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  /* ---- list selections ---- */
  if (listReplyId) {
    if (listReplyId === "plan") s.pendingAction = { kind: "plan" };
    if (listReplyId === "accept") s.pendingAction = { kind: "accept" };
    if (listReplyId === "reject") s.pendingAction = { kind: "reject" };
    if (listReplyId === "swap-breakfast") s.pendingAction = { kind: "swap", mealType: "breakfast" };
    if (listReplyId === "swap-lunch") s.pendingAction = { kind: "swap", mealType: "lunch" };
    if (listReplyId === "swap-dinner") s.pendingAction = { kind: "swap", mealType: "dinner" };
    if (listReplyId === "show-today") s.pendingAction = { kind: "show" };

    if (!s.userId) {
      s.step = "need-email";
      await persist();
      await sendWhatsAppText(fromPhone, "Please type your *email address* to continue.");
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    await persist();
    await handleAction(s, fromPhone);
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  /* ---- login steps ---- */
  if (s.step === "need-email") {
    const raw = (freeText || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      await sendWhatsAppText(fromPhone, "❗ Please send a valid *email* (e.g., name@example.com).");
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }
    const normalized = cleanEmail(raw);
    s.email = normalized;

    const userId = await findUserIdByEmail(normalized);
    if (userId) {
      await linkPhoneToUser(userId, s.phone);
      s.userId = userId;
      s.step = "menu";
      await persist();
      await sendWhatsAppText(fromPhone, "✅ Email confirmed. You’re all set!");
      if (s.pendingAction) await handleAction(s, fromPhone);
      else await sendMainMenu(fromPhone);
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    s.step = "need-password";
    await persist();
    await sendWhatsAppText(fromPhone, "No account found. Please enter a *password* to create your account.");
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  if (s.step === "need-password") {
    const pwd = (freeText || "").trim();
    if (pwd.length < 6) {
      await sendWhatsAppText(fromPhone, "❗ Password should be at least 6 characters. Try again.");
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }
    try {
      const { userId, email } = await createUserInstant({
        emailRaw: s.email!,
        password: pwd,
        phone: s.phone,
      });
      s.userId = userId;
      s.email = email;
      s.step = "menu";
      await sendWhatsAppText(fromPhone, "🎉 Account created! You’re signed in.");
      await persist();
      if (s.pendingAction) await handleAction(s, fromPhone);
      else await sendMainMenu(fromPhone);
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    } catch {
      await sendWhatsAppText(fromPhone, "⚠️ I couldn't create your account. Please try again.");
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }
  }

  /* ---- normal chat ---- */
  if (s.userId) {
    if (freeText && !freeText.trim().startsWith("/")) {
      await forwardToModelAndReply(freeText, fromPhone);
      await sendMainMenu(fromPhone);
      await persist();
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }
    await sendMainMenu(fromPhone);
    await persist();
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  await sendWhatsAppText(fromPhone, "Type *hello* to get started.");
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

/* ---------------- UI helpers ---------------- */

async function sendMainMenu(to: string) {
  await sendWhatsAppList({
    to,
    body: "Choose one option:",
    buttonLabel: "Options",
    sectionTitle: "NutriSuite",
    items: [
      { id: "plan", title: "Generate plan", description: "Create today’s meal plan" },
      { id: "accept", title: "Accept plan", description: "Lock today’s plan" },
      { id: "reject", title: "Reject plan", description: "Remove today’s plan" },
      { id: "swap-breakfast", title: "Swap breakfast", description: "Replace breakfast" },
      { id: "swap-lunch", title: "Swap lunch", description: "Replace lunch" },
      { id: "swap-dinner", title: "Swap dinner", description: "Replace dinner" },
      { id: "show-today", title: "Show today", description: "View today’s plan" },
    ],
  });
}

async function forwardToModelAndReply(text: string, to: string) {
  const res = await fetch(`${BACKEND_URL}/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text }),
  }).catch(() => null);

  if (res?.ok) {
    const j = (await res.json().catch(() => null)) as any;
    const reply = j?.reply || j?.text || "Sorry, I couldn’t form a reply right now.";
    await sendWhatsAppText(to, reply);
  } else {
    await sendWhatsAppText(to, "I couldn’t reach the nutrition model right now. Please try again in a moment.");
  }
}

/* ---------------- Actions: now they always end by showing the current plan ---------------- */

async function handleAction(s: Session, to: string) {
  if (!s.userId || !s.pendingAction) {
    await sendWhatsAppText(to, "No action selected. Tap Options to choose.");
    await sendMainMenu(to);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  switch (s.pendingAction.kind) {
    case "plan": {
      await ensurePlan(s.userId, today, 2100);
      const plan = await fetchPlan(s.userId, today);
      if (!plan?.meals) {
        await sendWhatsAppText(to, "⚠️ Couldn’t generate a plan.");
      } else {
        await sendWhatsAppText(to, "✅ Generated today’s plan.\n\n" + summarizePlan(plan.date ?? today, plan.meals));
      }
      break;
    }

    case "accept": {
      await fetch(`${APP_URL}/api/mealplans/${today}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: s.userId }),
      }).catch(() => null);
      const plan = await fetchPlan(s.userId, today);
      await sendWhatsAppText(
        to,
        plan?.meals
          ? "✅ Plan accepted and locked.\n\n" + summarizePlan(plan.date ?? today, plan.meals)
          : "⚠️ Couldn’t accept the plan."
      );
      break;
    }

    case "reject": {
      await fetch(`${APP_URL}/api/mealplans/${today}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: s.userId, caloriesTarget: 2100 }),
      }).catch(() => null);
      const plan = await fetchPlan(s.userId, today);
      await sendWhatsAppText(
        to,
        plan?.meals
          ? "🗑️ Replaced with a new plan.\n\n" + summarizePlan(plan.date ?? today, plan.meals)
          : "⚠️ Couldn’t replace the plan."
      );
      break;
    }

    case "swap": {
      // NEW: auto-generate if missing first
      const base = await ensurePlan(s.userId, today, 2100);
      if (!base?.meals) {
        await sendWhatsAppText(to, "⚠️ I couldn’t create a plan to swap.");
        break;
      }

      const mealType = s.pendingAction.mealType!;
      const res = await fetch(`${APP_URL}/api/mealplans/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: s.userId, date: today, mealType }),
      }).catch(() => null);

      // Show updated plan regardless of swap result to give the user context
      const plan = await fetchPlan(s.userId, today);

      if (res?.ok && plan?.meals) {
        await sendWhatsAppText(
          to,
          `🔁 Swapped *${mealType}* for today.\n\n` + summarizePlan(plan.date ?? today, plan.meals)
        );
      } else {
        await sendWhatsAppText(
          to,
          "⚠️ Couldn’t swap that meal." + (plan?.meals ? `\n\n${summarizePlan(plan.date ?? today, plan.meals)}` : "")
        );
      }
      break;
    }

    case "show": {
      const plan = await fetchPlan(s.userId, today);
      if (!plan?.meals) {
        await sendWhatsAppText(to, "⚠️ No plan found for today. Use *Generate plan* to create one.");
      } else {
        await sendWhatsAppText(to, summarizePlan(plan.date ?? today, plan.meals));
      }
      break;
    }
  }

  // keep session; clear the pending action only
  s.pendingAction = undefined;
  await redisSetJSON(`wa:session:${s.phone}`, s, SESSION_TTL).catch(() => {});
  await sendMainMenu(to);
}
