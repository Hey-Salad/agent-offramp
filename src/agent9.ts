// A deterministic chat workspace for nine real Stripe test-mode workflows.
// The UI only receives selected fields read back from Stripe, never whole card/token objects.
import type { Express } from "express";
import { stripeX, stripeI, issueCard, testAuthorization, payVenue, subscribe, sptPay } from "./stripe-extra.js";
import { stripeWriteRequired } from "./toolkit.js";
import { readFileSync } from "node:fs";

export const AGENT9_COMMANDS = [
  "restock", "create a checkout for the kitchen order", "table for 6 Saturday 8pm",
  "prepare an invoice for Agent Nine Demo 120 for catering", "try eighty pounds at Ocado on the card",
  "pay the venue sixty pounds", "start a Sally Plus subscription",
  "pay nine pounds sixty with a shared payment token",
  "use Agent Toolkit to prepare an invoice for Agent Nine Tools 75 for services",
];
export function commandIndex(text: unknown) {
  return typeof text === "string" ? AGENT9_COMMANDS.findIndex(c => c.toLowerCase() === text.trim().toLowerCase()) : -1;
}
export function requireTestObject(o: any) {
  if (!o?.id || o.livemode !== false) throw new Error("Verified Stripe test object required");
  return o;
}
const fields = (o: any, names: string[]) => Object.fromEntries(names.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
export function mountAgent9(app: Express, port: number) {
  app.get("/agent9", (_q, r) => r.type("html").send(readFileSync("public/agent9.html", "utf8")));
  app.get("/agent9-logo.svg", (_q, r) => r.type("svg").send(readFileSync("public/heysalad-logo-black.svg")));
  app.post("/api/agent9/chat", async (q, res) => {
    const n = commandIndex(q.body?.text);
    if (n < 0) return res.status(400).json({ error: "Choose a supported request" });
    if (!stripeX) return res.status(503).json({ error: "Stripe test key required" });
    const call = async (path: string, body = {}) => {
      const r = await fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Financial action failed");
      return await r.json() as any;
    };
    const verify = async (id: string, path: string, client = stripeX, account?: string) => requireTestObject(await client!.rawRequest("GET", `/v1/${path}/${id}`, {}, account ? { stripeAccount: account } as any : undefined));
    try {
      let o: any, proof: any, reply = "", audit: any;
      if (n === 0) {
        const r = await call("/demo/restock");
        o = await verify(r.stripe.auto.paymentIntent, "payment_intents");
        proof = fields(o, ["id", "status", "amount", "currency", "livemode"]);
        reply = "Sally paid your supplier within your rules.";
      } else if (n === 1) {
        const s = await stripeX.checkout.sessions.create({ mode: "payment", line_items: [{ price_data: { currency: "gbp", unit_amount: 3250, product_data: { name: "Kitchen order (test)" } }, quantity: 1 }], success_url: `http://localhost:${port}/agent9`, cancel_url: `http://localhost:${port}/agent9` });
        o = await verify(s.id, "checkout/sessions");
        proof = fields(o, ["id", "status", "payment_status", "amount_total", "currency", "livemode"]);
        reply = "Sally prepared a secure checkout. Payment is pending.";
      } else if (n === 2) {
        const r = await call("/demo/booking", { text: AGENT9_COMMANDS[n] });
        o = await verify(r.stripe.paymentLink.id, "payment_links");
        proof = fields(o, ["id", "active", "currency", "livemode"]);
        reply = "Sally prepared a deposit link for six guests.";
      } else if (n === 3 || n === 8) {
        if (n === 3) {
          const r = await call("/demo/outinvoice", { customer: "Agent Nine Demo", amount: 120, desc: "Catering" });
          o = await verify(r.stripe.draft.id, "invoices");
        } else {
          const c = await stripeX.customers.create({ name: "Agent Nine Tools", email: "agent9-tools@example.com", metadata: { app: "agent9-demo" } });
          const draft = await stripeWriteRequired("PostInvoices", { customer: c.id, currency: "gbp", auto_advance: false, collection_method: "send_invoice", days_until_due: 30 });
          await stripeWriteRequired("PostInvoiceitems", { customer: c.id, invoice: draft.id, amount: 7500, currency: "gbp", description: "Services" });
          o = await verify(draft.id, "invoices");
          audit = { via: "agent-toolkit", operations: ["PostInvoices", "PostInvoiceitems"] };
        }
        proof = fields(o, ["id", "status", "total", "currency", "livemode"]);
        reply = "Sally prepared your draft invoice. No email sent.";
      } else if (n === 4) {
        const c: any = await issueCard();
        if (!c.ok) throw new Error("Real Stripe Issuing card required");
        const a: any = await testAuthorization(80);
        if (!a.ok || a.simulated || !a.authorization) throw new Error("Real Stripe authorization required");
        o = await verify(a.authorization, "issuing/authorizations", stripeI, c.account);
        if (o.approved !== false) throw new Error("Overspend was not declined");
        proof = fields(o, ["id", "status", "approved", "amount", "currency", "livemode"]);
        proof.decline_reason = o.request_history?.[0]?.reason;
        reply = "Sally's £80 purchase was declined by the card.";
      } else if (n === 5) {
        const r: any = await payVenue(60);
        if (!r.ok) throw new Error("Connect payment unavailable");
        o = requireTestObject(await stripeX.paymentIntents.retrieve(r.paymentIntent, { expand: ["latest_charge"] }));
        const ch = o.latest_charge as any;
        // Newer Stripe versions omit Charge.transfer. Match the real transfer's
        // source_transaction instead of guessing from a destination charge.
        const destination = String(o.transfer_data?.destination || "");
        let transfer: any;
        for (let attempt = 0; attempt < 10; attempt++) {
          const transfers = await stripeX.transfers.list({ destination, limit: 100 });
          transfer = transfers.data.find(t => t.source_transaction === ch?.id);
          if (transfer) break;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (!transfer) throw new Error("Verified Connect transfer required");
        requireTestObject(transfer);
        proof = { ...fields(o, ["id", "status", "amount", "currency", "livemode"]), destination, transfer: transfer.id, transfer_amount: transfer.amount, transfer_currency: transfer.currency, application_fee_amount: o.application_fee_amount };
        if (!proof.transfer) throw new Error("Verified Connect transfer required");
        reply = "Sally paid the venue and recorded your platform fee.";
      } else if (n === 6) {
        const r: any = await subscribe("agent9-demo@example.com");
        if (!r.ok) throw new Error("Subscription unavailable");
        o = requireTestObject(await stripeX.subscriptions.retrieve(r.subscription));
        proof = { ...fields(o, ["id", "status", "livemode"]), price: o.items.data[0].price.id, interval: o.items.data[0].price.recurring?.interval, latest_invoice: o.latest_invoice };
        reply = "Sally started your customer's monthly subscription.";
      } else {
        const r: any = await sptPay(9.6);
        if (!r.ok || !r.token) throw new Error("Shared payment token unavailable");
        o = await verify(r.paymentIntent, "payment_intents");
        proof = { ...fields(o, ["id", "status", "amount", "currency", "livemode"]), token_id: r.token, token_limit_gbp: r.limit };
        reply = "Sally paid with a scoped token, without card details.";
      }
      const expected = ["succeeded", "open", undefined, "draft", "closed", "succeeded", "active", "succeeded", "draft"][n];
      if ((expected && proof.status !== expected) || (n === 2 && proof.active !== true)) throw new Error("Unexpected Stripe state");
      res.json({ reply, proof, audit });
    } catch {
      // Deliberately exclude upstream messages, URLs, keys and token payloads.
      res.status(502).json({ error: "This Stripe test action could not be verified. No proof is available." });
    }
  });
}
