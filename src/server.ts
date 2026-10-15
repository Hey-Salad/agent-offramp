import "dotenv/config";
import express from "express";
import Stripe from "stripe";
import crypto from "node:crypto";
import fs from "node:fs";
import { decide, POLICY } from "./policy.js";
import { memory } from "./memory.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const key = process.env.STRIPE_SECRET_KEY || "";
if (key && !key.startsWith("sk_test_")) throw new Error("Off-Ramp only runs with Stripe TEST keys (sk_test_...)");
const stripe = key ? new Stripe(key) : null;
const now = () => new Date().toISOString();
const gbp = (n: number) => `£${n.toFixed(2)}`;
const log = (r: any, event: string, data: any = {}) => { r.audit.push({ at: now(), event, ...data }); memory.save(r); };

app.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const ev = secret && stripe ? stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] as string, secret) : JSON.parse(req.body.toString());
    if (ev.type === "checkout.session.completed") await markPaid(ev.data.object.id, "webhook");
    res.json({ received: true });
  } catch (e: any) { res.status(400).send(e.message); }
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function createRun(text: string, channel: string, from = "demo") {
  const d = decide(text);
  const r = { id: "or_" + crypto.randomBytes(5).toString("hex"), createdAt: now(), agent: "Sally", channel, from, request: text, policyVersion: "v1", policy: POLICY, ...d, status: "awaiting_human", approver: null as any, stripe: {} as any, audit: [] as any[] };
  r.audit.push({ at: now(), event: "request_received", channel, text });
  r.audit.push({ at: now(), event: "basket_built", approved: d.decisions.filter(x => x.status === "approved").length, blocked: d.decisions.filter(x => x.status === "blocked").length, needs_approval: d.decisions.filter(x => x.status === "needs_approval").length, total: d.total });
  r.audit.push({ at: now(), event: "off_ramp", note: "Sally stopped. Policy P6: agent cannot move money; human approval page created.", url: `${BASE}/approve/${r.id}` });
  memory.save(r);
  return r;
}
async function sms(to: string, body: string) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_FROM: from } = process.env;
  if (!sid || !tok || !from || !to || to === "demo") return false;
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64") }, body: new URLSearchParams({ To: to, From: from, Body: body }) });
  return r.ok;
}
const summary = (r: any) => `Sally built your basket: ${gbp(r.total)} of ${gbp(r.cap)}. ${r.decisions.filter((x: any) => x.status !== "approved").length} items blocked/flagged. Approve & pay: ${BASE}/approve/${r.id}`;

// 1) Triggers
app.post("/simulate", async (req, res) => {
  const r = createRun(req.body.text || "Weekly shop under £40, no nuts", "simulate", req.body.from);
  if (req.body.from) await sms(req.body.from, summary(r));
  res.json({ id: r.id, approveUrl: `${BASE}/approve/${r.id}`, total: r.total, cap: r.cap, decisions: r.decisions });
});
app.post("/twilio/sms", async (req, res) => {
  const r = createRun(req.body.Body || "", "sms", req.body.From);
  res.type("text/xml").send(`<Response><Message>${summary(r)}</Message></Response>`);
});
app.post("/twilio/voice", (_req, res) => {
  res.type("text/xml").send(`<Response><Gather input="speech" action="/twilio/voice/result" speechTimeout="auto"><Say voice="Polly.Amy">Hi, it's Sally from HeySalad. What should I shop for?</Say></Gather></Response>`);
});
app.post("/twilio/voice/result", async (req, res) => {
  const r = createRun(req.body.SpeechResult || "weekly shop under 40 pounds", "voice", req.body.From);
  await sms(req.body.From, summary(r));
  res.type("text/xml").send(`<Response><Say voice="Polly.Amy">Done. Your basket is ${r.total.toFixed(2)} pounds of a ${r.cap} pound cap. I blocked ${r.decisions.filter((x: any) => x.status === "blocked").length} items under your policy. I've texted you a link to approve and pay. I never pay without you.</Say></Response>`);
});

