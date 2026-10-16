// Sally for restaurants: 3 one-click demos. Deterministic rules, real Stripe TEST objects, audit + why.
import type { Express } from "express";
import Stripe from "stripe";
import crypto from "node:crypto";
import fs from "node:fs";
import { memory, recall } from "./memory.js";
import { stripeWrite } from "./toolkit.js";
import { layout, recordPage, auditPage, CSS, chatPage } from "./ui.js";

export const RPOLICY = {
  weeklyCapGBP: 150, approvalThresholdGBP: 25, licensedForAlcohol: false,
  approvedSuppliers: ["Waitrose", "Bidfood", "Brakes"], depositGroupSize: 6, depositPerHeadGBP: 10, invoiceLimitGBP: 250, outInvoiceApprovalGBP: 500, testCustomerEmail: "test+demo@heysalad.ai",
};
const W18 = "data/w18-basket.json";
const fallback = [{ product: "Whole Milk 2 Pints", pence: 125 }, { product: "12 Free Range Eggs", pence: 550 }, { product: "Sourdough", pence: 485 }];
function restockList() {
  let base: any[] = fallback;
  try { const j = JSON.parse(fs.readFileSync(W18, "utf8")); base = j.items || j; } catch {}
  const items = base.map((i: any, n: number) => ({ sku: "W" + (n + 1), name: i.product || i.line, price: i.pence / 100, supplier: "Waitrose", category: "grocery" }));
  return items.concat([
    { sku: "B1", name: "Extra virgin olive oil 5L", price: 32.5, supplier: "Bidfood", category: "grocery" },
    { sku: "B2", name: "Fryer oil 20L", price: 24.9, supplier: "Bidfood", category: "grocery" },
    { sku: "X1", name: "House red wine x6", price: 48, supplier: "Bidfood", category: "alcohol" },
    { sku: "X2", name: "Truffle oil 250ml", price: 19, supplier: "Amazon", category: "grocery" },
  ]);
}
const id = (p: string) => p + "_" + crypto.randomBytes(4).toString("hex");
const now = () => new Date().toISOString();
const gbp = (n: number) => `£${n.toFixed(2)}`;
const p = (n: number) => Math.round(n * 100);

