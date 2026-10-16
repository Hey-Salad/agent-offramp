// Shared HeySalad UI for every money page: one layout, one stylesheet, one nav.
// Brand: Cherry #ed4c4c, Peach #faa09a, Light Peach #ffd0cd, Cream #fff8f6, ink #1f1416. Figtree only.
import type { Express } from "express";
import { memory } from "./memory.js";
import { extraState } from "./stripe-extra.js";

export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}body{font-family:Figtree,sans-serif;background:#fff8f6;color:#1f1416;margin:0;-webkit-font-smoothing:antialiased;font-size:15px}
.top{background:#fff;border-bottom:1px solid #ffd0cd;padding:12px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;position:sticky;top:0;z-index:5}
.top img{height:30px}.top .mode{font-size:12px;background:#ffd0cd;border-radius:999px;padding:3px 10px;font-weight:600}
nav{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}nav a{color:#1f1416;text-decoration:none;font-weight:500;font-size:14px;padding:6px 12px;border-radius:999px}
nav a:hover{background:#fff8f6}nav a.on{background:#ed4c4c;color:#fff}
main{max-width:960px;margin:0 auto;padding:24px 20px 60px}h1{font-size:26px;margin:4px 0 6px;letter-spacing:-.02em}h2{font-size:16px;margin:0 0 12px}
.sub{color:#6b5557;margin:0 0 18px}.card{background:#fff;border:1px solid #ffd0cd;border-radius:16px;padding:18px;margin:0 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}.tile{display:block;text-decoration:none;color:inherit}.tile:hover{border-color:#ed4c4c}
.tile b{display:block;font-size:22px;margin-top:6px}.tile small{color:#6b5557}
table{width:100%;border-collapse:collapse}td,th{padding:10px 8px;border-bottom:1px solid #ffd0cd;text-align:left;font-size:14px;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b5557;font-weight:600}
td.r,th.r{text-align:right}.scroll{overflow-x:auto}
.btn,button{display:inline-block;background:#ed4c4c;color:#fff;border:0;border-radius:999px;padding:9px 16px;font:600 14px Figtree,sans-serif;cursor:pointer;text-decoration:none;margin:4px 6px 4px 0}
.btn.ghost{background:#fff;color:#ed4c4c;border:1px solid #ed4c4c}.btn.soft{background:#ffd0cd;color:#1f1416}
.pill{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;background:#ffd0cd;color:#1f1416}
.pill.ok{background:#1f1416;color:#fff}.pill.no{background:#ed4c4c;color:#fff}.pill.wait{background:#faa09a}
.blocked td:first-child{text-decoration:line-through;color:#6b5557}a{color:#ed4c4c}code{font-size:12px;background:#fff8f6;border-radius:6px;padding:1px 6px}
.empty{color:#6b5557;font-size:14px}pre{white-space:pre-wrap;font-size:12px;background:#fff8f6;border-radius:12px;padding:12px;max-height:320px;overflow:auto}
.rc{max-width:440px;margin:0 auto}.rc .amt{font-size:36px;font-weight:700;letter-spacing:-.03em}.rc .ln{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed #ffd0cd;font-size:14px}
.rc .ln.tot{border:0;font-weight:700;font-size:16px}.muted{color:#6b5557;font-size:13px}
@media(max-width:640px){main{padding:16px 12px 40px}nav{margin-left:0;width:100%;overflow-x:auto;flex-wrap:nowrap}h1{font-size:22px}td,th{padding:8px 6px;font-size:13px}.hide-m{display:none}}`;

const NAV: [string, string][] = [["/", "Chat"], ["/money", "Money"], ["/payments", "Payments"], ["/card", "Card"], ["/invoices", "Invoices"], ["/billing", "Billing"], ["/connect", "Connect"], ["/audit", "Audit"]];
export const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export const gbp = (n: any) => `£${Number(n || 0).toFixed(2)}`;
const when = (s: string) => (s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
export function layout(title: string, body: string, active = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Sally</title><style>${CSS}</style></head><body>
<div class="top"><a href="/"><img src="/heysalad-logo-black.svg" alt="HeySalad"></a><span class="mode">Stripe test mode</span><nav>${NAV.map(([h, l]) => `<a href="${h}"${h === active ? ' class="on"' : ""}>${l}</a>`).join("")}</nav></div><main>${body}</main></body></html>`;
}
// Stripe test-mode dashboard link for any object id.
export function dash(id: string, acct?: string) {
  const a = acct ? `/connect/accounts/${acct}` : "";
  const m: [RegExp, string][] = [[/^pi_/, "payments"], [/^in_/, "invoices"], [/^sub_/, "subscriptions"], [/^iauth_/, "issuing/authorizations"], [/^ic_/, "issuing/cards"], [/^acct_/, "connect/accounts"], [/^plink_/, "payment-links"], [/^cus_/, "customers"], [/^cs_/, "checkout/sessions"]];
  const hit = m.find(([r]) => r.test(id)); if (!hit) return "";
  return `https://dashboard.stripe.com${hit[1] === "connect/accounts" ? "" : a}/test/${hit[1]}/${id}`;
}
const obj = (id?: string, acct?: string) => (id ? `<a target=_blank href="${esc(dash(id, acct))}"><code>${esc(id)}</code></a>` : "");
const status = (s: string) => `<span class="pill ${/paid|succeeded|active|approved|sent|confirmed/.test(s) ? "ok" : /blocked|declined|failed|canceled/.test(s) ? "no" : "wait"}">${esc(String(s).replace(/_/g, " "))}</span>`;

// Every Stripe money movement attached to a record, flattened.
export function paymentsOf(r: any) {
  const s = r.stripe || {}, out: any[] = [];
  for (const [k, v] of Object.entries<any>(s)) if (v && typeof v === "object" && v.paymentIntent) out.push({ kind: k, pi: v.paymentIntent, amount: v.amount ?? r.total, status: v.status || r.status, receiptUrl: v.receiptUrl, invoiceId: v.invoiceId });
  if (s.paymentIntent) out.push({ kind: "checkout", pi: s.paymentIntent, amount: s.amountTotal ?? r.total, status: r.status, receiptUrl: s.receiptUrl, invoiceId: s.invoiceId });
  return out;
}
const records = () => memory.all();
const name = (r: any) => ({ restock: "Kitchen restock", shop: "Grocery shop", booking: "Booking deposit", invoice: "Supplier invoice", outinvoice: "Customer invoice", shoplist: "Shopping list" } as any)[r.demo] || "Grocery run";

function moneyPage() {
  const rs = records(), x = extraState();
  const pays = rs.flatMap(r => paymentsOf(r)), moved = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const invs = rs.filter(r => r.stripe?.invoice || r.stripe?.sent || r.stripe?.draft).length;
  const tiles = [["/payments", "Payments", `${pays.length} · ${gbp(moved)}`, "PaymentIntents and receipts"], ["/card", "Sally's card", x.card ? `•••• ${x.card.last4}` : "Not issued", `${(x.auths || []).length} authorisations`], ["/invoices", "Invoices", String(invs), "Supplier and customer"], ["/billing", "Billing", String((x.subs || []).length), "Sally Plus subscriptions"], ["/connect", "Connect", x.venue ? "Venue live" : "No venue", `${(x.venuePays || []).length} venue payments`], ["/audit", "Audit", String(rs.length), "Every pound, every clause"]];
  return layout("Money", `<h1>Money</h1><p class="sub">Everything Sally moved in Stripe test mode. Tap any tile.</p><div class="grid">${tiles.map(([h, t, b, s]) => `<a class="card tile" href="${h}"><small>${t}</small><b>${esc(b)}</b><small>${s}</small></a>`).join("")}</div>`, "/money");
}
function paymentsPage() {
  const rows = records().flatMap(r => paymentsOf(r).map(p => ({ r, p })));
  const spt = (extraState().spts || []).map((s: any) => `<tr><td>Shared token checkout<br><span class="muted">${when(s.at)}</span></td><td class="r">${gbp(s.amount)}</td><td>${status(s.status)}</td><td class="hide-m">${obj(s.paymentIntent)}</td><td></td></tr>`).join("");
  const body = rows.map(({ r, p }) => `<tr><td><a href="/r/${r.id}">${esc(name(r))}</a><br><span class="muted">${when(r.createdAt)} · ${esc(p.kind)}</span></td><td class="r">${gbp(p.amount)}</td><td>${status(p.status)}</td><td class="hide-m">${obj(p.pi)}</td><td><a class="btn soft" href="/receipt/${r.id}?pi=${esc(p.pi)}">Receipt</a></td></tr>`).join("");
  return layout("Payments", `<h1>Payments</h1><p class="sub">Every PaymentIntent Sally created, with its receipt.</p><div class="card scroll"><table><tr><th>What</th><th class="r">Amount</th><th>Status</th><th class="hide-m">Stripe</th><th></th></tr>${body + spt || `<tr><td colspan=5 class="empty">No payments yet. Ask Sally to restock in <a href="/">Chat</a>.</td></tr>`}</table></div>`, "/payments");
}
function receiptPage(r: any, pi?: string) {
  const p = paymentsOf(r).find(x => !pi || x.pi === pi) || paymentsOf(r)[0];
  const want = p?.kind === "auto" ? /^auto_paid$/ : p?.kind === "approved" ? /^human_approved$/ : /paid|approved|matched|requested|sent/;
  const lines = (r.decisions || []).filter((d: any) => want.test(d.status));
  const items = lines.map((d: any) => `<div class="ln"><span>${esc(d.name || d.item)}<br><span class="muted">${esc(d.clause)} · ${esc(String(d.status).replace(/_/g, " "))}</span></span><span>${gbp(d.price)}</span></div>`).join("");
  const inv = r.stripe?.invoice || r.stripe?.sent;
  return layout("Receipt", `<div class="rc"><p><a href="/r/${r.id}">← Record</a></p><div class="card"><img src="/heysalad-logo-black.svg" alt="HeySalad" style="height:26px"><p class="muted" style="margin:14px 0 2px">Receipt · ${esc(name(r))}</p><div class="amt">${gbp(p?.amount ?? r.total)}</div><p class="muted">${when(r.createdAt)} · paid by Sally ${status(p?.status || r.status)}</p>
${items}<div class="ln tot"><span>Total</span><span>${gbp(p?.amount ?? r.total)}</span></div>
<p class="muted">PaymentIntent ${obj(p?.pi)}${inv ? `<br>Invoice ${obj(inv.id)}` : ""}<br>Record <code>${esc(r.id)}</code></p>
${p?.receiptUrl ? `<a class="btn" target=_blank href="${esc(p.receiptUrl)}">Stripe receipt</a>` : ""}${p?.pi ? `<a class="btn ghost" target=_blank href="${esc(dash(p.pi))}">Open in Stripe</a>` : ""}${inv?.pdf ? `<a class="btn soft" target=_blank href="${esc(inv.pdf)}">PDF</a>` : ""}</div><p class="muted">Every line cites a clause in <a href="/policy">policy.md</a>. <a href="/audit">See the audit</a>.</p></div>`, "/payments");
}
function cardPage() {
  const x = extraState(), c = x.card;
  const auths = (x.auths || []).map((a: any) => `<tr><td>${esc(a.merchant || "Ocado")}<br><span class="muted">${esc((a.category || "").replace(/_/g, " "))} · ${when(a.at)}</span></td><td class="r">${gbp(a.amount)}</td><td>${status(a.approved ? "approved" : "declined")}</td><td>${esc(a.clause)} · ${esc(a.reason)}</td><td class="hide-m">${obj(a.authorization, c?.account)}</td></tr>`).join("");
  const head = c ? `<div class="card"><h2>Virtual card •••• ${esc(c.last4)} ${status(c.status || "active")}</h2><p class="muted">£50 per authorisation · £200 weekly · grocery and restaurants only</p><p>${obj(c.card, c.account)} ${obj(c.cardholder, c.account)}</p></div>` : `<div class="card"><p class="empty">No card yet.</p><button onclick="go('/api/issuing/card')">Issue Sally's card</button></div>`;
  return layout("Card", `<h1>Sally's card</h1><p class="sub">Stripe Issuing. The card itself enforces the policy, so Sally can't overspend.</p>${head}
<div class="card"><h2>Try to make Sally overspend</h2><button onclick="go('/api/issuing/test-auth',{amount:12})">£12 at Ocado</button><button class="ghost btn" onclick="go('/api/issuing/test-auth',{amount:80})">£80 at Ocado</button><button class="ghost btn" onclick="go('/api/issuing/test-auth',{amount:10,category:'package_stores_beer_wine_and_liquor'})">£10 at an off-licence</button></div>
<div class="card scroll"><h2>Authorisations</h2><table><tr><th>Merchant</th><th class="r">Amount</th><th>Result</th><th>Why</th><th class="hide-m">Stripe</th></tr>${auths || `<tr><td colspan=5 class="empty">None yet.</td></tr>`}</table></div>${GO}`, "/card");
}
const GO = `<script>async function go(u,b){document.body.style.opacity=.6;await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b||{})});location.reload()}</script>`;
function invoicesPage() {
  const rows = records().filter(r => r.stripe?.invoice || r.stripe?.sent || r.stripe?.draft || r.stripe?.invoiceId).map(r => {
    const i = r.stripe.invoice || r.stripe.sent || r.stripe.draft || { id: r.stripe.invoiceId, hostedUrl: r.stripe.invoiceUrl, pdf: r.stripe.invoicePdf };
    return `<tr><td><a href="/r/${r.id}">${esc(name(r))}</a><br><span class="muted">${esc(r.invoice?.number || r.outInvoice?.customer || "")} · ${when(r.createdAt)}</span></td><td class="r">${gbp(i.amount ?? r.total)}</td><td>${status(i.status || r.status)}</td><td class="hide-m">${obj(i.id)}</td><td>${i.hostedUrl ? `<a class="btn soft" target=_blank href="${esc(i.hostedUrl)}">Invoice</a>` : ""}${i.pdf ? `<a class="btn ghost" target=_blank href="${esc(i.pdf)}">PDF</a>` : ""}</td></tr>`;
  }).join("");
  return layout("Invoices", `<h1>Invoices</h1><p class="sub">Supplier bills Sally checked and paid, and customer invoices she drafted or sent.</p><div class="card scroll"><table><tr><th>Invoice</th><th class="r">Amount</th><th>Status</th><th class="hide-m">Stripe</th><th></th></tr>${rows || `<tr><td colspan=5 class="empty">No invoices yet. Say “pay the Bidfood invoice” in <a href="/">Chat</a>.</td></tr>`}</table></div>`, "/invoices");
}
function billingPage() {
  const subs = (extraState().subs || []).map((s: any) => `<tr><td>Sally Plus<br><span class="muted">${esc(s.email)} · ${when(s.at)}</span></td><td class="r">£9.00/mo</td><td>${status(s.status)}</td><td class="hide-m">${obj(s.subscription)}</td></tr>`).join("");
  return layout("Billing", `<h1>Billing</h1><p class="sub">Sally Plus, £9 a month, on Stripe Billing.</p><div class="card"><button onclick="go('/api/billing/subscribe')">Start a test subscription</button></div><div class="card scroll"><table><tr><th>Plan</th><th class="r">Price</th><th>Status</th><th class="hide-m">Stripe</th></tr>${subs || `<tr><td colspan=4 class="empty">No subscriptions yet.</td></tr>`}</table></div>${GO}`, "/billing");
}
function connectPage() {
  const x = extraState();
  const pays = (x.venuePays || []).map((p: any) => `<tr><td>Venue payment<br><span class="muted">${when(p.at)}</span></td><td class="r">${gbp(p.amount)}</td><td class="r">${gbp(p.fee)}</td><td>${status(p.status)}</td><td class="hide-m">${obj(p.paymentIntent)}</td></tr>`).join("");
  return layout("Connect", `<h1>Connect</h1><p class="sub">Sally pays a venue. The venue gets the money, HeySalad keeps a 5% fee.</p><div class="card"><h2>Venue ${x.venue ? obj(x.venue.account) : ""}</h2><button onclick="go('/api/connect/pay',{amount:60})">Pay venue £60</button></div><div class="card scroll"><table><tr><th>Payment</th><th class="r">Amount</th><th class="r">Fee</th><th>Status</th><th class="hide-m">Stripe</th></tr>${pays || `<tr><td colspan=5 class="empty">No venue payments yet.</td></tr>`}</table></div>${GO}`, "/connect");
}
export function auditPage() {
  const rs = records().filter((r: any) => r.demo || r.decisions?.length);
  const rows = rs.flatMap((r: any) => (r.decisions || []).filter((d: any) => d.price > 0).map((d: any) => `<tr class="${esc(d.status)}"><td>${esc(d.name || d.item)}<br><a class="muted" href="/r/${r.id}">${esc(name(r))}</a></td><td class="r">${gbp(d.price)}</td><td>${status(d.status)}</td><td><b>${esc(d.clause)}</b> <span class="hide-m">${esc(d.reason)}</span></td></tr>`)).join("");
  return layout("Audit", `<h1>Every pound</h1><p class="sub">Each line, its decision and the <a href="/policy">policy.md</a> clause behind it.</p><div class="card scroll"><table><tr><th>Line</th><th class="r">£</th><th>Decision</th><th>Clause</th></tr>${rows || `<tr><td colspan=4 class="empty">Nothing yet.</td></tr>`}</table></div>`, "/audit");
}
export function recordPage(r: any) {
  const rows = (r.decisions || []).map((d: any) => `<tr class="${esc(d.status)}"><td>${esc(d.name || d.item)}${d.supplier ? ` <span class="pill">${esc(d.supplier)}</span>` : ""}</td><td class="r">${gbp(d.price)}</td><td>${status(d.status)}</td><td>${esc(d.clause)}</td><td><a href="#" onclick="why(${esc(JSON.stringify(d.sku || d.name || d.item))});return false">Why?</a></td></tr>`).join("");
  const pays = paymentsOf(r), inv = r.stripe?.invoice || r.stripe?.sent;
  const act = r.status === "awaiting_human" ? `<form method="post" action="/r/${r.id}/approve" class="card"><p>Sally stopped: something needs a human (see the flagged lines).</p><button>Approve &amp; pay</button></form>` : "";
  const dinr = r.status === "awaiting_diner" && r.stripe?.paymentLink ? `<div class="card"><p>Send this to the diner (test card 4242 4242 4242 4242):</p><a class="btn" target=_blank href="${esc(r.stripe.paymentLink.url)}">Pay ${gbp(r.total)} deposit</a><a class="btn ghost" href="/r/${r.id}/paid">Check payment</a></div>` : "";
  const money = `${pays.map(p => `<a class="btn" href="/receipt/${r.id}?pi=${esc(p.pi)}">Receipt ${gbp(p.amount)}</a>`).join("")}${inv?.hostedUrl ? `<a class="btn soft" target=_blank href="${esc(inv.hostedUrl)}">Stripe invoice</a>` : ""}${r.stripe?.paymentLink ? `<a class="btn soft" target=_blank href="${esc(r.stripe.paymentLink.url)}">Payment link</a>` : ""}`;
  return layout(r.id, `<h1>${esc(name(r))} · ${gbp(r.total)} ${status(r.status)}</h1><p class="sub">“${esc(r.request)}” · ${when(r.createdAt)}</p>
<div class="card">${money || `<span class="empty">No Stripe object yet.</span>`}</div>${act}${dinr}
<div class="card scroll"><table><tr><th>Line</th><th class="r">£</th><th>Decision</th><th>Clause</th><th></th></tr>${rows}</table><p id="w" class="muted"></p></div>
<div class="card"><h2>Audit trail</h2><pre>${esc(JSON.stringify(r.audit, null, 2))}</pre></div>
<script>async function why(q){const j=await (await fetch('/r/${r.id}/why?q='+encodeURIComponent(q))).json();w.textContent='Sally: '+j.answer}</script>`, "/payments");
}

export function mountUi(app: Express) {
  app.get("/money", (_q, res) => res.send(moneyPage()));
  app.get("/payments", (_q, res) => res.send(paymentsPage()));
  app.get("/receipt/:id", (q, res) => { const r = memory.get(q.params.id); r ? res.send(receiptPage(r, q.query.pi ? String(q.query.pi) : undefined)) : res.status(404).send(layout("Not found", "<h1>Not found</h1>")); });
  app.get("/card", (_q, res) => res.send(cardPage()));
  app.get("/invoices", (_q, res) => res.send(invoicesPage()));
  app.get("/billing", (_q, res) => res.send(billingPage()));
  app.get("/connect", (_q, res) => res.send(connectPage()));
}