// 2) Off-ramp: human approval
app.get("/approve/:id", (req, res) => {
  const r = memory.get(req.params.id);
  if (!r) return res.status(404).send("Not found");
  res.send(page(r));
});
app.post("/approve/:id", async (req, res) => {
  const r = memory.get(req.params.id);
  if (!r) return res.status(404).send("Not found");
  if (!stripe) return res.status(500).send("STRIPE_SECRET_KEY (sk_test_) not set");
  const extra = ([] as string[]).concat(req.body.extra || []);
  for (const d of r.decisions) if (d.status === "needs_approval" && extra.includes(d.sku)) { d.status = "approved"; d.clause = "P2"; d.reason += " — approved by human"; }
  const lines = r.decisions.filter((d: any) => d.status === "approved");
  r.total = Math.round(lines.reduce((s: number, d: any) => s + d.price, 0) * 100) / 100;
  r.approver = { name: req.body.approver || "Peter", at: now(), extraApproved: extra };
  log(r, "human_approved", { approver: r.approver.name, total: r.total, extraApproved: extra });
  const session = await stripe.checkout.sessions.create({
    mode: "payment", currency: "gbp",
    line_items: lines.map((d: any) => ({ quantity: 1, price_data: { currency: "gbp", unit_amount: Math.round(d.price * 100), product_data: { name: d.item, metadata: { sku: d.sku, clause: d.clause } } } })),
    invoice_creation: { enabled: true, invoice_data: { description: `Sally Off-Ramp ${r.id}`, metadata: { offramp_id: r.id }, footer: `Audit trail: ${BASE}/api/records/${r.id}` } },
    metadata: { offramp_id: r.id, agent: "Sally", approver: r.approver.name, policy: "v1" },
    payment_intent_data: { metadata: { offramp_id: r.id }, description: `Sally Off-Ramp ${r.id}` },
    success_url: `${BASE}/paid/${r.id}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${BASE}/approve/${r.id}`,
  });
  r.stripe.checkoutSessionId = session.id;
  log(r, "checkout_session_created", { session: session.id });
  res.redirect(303, session.url!);
});
async function markPaid(sessionId: string, via: string) {
  if (!stripe) return;
  const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge", "invoice"] });
  const r = memory.get(s.metadata?.offramp_id || "");
  if (!r || r.status === "paid" || s.payment_status !== "paid") return r;
  const pi: any = s.payment_intent, inv: any = s.invoice;
  r.status = "paid";
  r.stripe = { ...r.stripe, paymentIntent: pi?.id, chargeId: pi?.latest_charge?.id, receiptUrl: pi?.latest_charge?.receipt_url, invoiceId: inv?.id, invoiceUrl: inv?.hosted_invoice_url, invoicePdf: inv?.invoice_pdf, amountTotal: (s.amount_total || 0) / 100 };
  log(r, "payment_succeeded", { via, ...r.stripe });
  return r;
}
app.get("/paid/:id", async (req, res) => {
  if (req.query.session_id) await markPaid(String(req.query.session_id), "redirect");
  res.redirect(`/approve/${req.params.id}`);
});

// 3) Explain every pound
app.get("/api/records", (_q, res) => res.json(memory.all()));
app.get("/api/records/:id", (req, res) => res.json(memory.get(req.params.id) || { error: "not found" }));
app.get("/why/:id", (req, res) => {
  const r = memory.get(req.params.id);
  if (!r) return res.status(404).json({ error: "not found" });
  const q = String(req.query.sku || req.query.q || "").toLowerCase();
  const d = r.decisions.find((x: any) => x.sku.toLowerCase() === q || x.item.toLowerCase().includes(q));
  if (d) return res.json({ answer: `${d.item} (${gbp(d.price)}) was ${d.status.replace("_", " ")} under clause ${d.clause}: ${d.reason}.${r.approver ? ` Payment approved by ${r.approver.name} at ${r.approver.at}.` : ""}`, decision: d, policy: "policy.md" });
  res.json({ answer: `Sally spent ${gbp(r.total)} of a ${gbp(r.cap)} cap on ${r.decisions.filter((x: any) => x.status === "approved").length} items. Status: ${r.status}. ${r.approver ? `Approved by ${r.approver.name}.` : "Awaiting human approval."} ${r.stripe.paymentIntent ? `Stripe PaymentIntent ${r.stripe.paymentIntent}, invoice ${r.stripe.invoiceId}.` : ""}`, audit: r.audit });
});
app.get("/policy", (_q, res) => res.type("text/plain").send(fs.readFileSync("policy.md", "utf8")));
app.get("/", (_q, res) => res.send(home()));
app.post("/", (req, res) => { const r = createRun(req.body.text, "web"); res.redirect(`/approve/${r.id}`); });