export function mountRestaurant(app: Express, stripe: Stripe | null, BASE: string) {
  const need = (res: any) => { if (!stripe) { res.status(500).send("STRIPE_SECRET_KEY (sk_test_) not set"); return true; } return false; };
  const log = (r: any, event: string, data: any = {}) => { r.audit.push({ at: now(), event, ...data }); memory.save(r); };
  const rec = (demo: string, request: string) => ({ id: id(demo), demo, createdAt: now(), agent: "Sally", request, decisions: [] as any[], total: 0, status: "new", stripe: {} as any, audit: [] as any[] });
  async function payPI(r: any, amount: number, desc: string) {
    const pi = await stripe!.paymentIntents.create({ amount: p(amount), currency: "gbp", payment_method: "pm_card_visa", confirm: true, description: desc, metadata: { record: r.id }, automatic_payment_methods: { enabled: true, allow_redirects: "never" }, expand: ["latest_charge"] });
    const ch: any = pi.latest_charge;
    return { paymentIntent: pi.id, status: pi.status, chargeId: ch?.id, receiptUrl: ch?.receipt_url, amount };
  }

  // 1) RESTOCK (spend)
  app.post("/demo/restock", async (_q, res) => {
    if (need(res)) return;
    const r = rec("restock", "Restock the kitchen for the week");
    let total = 0;
    for (const i of restockList()) {
      const ev = `${i.supplier} · ${i.category} · ${gbp(i.price)}`;
      const d = (status: string, clause: string, reason: string) => r.decisions.push({ ...i, status, clause, reason, evidence: ev });
      if (!RPOLICY.approvedSuppliers.includes(i.supplier)) d("blocked", "R3", `${i.supplier} is not an approved supplier`);
      else if (i.category === "alcohol" && !RPOLICY.licensedForAlcohol) d("blocked", "R4", "No alcohol: premises licence not on file");
      else if (i.price > RPOLICY.approvalThresholdGBP) d("needs_approval", "R2", `${gbp(i.price)} is over the ${gbp(RPOLICY.approvalThresholdGBP)} per-item threshold`);
      else if (total + i.price > RPOLICY.weeklyCapGBP) d("blocked", "R1", `Would exceed ${gbp(RPOLICY.weeklyCapGBP)} weekly cap`);
      else { total += i.price; d("auto_paid", "R1-R4", `Within policy; running total ${gbp(total)} of ${gbp(RPOLICY.weeklyCapGBP)}`); }
    }
    r.total = Math.round(total * 100) / 100;
    log(r, "basket_built", { items: r.decisions.length, autoPay: r.total });
    r.stripe.auto = await payPI(r, r.total, "Sally restock (auto, within policy)");
    r.status = r.decisions.some((d: any) => d.status === "needs_approval") ? "awaiting_human" : "paid";
    log(r, "auto_paid", { clause: "R1-R4", ...r.stripe.auto });
    if (r.status === "awaiting_human") log(r, "off_ramp", { clause: "R2", note: "Over-threshold items wait for a human", url: `${BASE}/r/${r.id}` });
    res.json(view(r));
  });
  app.post("/r/:id/approve", async (req, res) => {
    const r = memory.get(req.params.id); if (!r || need(res)) return;
    if (r.status !== "awaiting_human") return res.redirect(`/r/${r.id}`);
    if (r.demo === "restock" || r.demo === "shop") {
      const items = r.decisions.filter((d: any) => d.status === "needs_approval");
      const amt = items.reduce((s: number, d: any) => s + d.price, 0);
      items.forEach((d: any) => { d.status = "human_approved"; d.reason += " — approved by Peter"; });
      log(r, "human_approved", { approver: "Peter", clause: "R2", amount: amt });
      r.stripe.approved = await payPI(r, amt, r.demo === "shop" ? "Sally Waitrose shop (human-approved)" : "Sally restock (human-approved items)");
      r.total = Math.round((r.total + amt) * 100) / 100;
      log(r, "payment_succeeded", r.stripe.approved);
    } else if (r.demo === "invoice") {
      log(r, "human_approved", { approver: "Peter", clause: "I2", note: "Mismatch accepted by human" });
      await payInvoice(r);
    } else if (r.demo === "outinvoice") {
      log(r, "human_approved", { approver: "Peter", clause: "I4", amount: r.total });
      await sendOut(r); return req.headers.accept?.includes("json") ? res.json(view(r)) : res.redirect(`/r/${r.id}`);
    }
    r.status = "paid"; memory.save(r);
    req.headers.accept?.includes("json") ? res.json(view(r)) : res.redirect(`/r/${r.id}`);
  });

  // 2) HOST BOOKING (collect)
  app.post("/demo/booking", async (req, res) => {
    if (need(res)) return;
    const text = String(req.body?.text || "Table for 6 Saturday 8pm, name Ada");
    const r = rec("booking", text);
    const size = Number(text.match(/(\d+)/)?.[1] || 2);
    r.booking = { size, when: text.replace(/.*?\d+\s*(people|guests)?\s*/i, "").trim() || "TBC" };
    log(r, "booking_received", r.booking);
    if (size < RPOLICY.depositGroupSize) {
      r.decisions.push({ name: `Table for ${size}`, price: 0, status: "confirmed", clause: "H1", reason: `Groups under ${RPOLICY.depositGroupSize} need no deposit` });
      r.status = "confirmed"; log(r, "booking_confirmed", { clause: "H1" }); return res.json(view(r));
    }
    const amt = size * RPOLICY.depositPerHeadGBP;
    r.total = amt;
    r.decisions.push({ name: `Deposit: ${size} × ${gbp(RPOLICY.depositPerHeadGBP)}`, price: amt, status: "requested", clause: "H1", reason: `Groups of ${RPOLICY.depositGroupSize}+ pay ${gbp(RPOLICY.depositPerHeadGBP)}/head deposit` });
    const pp = { currency: "gbp", unit_amount: p(amt), product_data: { name: `HeySalad table deposit (${size} guests)` } };
    const price = await stripeWrite("PostPrices", pp, () => stripe!.prices.create(pp));
    const lp: any = { line_items: [{ price: price.id, quantity: 1 }], metadata: { record: r.id }, payment_intent_data: { metadata: { record: r.id } }, invoice_creation: { enabled: true }, after_completion: { type: "redirect", redirect: { url: `${BASE}/r/${r.id}/paid` } } };
    const link = await stripeWrite("PostPaymentLinks", lp, () => stripe!.paymentLinks.create(lp));
    log(r, "stripe_tool", { tools: ["PostPrices", "PostPaymentLinks"], via: link._via });
    r.stripe.paymentLink = { id: link.id, url: link.url };
    r.status = "awaiting_diner";
    log(r, "deposit_requested", { clause: "H1", amount: amt, paymentLink: link.url, note: "No human raised this bill" });
    res.json(view(r));
  });
  app.get("/r/:id/paid", async (req, res) => {
    const r = memory.get(req.params.id); if (!r || need(res)) return;
    if (r.demo === "booking" && r.status !== "paid") {
      const ss = await stripe!.checkout.sessions.list({ payment_link: r.stripe.paymentLink.id, limit: 1, expand: ["data.payment_intent.latest_charge"] });
      const s: any = ss.data[0];
      if (s?.payment_status === "paid") {
        const ch = s.payment_intent?.latest_charge;
        r.stripe.payment = { checkoutSession: s.id, paymentIntent: s.payment_intent?.id, receiptUrl: ch?.receipt_url, invoiceId: s.invoice };
        r.status = "paid"; r.decisions[0].status = "paid";
        log(r, "deposit_paid", { clause: "H1", ...r.stripe.payment });
      }
    }
    res.redirect(`/r/${r.id}`);
  });

  // 3) SUPPLIER INVOICE
  const PO = { po: "PO-1042", supplier: "Bidfood", amount: 184.6 };
  async function payInvoice(r: any) {
    const inv0 = r.invoice;
    const cp = { name: `HeySalad (bill from ${inv0.supplier})`, metadata: { record: r.id } };
    const cust = await stripeWrite("PostCustomers", cp, () => stripe!.customers.create(cp));
    const pm = await stripe!.paymentMethods.attach("pm_card_visa", { customer: cust.id });
    let inv = await stripe!.invoices.create({ customer: cust.id, currency: "gbp", collection_method: "charge_automatically", default_payment_method: pm.id, auto_advance: false, description: `${inv0.supplier} ${inv0.number} against ${inv0.po}`, metadata: { record: r.id, po: inv0.po } });
    for (const l of inv0.lines) { const ip = { customer: cust.id, invoice: inv.id, currency: "gbp", amount: p(l.amount), description: l.desc }; await stripeWrite("PostInvoiceitems", ip, () => (stripe!.invoiceItems as any).create(ip)); }
    log(r, "stripe_tool", { tools: ["PostCustomers", "PostInvoiceitems"], via: cust._via });
    inv = await stripe!.invoices.finalizeInvoice(inv.id!);
    inv = await stripe!.invoices.pay(inv.id!, { payment_method: pm.id });
    r.stripe.invoice = { id: inv.id, status: inv.status, hostedUrl: inv.hosted_invoice_url, pdf: inv.invoice_pdf, amount: inv.amount_paid / 100 };
    log(r, "invoice_paid", r.stripe.invoice);
  }
  app.post("/demo/invoice", async (req, res) => {
    if (need(res)) return;
    const mismatch = !!req.body?.mismatch;
    const lines = [{ desc: "Chicken thighs 10kg", amount: 89.6 }, { desc: "Fryer oil 20L x2", amount: 49.8 }, { desc: "Mixed salad leaves 6kg", amount: 45.2 }];
    if (mismatch) lines.push({ desc: "Delivery surcharge (not on PO)", amount: 35 });
    const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const r: any = rec("invoice", `Supplier invoice email from Bidfood, INV-77${mismatch ? "19" : "18"}, ${gbp(total)}`);
    r.invoice = { supplier: "Bidfood", number: `INV-77${mismatch ? "19" : "18"}`, po: PO.po, lines, total };
    r.total = total;
    log(r, "invoice_received", r.invoice);
    const checks = [
      { clause: "I1", ok: RPOLICY.approvedSuppliers.includes(r.invoice.supplier), reason: `${r.invoice.supplier} is an approved supplier` },
      { clause: "I2", ok: Math.abs(total - PO.amount) < 0.01, reason: `Invoice ${gbp(total)} vs ${PO.po} ${gbp(PO.amount)}` },
      { clause: "I3", ok: total <= RPOLICY.invoiceLimitGBP, reason: `Under ${gbp(RPOLICY.invoiceLimitGBP)} auto-pay limit` },
    ];
    r.decisions = lines.map(l => ({ name: l.desc, price: l.amount, status: mismatch && l.desc.includes("not on PO") ? "needs_approval" : "matched", clause: "I2", reason: mismatch && l.desc.includes("not on PO") ? "Line not on purchase order" : `On ${PO.po}` }));
    r.checks = checks;
    log(r, "three_way_check", { checks });
    if (checks.every(c => c.ok)) { await payInvoice(r); r.status = "paid"; memory.save(r); }
    else { r.status = "awaiting_human"; log(r, "off_ramp", { clause: "I2", note: "Mismatch: human must approve", url: `${BASE}/r/${r.id}` }); }
    res.json(view(r));
  });

  // 4) OUTGOING INVOICE (I4): prepare a DRAFT, then send. Over £500 waits for a human. Test mode only:
  // Stripe does not email customers from test mode; the customer is always a test address.
  app.post("/demo/outinvoice", async (req, res) => {
    if (need(res)) return;
    const customer = String(req.body?.customer || "Demo customer").slice(0, 60), amount = Math.round(Number(req.body?.amount || 0) * 100) / 100, desc = String(req.body?.desc || "Catering").slice(0, 80);
    if (!(amount > 0)) return res.status(400).json({ error: "amount required" });
    const r: any = rec("outinvoice", `Prepare invoice for ${customer} ${gbp(amount)} for ${desc}`);
    r.outInvoice = { customer, email: RPOLICY.testCustomerEmail, desc, amount };
    r.total = amount; r.decisions = [{ name: desc, price: amount, status: "draft", clause: "I4", reason: amount > RPOLICY.outInvoiceApprovalGBP ? `Over ${gbp(RPOLICY.outInvoiceApprovalGBP)}: needs your approval before sending` : `Up to ${gbp(RPOLICY.outInvoiceApprovalGBP)}: Sally may send` }];
    log(r, "invoice_requested", r.outInvoice);
    const cp = { name: customer, email: RPOLICY.testCustomerEmail, description: "Sally demo (test mode)" };
    const cust: any = await stripeWrite("PostCustomers", cp, () => stripe!.customers.create(cp));
    const ip = { customer: cust.id, currency: "gbp", collection_method: "send_invoice", days_until_due: 7, description: `${desc} (HeySalad, test mode)`, metadata: { record: r.id } };
    const inv: any = await stripeWrite("PostInvoices", ip, () => stripe!.invoices.create(ip as any));
    const lp = { customer: cust.id, invoice: inv.id, currency: "gbp", amount: p(amount), description: desc };
    await stripeWrite("PostInvoiceitems", lp, () => (stripe!.invoiceItems as any).create(lp));
    r.stripe.draft = { id: inv.id, customer: cust.id, status: "draft", amount };
    log(r, "stripe_tool", { tools: ["PostCustomers", "PostInvoices", "PostInvoiceitems"], via: inv._via });
    r.status = "draft"; log(r, "invoice_drafted", { clause: "I4", amount, note: "Draft only, nothing sent" });
    res.json(view(r));
  });
  async function sendOut(r: any) {
    let inv: any = await stripe!.invoices.finalizeInvoice(r.stripe.draft.id);
    inv = await stripe!.invoices.sendInvoice(inv.id);
    r.stripe.sent = { id: inv.id, status: inv.status, hostedUrl: inv.hosted_invoice_url, pdf: inv.invoice_pdf, amount: inv.amount_due / 100, to: r.outInvoice.email };
    r.decisions.forEach((d: any) => (d.status = "sent"));
    r.status = "sent"; log(r, "invoice_sent", { ...r.stripe.sent, note: "Stripe test mode: no real email is delivered" });
  }
  app.post("/r/:id/send", async (req, res) => {
    const r = memory.get(req.params.id); if (!r || need(res)) return;
    if (r.demo !== "outinvoice" || r.status !== "draft") return res.json(view(r));
    if (r.total > RPOLICY.outInvoiceApprovalGBP && !req.body?.approved) { r.status = "awaiting_human"; log(r, "off_ramp", { clause: "I4", note: `Over ${gbp(RPOLICY.outInvoiceApprovalGBP)}: human must approve sending`, url: `${BASE}/r/${r.id}` }); return res.json(view(r)); }
    await sendOut(r); res.json(view(r));
  });

  // 5) SHOPPING LIST EMAIL: DRAFT preview only. Never sends.
  app.post("/demo/shoplist", (_q, res) => {
    const items = restockList().filter(i => i.category !== "alcohol" && RPOLICY.approvedSuppliers.includes(i.supplier));
    const r: any = rec("shoplist", "Email me the shopping list");
    r.decisions = items.map(i => ({ name: i.name, price: i.price, supplier: i.supplier, status: "listed", clause: "R3" }));
    r.total = Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100;
    r.emailDraft = { label: "Draft", to: "peter@heysalad.ai", subject: `Shopping list (${items.length} items, ${gbp(r.total)})`, body: items.map(i => `- ${i.name} (${i.supplier}) ${gbp(i.price)}`).join("\n") };
    r.status = "draft"; log(r, "email_drafted", { note: "Draft only, not sent", to: r.emailDraft.to });
    res.json({ ...view(r), emailDraft: r.emailDraft });
  });

  // Shared views
  const view = (r: any) => ({ id: r.id, demo: r.demo, status: r.status, total: r.total, url: `${BASE}/r/${r.id}`, why: `${BASE}/r/${r.id}/why`, stripe: r.stripe, outInvoice: r.outInvoice, emailDraft: r.emailDraft, decisions: r.decisions, audit: r.audit });
  app.get("/r/:id/why", async (req, res) => {
    const r = memory.get(req.params.id); if (!r) return res.status(404).json({ error: "not found" });
    const q = String(req.query.q || "").toLowerCase();
    const d = q && r.decisions.find((x: any) => (x.sku || "").toLowerCase() === q || x.name.toLowerCase().includes(q));
    if (d) return res.json({ answer: `${d.name} (${gbp(d.price)}): ${d.status.replace("_", " ")} under ${d.clause}: ${d.reason}.`, decision: d });
    const mem: any = await Promise.race([recall(`Past spending decisions similar to ${r.demo} ${gbp(r.total)}`), new Promise(ok => setTimeout(() => ok(null), 4000))]);
    res.json({ remembers: mem?.answer, answer: `Sally (${r.demo}) moved ${gbp(r.total)}; status ${r.status}. Every line cites a clause in policy.md.`, decisions: r.decisions, stripe: r.stripe, audit: r.audit });
  });
  app.get("/r/:id", (req, res) => { const r = memory.get(req.params.id); r ? res.send(recordPage(r)) : res.status(404).send("Not found"); });
  app.get("/audit", (_q, res) => res.send(auditPage()));
  app.get("/classic", (_q, res) => res.send(homePage()));
  app.get("/", (_q, res) => res.send(chatPage()));
  app.get("/heysalad-mark.svg", (_q, res) => res.sendFile("heysalad-mark.svg", { root: "public" }));
  app.get("/heysalad-logo-black.svg", (_q, res) => res.sendFile("heysalad-logo-black.svg", { root: "public" }));
}

