// Remaining Stripe features, all TEST MODE only (sk_test_ enforced). Patterns adapted from HeySalad payme (heysalad-pay/src/stripe.ts, connect.ts).
//   Issuing: virtual card for Sally with spending controls mirroring policy.md, plus real-time auth decisions.
//   Connect: a venue connected account + destination charge (Sally pays the venue, HeySalad keeps a fee).
//   Billing: "Sally Plus" monthly subscription via Products/Prices/Subscriptions.
//   Shared payment tokens: agent pays with a scoped, expiring SPT (Stripe agentic commerce), never seeing card data.
import type { Express } from "express";
import Stripe from "stripe";
import fs from "node:fs";
import { POLICY } from "./policy.js";
import { remember } from "./memory.js";

const key = process.env.STRIPE_SECRET_KEY || "";
export const stripeX = key.startsWith("sk_test_") ? new Stripe(key, { timeout: 25000 }) : null;
// Issuing may live on a separate test account (STRIPE_ISSUING_KEY); falls back to STRIPE_SECRET_KEY. Test keys only.
const ikey = process.env.STRIPE_ISSUING_KEY || key;
export const stripeI = ikey.startsWith("sk_test_") ? new Stripe(ikey, { timeout: 25000 }) : null;
const FILE = "data/stripe-extra.json";
const st: any = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
export const extraState = () => st;
const log = (k: string, v: any) => { (st[k] ||= []).unshift({ at: new Date().toISOString(), ...v }); st[k].splice(50); persist(); };
const persist = () => { try { fs.writeFileSync(FILE, JSON.stringify(st, null, 2)); } catch {} };
const p = (x: number) => Math.round(x * 100);
const err = (e: any) => ({ ok: false, error: String(e?.message || e).slice(0, 300), code: e?.code || e?.statusCode });
const notEnabled = (e: any) => /not set up to use Issuing|not enabled|Issuing/i.test(String(e?.message));

