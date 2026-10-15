// Sally over SMS + voice. Keyword router -> the same deterministic demos the web UI uses.
// Money rules live in policy.md / RPOLICY; the router never invents amounts.
import type { Express, Request, Response, NextFunction } from "express";
import twilio from "twilio";
import { memory } from "./memory.js";

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
  const tag = (id: string, sid: string, channel: string, from: string, text: string) => {
    const r = memory.get(id); if (!r) return;
    r.channel = channel; r.audit.push({ at: new Date().toISOString(), event: "twilio_trigger", channel, sid, from: mask(from), text }); memory.save(r);
  };
  const mask = (n: string) => (n && n.length > 4 ? "…" + n.slice(-4) : n || "unknown");

  // Returns a one-line reply: what happened + link + why.
  async function route(text: string, sid: string, channel: string, from: string): Promise<string> {
    const t = text.trim();
    const yes = t.match(/^yes\s+(\S+)/i);
    if (yes) {
      const r = memory.get(yes[1]);
      if (!r) return `Sally: I can't find ${yes[1]}.`;
      if (r.status !== "awaiting_human") return `Sally: ${r.id} is ${r.status}, nothing to approve.`;
      const v = await call(`/r/${r.id}/approve`);
      tag(r.id, sid, channel, from, t);
      return `Sally: approved and paid. ${r.id} total £${v.total.toFixed(2)}. Receipt: ${v.url}`;
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
    if (/restock/i.test(t)) {
      const v = await call("/demo/restock");
      tag(v.id, sid, channel, from, t);
      const held = v.decisions.filter((d: any) => d.status === "needs_approval");
      const heldGBP = held.reduce((s: number, d: any) => s + d.price, 0);
      return `Sally: paid £${v.stripe.auto.amount.toFixed(2)} within R1-R4. ${held.length} item(s) £${heldGBP.toFixed(2)} over £25 wait for you (R2). Reply YES ${v.id} to pay. ${v.url}`;
    }
    if (/invoice/i.test(t)) {
      const v = await call("/demo/invoice", { mismatch: /mismatch|wrong|extra/i.test(t) ? 1 : 0 });
      tag(v.id, sid, channel, from, t);
      if (v.status === "paid") return `Sally: paid Bidfood £${v.total.toFixed(2)}, matches PO-1042 (I1-I3). Invoice: ${v.stripe.invoice.hostedUrl}`;
      return `Sally: invoice £${v.total.toFixed(2)} doesn't match PO-1042 (I2). Reply YES ${v.id} to pay anyway. ${v.url}`;
    }
    return "Sally here! Text: 'table for 6 Saturday 8pm', 'restock', or 'invoice'.";
  }

  async function send(to: string, body: string) {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_PHONE_NUMBER: from } = process.env;
    if (!sid || !tok || !from || !to) return null;
    const m = await twilio(sid, tok).messages.create({ to, from, body });
    return m.sid;
  }

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