export const css = CSS;
const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
function links(s: any) {
  const out: string[] = [];
  const walk = (o: any) => { for (const [k, v] of Object.entries(o || {})) { if (v && typeof v === "object") walk(v); else if (typeof v === "string" && v.startsWith("http")) out.push(`<a class="btn ghost" target=_blank href="${esc(v)}">${esc(k)}</a>`); else if (typeof v === "string" && /^(pi|ch|in|plink|cs)_/.test(v)) out.push(`<code>${esc(v)}</code>`); } };
  walk(s); return out.join(" ");
}
function homePage() {
  return layout("Classic", `<h1>Sally for restaurants</h1><p>One agent. A written policy. Real Stripe (test) money. Every pound explained.</p>
<div class="grid">
<div class="card"><h3>1 · Restock</h3><p>Sally restocks the kitchen. Within policy she pays; big items wait for you.</p><button onclick="go('/demo/restock')">Restock the kitchen</button></div>
<div class="card"><h3>2 · Host booking</h3><input id="bk" value="Table for 6 Saturday 8pm"><p>Groups of 6+ pay a £10/head deposit.</p><button onclick="go('/demo/booking',{text:bk.value})">Take booking</button></div>
<div class="card"><h3>3 · Supplier invoice</h3><p>Sally checks the invoice against the PO, then pays it.</p><button onclick="go('/demo/invoice')">Pay matching invoice</button><br><br><button class="ghost" onclick="go('/demo/invoice',{mismatch:1})">Try mismatched one</button></div>
</div><p id="msg"></p><p><a class="btn ghost" href="/audit">Every pound (audit)</a> <a class="btn ghost" href="/policy">policy.md</a></p>
<script>async function go(u,b){msg.textContent='Sally is working…';const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b||{})});const j=await r.json();location='/r/'+j.id}</script>`, "/");
}