const css = `body{font-family:system-ui;background:#fff8f6;color:#1f1416;max-width:860px;margin:auto;padding:24px}h1{color:#ed4c4c}.card{background:#fff;border:2px solid #faa09a;border-radius:14px;padding:16px;margin:12px 0}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #faa09a;text-align:left;font-size:14px}.approved{color:#1f1416}.blocked{color:#ed4c4c;text-decoration:line-through}.needs_approval{color:#b8573f}button,.btn{background:#ed4c4c;color:#fff8f6;border:0;border-radius:10px;padding:12px 20px;font-size:16px;cursor:pointer;text-decoration:none}.bar{height:14px;background:#faa09a;border-radius:7px}.fill{height:14px;background:#ed4c4c;border-radius:7px}pre{white-space:pre-wrap;font-size:12px}a{color:#ed4c4c}input[type=text]{width:70%;padding:10px;border:2px solid #faa09a;border-radius:8px}`;
const esc = (s: any) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
function home() {
  return `<!doctype html><title>Off-Ramp</title><style>${css}</style><h1>🥗 Off-Ramp</h1><p>Agents shop. Humans pay. Every pound explained.</p>
<div class="card"><form method="post"><input type="text" name="text" value="Weekly shop under £40, no nuts"> <button>Ask Sally</button></form><p>Or call/text <b>+44 7458 905645</b>.</p></div>
<div class="card"><h3>Recent runs</h3>${memory.all().slice(0, 10).map((r: any) => `<div><a href="/approve/${r.id}">${r.id}</a> — ${esc(r.request)} — ${gbp(r.total)} — <b>${r.status}</b></div>`).join("")}</div><p><a href="/policy">policy.md</a></p>`;
}
function page(r: any) {
  const pct = Math.min(100, (r.total / r.cap) * 100);
  const rows = r.decisions.map((d: any) => `<tr class="${d.status}"><td>${d.status === "needs_approval" && r.status !== "paid" ? `<input type="checkbox" name="extra" value="${d.sku}" form="ap">` : ""}</td><td>${esc(d.item)}</td><td>${gbp(d.price)}</td><td>${d.status.replace("_", " ")}</td><td>${d.clause}</td><td><a href="#" onclick="why('${d.sku}');return false">Why?</a></td></tr>`).join("");
  const paid = r.status === "paid" ? `<div class="card"><h2>✅ Paid ${gbp(r.stripe.amountTotal)}</h2><p>Approved by <b>${esc(r.approver?.name)}</b> at ${r.approver?.at}</p><p>PaymentIntent: <code>${r.stripe.paymentIntent}</code><br>Invoice: <a href="${r.stripe.invoiceUrl}" target=_blank>${r.stripe.invoiceId}</a> (<a href="${r.stripe.invoicePdf}">PDF</a>)<br>Receipt: <a href="${r.stripe.receiptUrl}" target=_blank>view</a></p></div>`
    : `<form id="ap" method="post" class="card"><p>Sally has stopped. She can't pay — you can.</p>Approver: <input type="text" name="approver" value="Peter" style="width:200px"> <button>Approve &amp; pay with Stripe</button><p style="font-size:12px">Tick flagged (P2) items above to include them. Test card 4242 4242 4242 4242.</p></form>`;
  return `<!doctype html><title>Approve ${r.id}</title><style>${css}</style><h1>Sally needs your OK</h1>
<div class="card"><b>Request</b> (${r.channel}): “${esc(r.request)}”<br>Allergen rules: ${r.allergens.join(", ") || "none"}<p>${gbp(r.total)} of ${gbp(r.cap)} weekly cap</p><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>
<div class="card"><table><tr><th></th><th>Item</th><th>Price</th><th>Decision</th><th>Clause</th><th></th></tr>${rows}</table><p id="why" style="background:#fff8f6;padding:8px"></p></div>
${paid}<div class="card"><h3>Audit trail</h3><pre>${esc(JSON.stringify(r.audit, null, 2))}</pre><a href="/api/records/${r.id}">full JSON</a> · <a href="/why/${r.id}">why did you pay this?</a> · <a href="/policy">policy</a></div>
<script>async function why(s){const j=await (await fetch('/why/${r.id}?sku='+s)).json();document.getElementById('why').textContent='Sally: '+j.answer+' Evidence: '+j.decision.evidence}</script>`;
}
app.listen(PORT, () => console.log(`Off-Ramp on ${BASE} (stripe: ${stripe ? "test" : "MISSING KEY"})`));
