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
const FILE = "data/stripe-extra.json";
const st: any = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
const persist = () => { try { fs.writeFileSync(FILE, JSON.stringify(st, null, 2)); } catch {} };
const p = (x: number) => Math.round(x * 100);
const err = (e: any) => ({ ok: false, error: String(e?.message || e).slice(0, 300), code: e?.code || e?.statusCode });
const notEnabled = (e: any) => /not set up to use Issuing|not enabled|Issuing/i.test(String(e?.message));

// ---- Issuing -------------------------------------------------------------
// Spending controls = policy.md: per-authorization cap (POLICY.maxCapGBP), grocery MCCs only, alcohol-only stores blocked.
export const ISSUING_CONTROLS = {
  spending_limits: [{ amount: p(POLICY.maxCapGBP), interval: "per_authorization" as const }, { amount: p(200), interval: "weekly" as const }],
  allowed_categories: ["grocery_stores_supermarkets", "eating_places_restaurants", "miscellaneous_food_stores"] as any,
  blocked_categories: ["package_stores_beer_wine_and_liquor"] as any,
};
// Real-time authorization decision (issuing_authorization.request webhook): same rules as the policy engine.
export function decideAuthorization(a: { amount: number; currency?: string; merchant_data?: { category?: string; name?: string } }) {
  const gbp = a.amount / 100, cat = a.merchant_data?.category || "";
  if ((a.currency || "gbp") !== "gbp") return { approved: false, clause: "P1", reason: "GBP only" };
  if (cat.includes("liquor")) return { approved: false, clause: "P3", reason: "No alcohol" };
  if (gbp > POLICY.maxCapGBP) return { approved: false, clause: "P2", reason: `£${gbp.toFixed(2)} is over the £${POLICY.maxCapGBP} cap; needs a human` };
  return { approved: true, clause: "P1", reason: `£${gbp.toFixed(2)} within policy` };
}
export async function issueCard() {
  if (!stripeX) return { ok: false, error: "Stripe test key missing" };
  try {
    if (st.card) return { ok: true, reused: true, ...st.card };
    const ch = await stripeX.issuing.cardholders.create({ type: "individual", name: "Sally HeySalad", email: "sally@heysalad.app", individual: { first_name: "Sally", last_name: "HeySalad" } as any, billing: { address: { line1: "1 Test St", city: "London", postal_code: "EC1A 1BB", country: "GB" } } });
    const c = await stripeX.issuing.cards.create({ cardholder: ch.id, currency: "gbp", type: "virtual", status: "active", spending_controls: ISSUING_CONTROLS });
    st.card = { cardholder: ch.id, card: c.id, last4: c.last4, controls: ISSUING_CONTROLS }; persist();
    return { ok: true, ...st.card };
  } catch (e: any) { return { ...err(e), enabled: !notEnabled(e), hint: notEnabled(e) ? "Issuing is not enabled on this Stripe test account: enable it at dashboard.stripe.com/test/issuing. Spending controls + auth decisions still run locally." : undefined, controls: ISSUING_CONTROLS }; }
}
// Simulate a card purchase (test helper) so the auth webhook / controls decide it.
export async function testAuthorization(amountGBP: number, category = "grocery_stores_supermarkets") {
  const local = decideAuthorization({ amount: p(amountGBP), currency: "gbp", merchant_data: { category } });
  if (!stripeX || !st.card) return { ok: true, simulated: "policy-only", decision: local };
  try {
    const a: any = await (stripeX as any).testHelpers.issuing.authorizations.create({ card: st.card.card, amount: p(amountGBP), currency: "gbp", merchant_data: { category, name: "Ocado" } });
    return { ok: true, authorization: a.id, approved: a.approved, decision: local };
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
