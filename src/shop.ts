// Demo 4 "Shop": Sally gets a grocery list, picks the best-match product for each line from
// her real Waitrose W18 catalog, auto-pays within S1 (Stripe TEST PaymentIntent) and holds the rest.
import type { Express } from "express";
import Stripe from "stripe";
import crypto from "node:crypto";
import fs from "node:fs";
import { memory } from "./memory.js";

export const SHOP = { autoPayGBP: 25, store: "Waitrose" };
export function catalog(): any[] { try { return JSON.parse(fs.readFileSync("data/shop-catalog.json", "utf8")).items; } catch { return []; } }
const toks = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !/^(the|and|free|range|british|essential|no1|organic|duchy|waitrose)$/.test(w));
export function bestMatch(line: string, cat = catalog()) {
  const q = toks(line); let best: any = null, score = 0;
  for (const c of cat) { const t = new Set(toks(c.name + " " + c.line)); const s = q.filter(w => t.has(w) || [...t].some(x => x.startsWith(w.slice(0, 5)))).length; if (s > score) { score = s; best = c; } }
  return best ? { ...best, matchScore: score } : null;
}
const now = () => new Date().toISOString();
const gbp = (n: number) => `£${n.toFixed(2)}`;

export function mountShop(app: Express, stripe: Stripe | null, BASE: string) {
  const log = (r: any, event: string, data: any = {}) => { r.audit.push({ at: now(), event, ...data }); memory.save(r); };
  // Only the live-view URL is exposed here; never add secrets.
  app.get("/api/config", (_q, res) => res.json({ liveViewUrl: process.env.SALLY_LIVE_VIEW_URL || null }));
  app.get("/api/catalog", (_q, res) => res.json(catalog()));
  app.post("/demo/shop", async (req, res) => {
    if (!stripe) return res.status(500).send("STRIPE_SECRET_KEY (sk_test_) not set");
    const cat = catalog();
    const list: string[] = Array.isArray(req.body?.list) && req.body.list.length ? req.body.list.map(String) : cat.map(c => c.line);
    const r: any = { id: "shop_" + crypto.randomBytes(4).toString("hex"), demo: "shop", createdAt: now(), agent: "Sally", request: `Do the ${SHOP.store} shop (${list.length} lines)`, list, decisions: [], total: 0, status: "new", stripe: {}, audit: [] };
    log(r, "list_received", { lines: list.length, store: SHOP.store });
    let auto = 0;
    for (const line of list) {
      const m = bestMatch(line, cat);
      if (!m) { r.decisions.push({ line, name: line, price: 0, status: "blocked", clause: "S2", reason: "No matching product in the Waitrose catalog" }); continue; }
      const base = { sku: m.sku, line, name: m.name, price: m.price, pack: m.pack, emoji: m.emoji, supplier: SHOP.store, category: "grocery", evidence: `${SHOP.store} W18 · ${m.pack} · ${gbp(m.price)} · match ${m.matchScore}` };
      if (auto + m.price <= SHOP.autoPayGBP) { auto = Math.round((auto + m.price) * 100) / 100; r.decisions.push({ ...base, status: "auto_paid", clause: "S1", reason: `Best match for "${line}"; running total ${gbp(auto)} within ${gbp(SHOP.autoPayGBP)} auto-pay` }); }
      else r.decisions.push({ ...base, status: "needs_approval", clause: "R2", reason: `Best match for "${line}"; basket is past the ${gbp(SHOP.autoPayGBP)} approval threshold, so it waits for you` });
      log(r, "item_picked", { sku: m.sku, item: m.name, price: m.price, clause: r.decisions.at(-1).clause });
    }
    r.total = auto;
    log(r, "basket_built", { items: r.decisions.length, autoPay: auto, held: r.decisions.filter((d: any) => d.status === "needs_approval").length });
    if (auto > 0) {
      const pi = await stripe.paymentIntents.create({ amount: Math.round(auto * 100), currency: "gbp", payment_method: "pm_card_visa", confirm: true, description: "Sally Waitrose shop (auto, within S1)", metadata: { record: r.id }, automatic_payment_methods: { enabled: true, allow_redirects: "never" }, expand: ["latest_charge"] });
      const ch: any = pi.latest_charge;
      r.stripe.auto = { paymentIntent: pi.id, status: pi.status, chargeId: ch?.id, receiptUrl: ch?.receipt_url, amount: auto };
      log(r, "auto_paid", { clause: "S1", ...r.stripe.auto });
    }
    r.status = r.decisions.some((d: any) => d.status === "needs_approval") ? "awaiting_human" : "paid";
    if (r.status === "awaiting_human") log(r, "off_ramp", { clause: "R2", note: `Over ${gbp(SHOP.autoPayGBP)}: the rest of the basket waits for a human`, url: `${BASE}/r/${r.id}` });
    memory.save(r);
    res.json({ id: r.id, demo: r.demo, status: r.status, total: r.total, url: `${BASE}/r/${r.id}`, why: `${BASE}/r/${r.id}/why`, stripe: r.stripe, decisions: r.decisions, audit: r.audit });
  });
}