// ---- Issuing -------------------------------------------------------------
// Spending controls = policy.md: per-authorization cap (POLICY.maxCapGBP), grocery MCCs only, alcohol-only stores blocked.
export const ISSUING_CONTROLS = {
  spending_limits: [{ amount: p(POLICY.maxCapGBP), interval: "per_authorization" as const }, { amount: p(200), interval: "weekly" as const }],
  allowed_categories: ["grocery_stores_supermarkets", "eating_places_restaurants"] as any, // liquor stores therefore declined
};
// Real-time authorization decision (issuing_authorization.request webhook): same rules as the policy engine.
export function decideAuthorization(a: { amount: number; currency?: string; merchant_data?: { category?: string; name?: string } }) {
  const gbp = a.amount / 100, cat = a.merchant_data?.category || "";
  if ((a.currency || "gbp") !== "gbp") return { approved: false, clause: "P1", reason: "GBP only" };
  if (cat.includes("liquor")) return { approved: false, clause: "P3", reason: "No alcohol" };
  if (gbp > POLICY.maxCapGBP) return { approved: false, clause: "P2", reason: `£${gbp.toFixed(2)} is over the £${POLICY.maxCapGBP} cap; needs a human` };
  return { approved: true, clause: "P1", reason: `£${gbp.toFixed(2)} within policy` };
}
// Issuing-for-Connect platforms can only issue on a connected account: create one for Sally (test KYC data), fund it, issue there.
async function issuingAccount(): Promise<string | undefined> {
  if (process.env.STRIPE_ISSUING_ACCOUNT) return process.env.STRIPE_ISSUING_ACCOUNT;
  if (st.issuingAccount) return st.issuingAccount;
  const now = Math.floor(Date.now() / 1000), ip = "8.8.8.8";
  const a = await stripeI!.accounts.create({ type: "custom", country: "GB", email: "sally@heysalad.app", business_type: "individual",
    capabilities: { card_issuing: { requested: true }, transfers: { requested: true } },
    business_profile: { mcc: "5411", url: "https://heysalad.io", product_description: "Sally agent spend (test)" },
    individual: { first_name: "Sally", last_name: "HeySalad", email: "sally@heysalad.app", phone: "+447700900000", dob: { day: 1, month: 1, year: 1901 }, address: { line1: "address_full_match", city: "London", postal_code: "EC1A 1BB", country: "GB" } },
    tos_acceptance: { date: now, ip }, settings: { card_issuing: { tos_acceptance: { date: now, ip } } } as any });
  st.issuingAccount = a.id; persist();
  await stripeI!.accounts.update(a.id, { business_profile: { annual_revenue: { amount: 10000000, currency: "gbp", fiscal_year_end: `${new Date().getFullYear() - 1}-12-31` }, estimated_worker_count: 5 } as any,
    external_account: { object: "bank_account", country: "GB", currency: "gbp", account_number: "00012345", routing_number: "108800" } as any });
  for (let i = 0; i < 20; i++) { const r = await stripeI!.accounts.retrieve(a.id); if (r.capabilities?.card_issuing === "active") break; await new Promise(ok => setTimeout(ok, 1500)); }
  return a.id;
}
export async function issueCard() {
  if (!stripeI) return { ok: false, error: "Stripe test key missing" };
  try {
    if (st.card) return { ok: true, reused: true, ...st.card };
    const mk = async (acct?: string) => {
      const o: any = acct ? { stripeAccount: acct } : undefined, now = Math.floor(Date.now() / 1000);
      const ch = await stripeI!.issuing.cardholders.create({ type: "individual", name: "Sally HeySalad", email: "sally@heysalad.app", phone_number: "+447700900000",
        individual: { first_name: "Sally", last_name: "HeySalad", dob: { day: 1, month: 1, year: 1990 }, card_issuing: { user_terms_acceptance: { date: now, ip: "8.8.8.8" } } } as any,
        billing: { address: { line1: "1 Test St", city: "London", postal_code: "EC1A 1BB", country: "GB" } } }, o);
      const c = await stripeI!.issuing.cards.create({ cardholder: ch.id, currency: "gbp", type: "virtual", status: "active", spending_controls: ISSUING_CONTROLS }, o);
      return { account: acct, cardholder: ch.id, card: c.id, last4: c.last4, status: c.status, controls: ISSUING_CONTROLS };
    };
    let out;
    try { out = await mk(process.env.STRIPE_ISSUING_ACCOUNT); }
    catch (e: any) {
      if (!/connected accounts|missing requirements/i.test(String(e?.message))) throw e;
      const acct = await issuingAccount();
      for (let i = 0; ; i++) { // capability activation can lag a few seconds in test mode
        try { out = await mk(acct); break; } catch (e2: any) { if (i >= 8 || !/missing requirements/i.test(String(e2?.message))) throw e2; await new Promise(ok => setTimeout(ok, 5000)); }
      }
    }
    // Test mode: fund the Issuing balance (£500 test money) so authorizations can be approved.
    if (out.account) await stripeI.rawRequest("POST", "/v1/test_helpers/issuing/fund_balance", { amount: 50000, currency: "gbp" }, { stripeAccount: out.account } as any).then(() => new Promise(ok => setTimeout(ok, 4000))).catch(() => {});
    st.card = out; persist();
    return { ok: true, ...st.card };
  } catch (e: any) { return { ...err(e), enabled: !notEnabled(e), hint: notEnabled(e) ? "Issuing is not enabled on this Stripe test account: set STRIPE_ISSUING_KEY to a test key from an Issuing-enabled account." : undefined, controls: ISSUING_CONTROLS }; }
}
// Simulate a card purchase (Stripe test helper): Stripe's spending controls decide on the real card; policy decision shown alongside.
export async function testAuthorization(amountGBP: number, category = "grocery_stores_supermarkets", merchant = "Ocado") {
  const local = decideAuthorization({ amount: p(amountGBP), currency: "gbp", merchant_data: { category } });
  if (!stripeI || !st.card) { log("auths", { amount: amountGBP, category, merchant, approved: local.approved, clause: local.clause, reason: local.reason, simulated: true }); return { ok: true, simulated: "policy-only", decision: local }; }
  try {
    const a: any = await (stripeI as any).testHelpers.issuing.authorizations.create({ card: st.card.card, amount: p(amountGBP), currency: "gbp", merchant_data: { category, name: merchant } }, st.card.account ? { stripeAccount: st.card.account } : undefined);
    log("auths", { authorization: a.id, amount: amountGBP, category, merchant, approved: a.approved, clause: local.clause, reason: local.reason });
    return { ok: true, authorization: a.id, approved: a.approved, stripeReason: a.request_history?.[0]?.reason, decision: local };
  } catch (e: any) { return { ...err(e), decision: local }; }
}

