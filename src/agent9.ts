// A deterministic chat workspace for nine real Stripe test-mode workflows.
// The UI only receives selected fields read back from Stripe, never whole card/token objects.
import type { Express } from "express";
import { stripeX, stripeI, issueCard, testAuthorization, payVenue, subscribe, sptPay } from "./stripe-extra.js";
import { stripeWrite, stripeWriteRequired } from "./toolkit.js";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { memory } from "./memory.js";

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
export const AGENT9_PRODUCTS = ["PaymentIntents","Checkout","Payment Links","Invoicing","Issuing","Connect","Billing","Shared payment tokens","Agent Toolkit"];
export async function runAgent9(n:number,port:number,options:{request?:string,clause?:string,channel?:string,origin?:string}={}) {
  if(!Number.isInteger(n)||n<0||n>8)throw new Error("Unsupported test example");
    if (!stripeX) throw new Error("Stripe test key required");
    const { request = AGENT9_COMMANDS[n], clause = "D1", channel = "chat", origin = `http://localhost:${port}` } = options;
    const at = () => new Date().toISOString();
    const run: any = { id: "or_" + crypto.randomBytes(5).toString("hex"), createdAt: at(), agent: "Sally", channel, demo: "agent9", request, decisions: [{ status: "approved", clause, reason: "Explicit, fixed test-demo request; no invoice email or live payment" }], total: 0, status: "running", stripe: {}, audit: [{ at: at(), event: "request_received", channel, text: request }, { at: at(), event: "policy_checked", clause, status: "approved" }] };
    memory.save(run);
    const call = async (path: string, body = {}) => {
      const r = await fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Financial action failed");
      return await r.json() as any;
    };
    const verify = async (id: string, path: string, client = stripeX, account?: string) => requireTestObject(await client!.rawRequest("GET", `/v1/${path}/${id}`, {}, account ? { stripeAccount: account } as any : undefined));
    try {
      let o: any, proof: any, reply = "", audit: any;
      const links: {label:string,url:string}[] = [];
      const link = (label:string,url:unknown) => { if(typeof url!=="string")return; const u=new URL(url); if(u.protocol==="https:" && ["checkout.stripe.com","buy.stripe.com","invoice.stripe.com","pay.stripe.com"].includes(u.hostname)) links.push({label,url}); };
      if (n === 0) {
        const r = await call("/demo/restock");
        o = await verify(r.stripe.auto.paymentIntent, "payment_intents");
        proof = fields(o, ["id", "status", "amount", "currency", "livemode"]);
        reply = "Your approved supplier is paid. Items needing your approval remain on hold.";
        link("Open receipt", r.stripe.auto.receiptUrl);
      } else if (n === 1) {
        const params: any = { mode: "payment", line_items: [{ price_data: { currency: "gbp", unit_amount: 3250, product_data: { name: "Kitchen order (test)" } }, quantity: 1 }], success_url: new URL("/",origin).href, cancel_url: new URL("/",origin).href };
        const s = await stripeWrite("PostCheckoutSessions", params, () => stripeX!.checkout.sessions.create(params));
        audit = { via: s._via, operations: ["PostCheckoutSessions"] };
        o = await verify(s.id, "checkout/sessions");
        proof = fields(o, ["id", "status", "payment_status", "amount_total", "currency", "livemode"]);
        reply = "Your £32.50 checkout is ready to share. No customer payment yet.";
        link("Open checkout",o.url);
      } else if (n === 2) {
        const r = await call("/demo/booking", { text: AGENT9_COMMANDS[n] });
        o = await verify(r.stripe.paymentLink.id, "payment_links");
        proof = fields(o, ["id", "active", "currency", "livemode"]);
        reply = "Your £60 deposit link is ready for six guests. Payment is pending.";
        link("Open payment link",o.url);
      } else if (n === 3 || n === 8) {
        if (n === 3) {
          const r = await call("/demo/outinvoice", { customer: "Agent Nine Demo", amount: 120, desc: "Catering" });
          o = await verify(r.stripe.draft.id, "invoices");
        } else {
          const c = await stripeWriteRequired("PostCustomers", { name: "Agent Nine Tools", email: "agent9-tools@example.com" });
          const draft = await stripeWriteRequired("PostInvoices", { customer: c.id, currency: "gbp", auto_advance: false, collection_method: "send_invoice", days_until_due: 30 });
          await stripeWriteRequired("PostInvoiceitems", { customer: c.id, invoice: draft.id, amount: 7500, currency: "gbp", description: "Services" });
          o = await verify(draft.id, "invoices");
          audit = { via: "agent-toolkit", operations: ["PostCustomers", "PostInvoices", "PostInvoiceitems"] };
        }
        proof = fields(o, ["id", "status", "total", "currency", "livemode"]);
        reply = `Your £${n===3?"120":"75"} invoice is drafted. No email sent.`;
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
        reply = "Your partner payment is complete: £60 charged, with a £3 platform fee recorded.";
      } else if (n === 6) {
        const r: any = await subscribe("agent9-demo@example.com");
        if (!r.ok) throw new Error("Subscription unavailable");
        o = requireTestObject(await stripeX.subscriptions.retrieve(r.subscription));
        proof = { ...fields(o, ["id", "status", "livemode"]), price: o.items.data[0].price.id, interval: o.items.data[0].price.recurring?.interval, latest_invoice: o.latest_invoice };
        reply = "Your test customer’s £9 monthly subscription is active.";
      } else {
        const r: any = await sptPay(9.6);
        if (!r.ok || !r.token) throw new Error("Shared payment token unavailable");
        o = await verify(r.paymentIntent, "payment_intents");
        proof = { ...fields(o, ["id", "status", "amount", "currency", "livemode"]), token_id: r.token, token_limit_gbp: r.limit };
        reply = "Your £9.60 payment succeeded using a scoped token, without sharing card details.";
      }
      const expected = ["succeeded", "open", undefined, "draft", "closed", "succeeded", "active", "succeeded", "draft"][n];
      if ((expected && proof.status !== expected) || (n === 2 && proof.active !== true)) throw new Error("Unexpected Stripe state");
      run.status = proof.status || "active";
      run.total = (proof.amount ?? proof.amount_total ?? proof.total ?? 0) / 100;
      run.stripe = { verified: proof };
      run.chatExample = { index:n, product:AGENT9_PRODUCTS[n], links };
      run.audit.push({ at: at(), event: "stripe_verified", channel, object: proof.id, status: run.status, livemode: false });
      if (audit) run.audit.push({ at: at(), event: "stripe_tool", channel, via: audit.via, tools: audit.operations });
      memory.save(run);
      return { reply, proof, audit, record:run };
    } catch {
      run.status = "failed";
      run.audit.push({ at: at(), event: "verification_failed", channel });
      memory.save(run);
      // Deliberately exclude upstream messages, URLs, keys and token payloads.
      run.chatExample = {index:n,product:AGENT9_PRODUCTS[n],links:[]};memory.save(run);
      return {reply:"This Stripe test action could not be verified. No proof is available.",record:run,proof:undefined,audit:undefined};
    }
}
export function mountAgent9(app: Express, port: number) {
  app.get("/agent9", (_q, r) => r.type("html").send(readFileSync("public/agent9.html", "utf8")));
  app.get("/agent9-logo.svg", (_q, r) => r.type("svg").send(readFileSync("public/heysalad-logo-black.svg")));
  app.post("/api/agent9/chat", async(q,res)=>{
    const n=commandIndex(q.body?.text);
    if(n<0)return res.status(400).json({error:"Choose a supported request"});
    if(!stripeX)return res.status(503).json({error:"Stripe test key required"});
    const {reply,proof,audit}=await runAgent9(n,port);
    if(!proof)return res.status(502).json({error:reply});
    res.json({reply,proof,audit});
  });
}
