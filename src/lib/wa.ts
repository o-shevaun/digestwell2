// src/lib/wa.ts
import fetch from "node-fetch";

const BASE = "https://graph.facebook.com/v20.0";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/** Send plain text */
export async function sendWhatsAppText(to: string, body: string) {
  const url = `${BASE}/${must("WHATSAPP_PHONE_NUMBER_ID")}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${must("WHATSAPP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "text",
      text: { body, preview_url: false },
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    console.error("[WA SEND TEXT] failed", res.status, msg);
  }
}

/** Send a WhatsApp LIST (single-select menu; looks like radio buttons) */
export async function sendWhatsAppList(params: {
  to: string;
  header?: string;
  body: string;
  footer?: string;
  buttonLabel: string;
  // each item: { id, title, description? }
  items: Array<{ id: string; title: string; description?: string }>;
  sectionTitle?: string;
}) {
  const url = `${BASE}/${must("WHATSAPP_PHONE_NUMBER_ID")}/messages`;

  // WhatsApp requires sections; we use one section.
  const section = {
    title: params.sectionTitle ?? "Options",
    rows: params.items.map(it => ({
      id: it.id,
      title: it.title,
      description: it.description ?? "",
    })),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${must("WHATSAPP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to.replace(/^\+/, ""),
      type: "interactive",
      interactive: {
        type: "list",
        header: params.header ? { type: "text", text: params.header } : undefined,
        body: { text: params.body },
        footer: params.footer ? { text: params.footer } : undefined,
        action: {
          button: params.buttonLabel,
          sections: [section],
        },
      },
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    console.error("[WA SEND LIST] failed", res.status, msg);
  }
}

/** Mark a message as read (nice UX) */
export async function waMarkRead(waMsgId: string) {
  const url = `${BASE}/${must("WHATSAPP_PHONE_NUMBER_ID")}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${must("WHATSAPP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: waMsgId,
    }),
  }).catch(() => {});
}
