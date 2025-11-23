import { NextRequest, NextResponse } from "next/server";

/**
 * This route talks ONLY to OpenAI (ChatGPT).
 * No calls to your FastAPI backend.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Model + API settings
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const TIMEOUT_MS = 20000;

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set on the server." },
        { status: 500 }
      );
    }

    const { message } = await req.json().catch(() => ({ message: "" }));
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Ask ChatGPT
    const r = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.6,
        max_tokens: 450,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful, concise assistant. Answer the user's question directly with practical, specific guidance. If a list helps, keep it short.",
          },
          { role: "user", content: message },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error(`[chat] OpenAI error ${r.status}: ${txt}`);
      return NextResponse.json(
        { error: "Could not reach ChatGPT at the moment." },
        { status: 502 }
      );
    }

    const data = await r.json().catch(() => ({}));
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error("[chat] OpenAI returned no content:", data);
      return NextResponse.json(
        { error: "ChatGPT returned no content." },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("[chat] route failed:", e?.message || e);
    return NextResponse.json(
      { error: "Unexpected error talking to ChatGPT." },
      { status: 500 }
    );
  }
}
