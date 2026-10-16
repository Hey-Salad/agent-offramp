// Sally over SMS + voice. Keyword router -> the same deterministic demos the web UI uses.
// Money rules live in policy.md / RPOLICY; the router never invents amounts.
import type { Express, Request, Response, NextFunction } from "express";
import twilio from "twilio";
import { memory } from "./memory.js";
import {AsyncLocalStorage} from "node:async_hooks";
import {cardCommand,runCardChat} from "./chat-card.js";

const xml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
const ALLERGENS = /allerg|nut|peanut|gluten|coeliac|celiac|dairy|lactose|shellfish|sesame|vegan|egg/i;

export function mountTwilio(app: Express, BASE: string, PORT: number) {
  const local = `http://127.0.0.1:${PORT}`;

  // Signature check when TWILIO_AUTH_TOKEN is set; skipped for local testing.
  const verify = (req: Request, res: Response, next: NextFunction) => {
    const tok = process.env.TWILIO_AUTH_TOKEN;
    if (!tok) return next();
    const url = (process.env.PUBLIC_URL || BASE) + req.originalUrl;
    const ok = twilio.validateRequest(tok, String(req.headers["x-twilio-signature"] || ""), url, req.body || {});
    ok ? next() : res.status(403).send("bad signature");
  };

  async function call(path: string, body: any = {}) {
    const r = await fetch(local + path, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${path} -> ${r.status}`);
    return r.json() as Promise<any>;
  }
  const requestState = new AsyncLocalStorage<{lastId:string}>();
  let aiUsed = 0;
  const tag = (id: string, sid: string, channel: string, from: string, text: string) => {
    const request=requestState.getStore();if(request)request.lastId=id;
    const r = memory.get(id); if (!r) return;
    r.channel = channel; r.audit.push({ at: new Date().toISOString(), event: "twilio_trigger", channel, sid, from: mask(from), text }); memory.save(r);
  };
  const mask = (n: string) => (n && n.length > 4 ? "…" + n.slice(-4) : n || "unknown");

  // Returns a one-line reply: what happened + link + why.
  async function route(text: string, sid: string, channel: string, from: string): Promise<string> {
    const t = text.trim();
    const card=cardCommand(t);
    if(card){
      if('unsupported' in card)return "Sally: try 'spend £12 at Ocado', 'spend £80 at Ocado', or 'spend £10 at an off-licence'. These are test card examples.";
      const result=await runCardChat(card,t,channel);tag(result.record.id,sid,channel,from,t);return 'Sally: '+result.reply;
    }
    const yes = t.match(/^yes\s+(\S+)/i);
    if (yes) {
      const r = memory.get(yes[1]);
      if (!r) return `Sally: I can't find ${yes[1]}.`;
      if (r.status !== "awaiting_human") return `Sally: ${r.id} is ${r.status}, nothing to approve.`;
      const v = await call(`/r/${r.id}/approve`);
      tag(r.id, sid, channel, from, t);
      if (r.demo === "outinvoice") return `Sally: approved and sent invoice £${r.total.toFixed(2)} (test mode). ${v.stripe.sent.hostedUrl}`;
      return `Sally: approved and paid. ${r.id} total £${v.total.toFixed(2)}. Receipt: ${v.url}`;
    }
    const prep = t.match(/(?:prepare|create|draft|make|raise)\b.*?invoice\s+(?:for|to)\s+(.+?)\s+(?:£\s*)?(\d+(?:\.\d{1,2})?)\s*(?:pounds|gbp|quid)?(?:\s+for\s+(.+))?$/i);
    if (prep) {
      const v = await call("/demo/outinvoice", { customer: prep[1].replace(/[,.]$/, ""), amount: Number(prep[2]), desc: prep[3] || "Catering" });
      tag(v.id, sid, channel, from, t);
      return `Sally: draft invoice ${prep[1]} £${v.total.toFixed(2)} ready (I4${v.total > 500 ? ": over £500, needs your approval to send" : ""}). Say "send the invoice" to send.`;
    }
    if (/send\b.*invoice/i.test(t)) {
      const d = memory.all().find((r: any) => r.demo === "outinvoice" && r.status === "draft");
      if (!d) return "Sally: there's no draft invoice. Say 'prepare an invoice for Acme 120 for catering'.";
      const v = await call(`/r/${d.id}/send`);
      tag(v.id, sid, channel, from, t);
      if (v.status === "awaiting_human") return `Sally: invoice £${v.total.toFixed(2)} is over £500 (I4). Reply YES ${v.id} to send.`;
      return `Sally: sent invoice £${v.total.toFixed(2)} to ${d.outInvoice.customer} (test mode). ${v.stripe.sent.hostedUrl}`;
    }
    if (/(email|send)\b.*(shopping|restock)\s*list/i.test(t)) {
      const v = await call("/demo/shoplist");
      tag(v.id, sid, channel, from, t);
      return `Sally: shopping list drafted as an email, ${v.decisions.length} items £${v.total.toFixed(2)}. Draft only, not sent.`;
    }
    if (/table|book/i.test(t)) {
      if (ALLERGENS.test(t)) {
        return "Sally: thanks! You mentioned an allergy, so a member of staff will confirm your booking personally. (Allergen requests always go to a human.)";
      }
      const v = await call("/demo/booking", { text: t });
      tag(v.id, sid, channel, from, t);
      if (v.status === "confirmed") return `Sally: booked, no deposit needed (H1: under 6 guests). ${v.url}`;
      return `Sally: deposit £${v.total.toFixed(2)} (H1: £10/head for 6+). Pay: ${v.stripe.paymentLink.url}`;
    }
    if (/waitrose|grocer|shop window|autonomous|weekly shop|\bshop for\b|^shop$/i.test(t)) {
      const v = await call("/demo/shop");
      tag(v.id, sid, channel, from, t);
      const held = v.decisions.filter((d: any) => d.status === "needs_approval");
      const heldGBP = held.reduce((s: number, d: any) => s + d.price, 0);
      return `Sally: picked ${v.decisions.length} Waitrose items. Paid £${v.total.toFixed(2)} within S1 (auto-pay up to £25).` + (held.length ? ` ${held.length} item(s) £${heldGBP.toFixed(2)} wait for you (R2). Reply YES ${v.id} to pay.` : "") + ` ${v.url}`;
    }
    if (/restock|do the shop|shopping/i.test(t)) {
      const v = await call("/demo/restock");
      tag(v.id, sid, channel, from, t);
      const held = v.decisions.filter((d: any) => d.status === "needs_approval");
      const heldGBP = held.reduce((s: number, d: any) => s + d.price, 0);
      return `Sally: paid £${v.stripe.auto.amount.toFixed(2)} within R1-R4. ${held.length} item(s) £${heldGBP.toFixed(2)} over £25 wait for you (R2). Reply YES ${v.id} to pay. ${v.url}`;
    }
    if (/invoice/i.test(t) && !/prepare|create|draft|send/i.test(t)) {
      const v = await call("/demo/invoice", { mismatch: /mismatch|wrong|extra/i.test(t) ? 1 : 0 });
      tag(v.id, sid, channel, from, t);
      if (v.status === "paid") return `Sally: paid Bidfood £${v.total.toFixed(2)}, matches PO-1042 (I1-I3). Invoice: ${v.stripe.invoice.hostedUrl}`;
      return `Sally: invoice £${v.total.toFixed(2)} doesn't match PO-1042 (I2). Reply YES ${v.id} to pay anyway. ${v.url}`;
    }
    const ai = await aiIntent(t);
    if (ai && ai !== t) return route(ai, sid, channel, from);
    return "Sally here! Try: 'table for 6 Saturday 8pm', 'restock', 'pay the invoice', 'prepare an invoice for Acme 120 for catering', 'send the invoice', or 'email me the shopping list'.";
  }
  // Optional: if OPENAI_API_KEY is set, rewrite an unmatched phrase into one canonical command.
  // The model only picks the words; amounts and limits still come from policy + the router.
  async function aiIntent(t: string): Promise<string | null> {
    const key = process.env.OPENAI_API_KEY; if (!key || !t) return null;
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, signal: AbortSignal.timeout(6000),
        body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0, max_tokens: 40, messages: [{ role: "system", content: "Rewrite the user's request as exactly one of: 'restock' | 'waitrose shop' | 'pay the invoice' | 'table for N <day> <time>' | 'prepare an invoice for <customer> <amount> for <item>' | 'send the invoice' | 'email me the shopping list' | 'none'. Output only the command." }, { role: "user", content: t }] }) });
      const out = String((await r.json() as any).choices?.[0]?.message?.content || "").trim();
      aiUsed++; return out && out !== "none" ? out : null;
    } catch { return null; }
  }

  async function send(to: string, body: string) {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_PHONE_NUMBER: from } = process.env;
    if (!sid || !tok || !from || !to) return null;
    const m = await twilio(sid, tok).messages.create({ to, from, body });
    return m.sid;
  }

  // Web chat: same router as /sms, JSON in/out.
  app.post("/api/chat", (req,res)=>requestState.run({lastId:""},async()=>{
    const text = String(req.body?.text || "");
    let reply: string;
    try { reply = await route(text, "CHAT_" + Date.now(), "chat", "web"); }
    catch (e: any) { reply = "Sally: something went wrong, a human will follow up."; console.error(e.message); }
    const id=requestState.getStore()!.lastId;
    const r = id ? memory.get(id) : null;
    res.json({ reply: reply.replace(/^Sally:\s*/, ""), record: r ? { id: r.id, demo: r.demo, status: r.status, total: r.total, decisions: r.decisions, stripe: r.stripe, cardAttempt:r.cardAttempt, outInvoice: r.outInvoice, emailDraft: r.emailDraft, url: `/r/${r.id}` } : null });
  }));
  // OpenAI Realtime (WebRTC): mint a short-lived client secret. The key never leaves the server.
  // Tools only map speech to router commands; the browser calls /api/chat so policy runs here.
  const TOOLS = [
    ["shop", "Do the Waitrose grocery shop autonomously (shop window): pick best matches, auto-pay up to £25, hold the rest", {}],
    ["restock", "Restock the kitchen (do the shopping) within policy R1-R4", {}],
    ["book_table", "Book a table", { guests: { type: "integer" }, when: { type: "string" }, notes: { type: "string", description: "allergies etc" } }],
    ["pay_supplier_invoice", "Check and pay the Bidfood supplier invoice", {}],
    ["prepare_invoice", "Prepare a DRAFT invoice to a customer", { customer: { type: "string" }, amount_gbp: { type: "number" }, item: { type: "string" } }],
    ["send_invoice", "Send the latest draft invoice", {}],
    ["email_shopping_list_draft", "Draft (never send) an email of the shopping list", {}],
    ["approve", "Approve the item waiting for approval, only when the user explicitly says approve/yes", {}],
  ].map(([name, description, props]: any) => ({ type: "function", name, description, parameters: { type: "object", properties: props } }));
  app.post("/api/realtime/session", async (_req, res) => {
    const key = process.env.OPENAI_API_KEY; if (!key) return res.status(503).json({ error: "no realtime" });
    try {
      const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: 120 }, session: { type: "realtime", model: "gpt-realtime", audio: { output: { voice: "marin" } }, tools: TOOLS, tool_choice: "auto",
          instructions: "You are Sally, HeySalad's restaurant money agent. British English. Keep replies to one short sentence. Always use a tool for actions; never invent amounts, policy decides. After a tool returns, say its result briefly." } }) });
      const j: any = await r.json();
      if (!j.value) { console.error("realtime session failed", r.status); return res.status(502).json({ error: "session failed" }); }
      aiUsed++; res.json({ value: j.value, model: "gpt-realtime" });
    } catch (e: any) { res.status(502).json({ error: "session failed" }); }
  });
  app.get("/api/feed", (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const rs = memory.all().filter((r: any) => r.demo);
    const paidIn = (r: any) => (r.stripe?.auto?.amount || 0) + (r.stripe?.approved?.amount || 0) + (r.stripe?.invoice?.amount || 0) + (r.status === "paid" && r.demo === "booking" ? r.total : 0);
    const moved = rs.filter((r: any) => r.createdAt.startsWith(today)).reduce((s: number, r: any) => s + paidIn(r), 0);
    const why = (a: any) => (a.tools ? `${a.via === "agent-toolkit" ? "Stripe Agent Toolkit" : "Stripe SDK"}: ${a.tools.join(", ")}` : "") || a.note || a.reason || (a.clause ? `Policy ${a.clause}` : "") || (a.text ? `“${a.text}”` : "");
    const lines = rs.slice(0, 15).flatMap((r: any) => r.audit.map((a: any) => ({ id: r.id, demo: r.demo, at: a.at, event: a.event, channel: a.channel || r.channel || "web", amount: a.amount ?? a.autoPay ?? null, why: why(a) })))
      .sort((a: any, b: any) => b.at.localeCompare(a.at)).slice(0, 40);
    res.json({ moved: Math.round(moved * 100) / 100, lines, records: rs.slice(0, 15).map((r: any) => ({ id: r.id, demo: r.demo, status: r.status, total: r.total, channel: r.channel || "web", request: r.request, createdAt: r.createdAt })) });
  });

  app.post("/sms", verify, async (req, res) => {
    let reply: string;
    try { reply = await route(String(req.body.Body || ""), String(req.body.MessageSid || "SM_local"), "sms", String(req.body.From || "")); }
    catch (e: any) { reply = "Sally: something went wrong, a human will follow up."; console.error(e.message); }
    res.type("text/xml").send(`<Response><Message>${xml(reply)}</Message></Response>`);
  });

  app.post("/voice", verify, (_req, res) => {
    res.type("text/xml").send(`<Response><Gather input="speech" action="/voice/result" speechTimeout="auto"><Say voice="Polly.Amy">Hi, it's Sally from HeySalad. Say book a table for six on Saturday at 8, restock, or invoice.</Say></Gather><Say voice="Polly.Amy">Sorry, I didn't catch that. Bye!</Say></Response>`);
  });

  app.post("/voice/result", verify, async (req, res) => {
    const from = String(req.body.From || "");
    let reply: string;
    try { reply = await route(String(req.body.SpeechResult || ""), String(req.body.CallSid || "CA_local"), "voice", from); }
    catch (e: any) { reply = "Sally: something went wrong, a human will follow up."; console.error(e.message); }
    let sent: string | null = null;
    try { sent = await send(from, reply); } catch (e: any) { console.error("sms send failed", e.message); }
    const said = reply.replace(/(Pay:|Invoice:|Receipt:)?\s*https?:\S+/g, "").replace(/^Sally:\s*/, "");
    res.type("text/xml").send(`<Response><Say voice="Polly.Amy">${xml(said)} ${sent ? "I've texted you the link." : ""}</Say></Response>`);
  });
}