// ---- Connect -------------------------------------------------------------
export async function venueAccount() {
  if (!stripeX) return { ok: false, error: "Stripe test key missing" };
  try {
    if (!st.venue) {
      const a = await stripeX.accounts.create({ type: "custom", country: "GB", email: "venue@example.com", business_type: "individual",
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { mcc: "5812", url: "https://heysalad.io", product_description: "Restaurant (Sally demo venue)" },
        individual: { first_name: "Demo", last_name: "Venue", email: "venue@example.com", phone: "+447700900000", dob: { day: 1, month: 1, year: 1901 }, address: { line1: "address_full_match", city: "London", postal_code: "EC1A 1BB", country: "GB" } },
        external_account: { object: "bank_account", country: "GB", currency: "gbp", account_number: "00012345", routing_number: "108800" } as any,
        tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: "8.8.8.8" } });
      st.venue = { account: a.id }; persist();
    }
    const a = await stripeX.accounts.retrieve(st.venue.account);
    return { ok: true, account: a.id, transfers: a.capabilities?.transfers, card_payments: a.capabilities?.card_payments };
  } catch (e: any) { return err(e); }
}
// Destination charge: customer pays £X, venue receives it minus HeySalad's fee.
export async function payVenue(amountGBP: number, feeGBP = Math.round(amountGBP * 5) / 100) {
  const v: any = await venueAccount(); if (!v.ok) return v;
  if (v.transfers !== "active") return { ok: false, account: v.account, transfers: v.transfers, error: "Venue account still verifying (test mode); retry shortly" };
  try {
    const pi = await stripeX!.paymentIntents.create({ amount: p(amountGBP), currency: "gbp", payment_method: "pm_card_visa", confirm: true, automatic_payment_methods: { enabled: true, allow_redirects: "never" }, transfer_data: { destination: v.account }, application_fee_amount: p(feeGBP), description: "Sally → venue (destination charge, test)" });
    remember(`Sally paid venue ${v.account} £${amountGBP.toFixed(2)} via Stripe Connect destination charge ${pi.id} (fee £${feeGBP.toFixed(2)}).`).catch(() => {});
    log("venuePays", { paymentIntent: pi.id, status: pi.status, amount: amountGBP, fee: feeGBP });
    return { ok: true, paymentIntent: pi.id, status: pi.status, account: v.account, fee: feeGBP };
  } catch (e: any) { return err(e); }
}

// ---- Billing -------------------------------------------------------------
export async function subscribe(email = "peter@heysalad.io") {
  if (!stripeX) return { ok: false, error: "Stripe test key missing" };
  try {
    if (!st.price) { const pr = await stripeX.prices.create({ currency: "gbp", unit_amount: 900, recurring: { interval: "month" }, product_data: { name: "Sally Plus (monthly)" }, lookup_key: "sally_plus_monthly", transfer_lookup_key: true }); st.price = pr.id; persist(); }
    const c = await stripeX.customers.create({ email, name: "Sally Plus subscriber (test)", payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } });
    const sub = await stripeX.subscriptions.create({ customer: c.id, items: [{ price: st.price }], metadata: { app: "sally" } });
    log("subs", { subscription: sub.id, status: sub.status, email });
    return { ok: true, subscription: sub.id, status: sub.status, price: st.price, amount: "£9.00/month" };
  } catch (e: any) { return err(e); }
}

// ---- Shared payment tokens ----------------------------------------------
// The buyer's agent grants Sally a scoped token (max amount, expiry); Sally charges it without seeing card details.
// In test mode the grant is minted with Stripe's test helper (in production the buyer's wallet/agent issues it).
export async function sptPay(amountGBP: number, maxGBP = POLICY.maxCapGBP) {
  if (!stripeX) return { ok: false, error: "Stripe test key missing" };
  if (amountGBP > maxGBP) return { ok: false, clause: "P2", error: `£${amountGBP} exceeds the token's £${maxGBP} limit` };
  try {
    const spt: any = await stripeX.rawRequest("POST", "/v1/test_helpers/shared_payment/granted_tokens", { payment_method: "pm_card_visa", usage_limits: { currency: "gbp", max_amount: p(maxGBP), expires_at: Math.floor(Date.now() / 1000) + 3600 } });
    const pi: any = await stripeX.rawRequest("POST", "/v1/payment_intents", { amount: p(amountGBP), currency: "gbp", shared_payment_granted_token: spt.id, confirm: true, description: "Sally agentic checkout (shared payment token, test)" });
    remember(`Sally paid £${amountGBP.toFixed(2)} with shared payment token ${spt.id} (limit £${maxGBP}), PaymentIntent ${pi.id}.`).catch(() => {});
    log("spts", { token: spt.id, paymentIntent: pi.id, status: pi.status, amount: amountGBP });
    return { ok: true, token: spt.id, limit: maxGBP, paymentIntent: pi.id, status: pi.status };
  } catch (e: any) { return err(e); }
}

export function mountStripeExtra(app: Express) {
  const n = (v: any, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  app.post("/api/issuing/card", async (_q, res) => res.json(await issueCard()));
  app.post("/api/issuing/test-auth", async (q, res) => res.json(await testAuthorization(n(q.body?.amount, 12), q.body?.category)));
  app.post("/api/connect/venue", async (_q, res) => res.json(await venueAccount()));
  app.post("/api/connect/pay", async (q, res) => res.json(await payVenue(n(q.body?.amount, 60))));
  app.post("/api/billing/subscribe", async (q, res) => res.json(await subscribe(q.body?.email)));
  app.post("/api/spt/pay", async (q, res) => res.json(await sptPay(n(q.body?.amount, 9.6))));
}
