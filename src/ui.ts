// Shared HeySalad UI for every page: one layout, one stylesheet, one left side nav.
// Brand: Cherry #ed4c4c, Peach #faa09a, Light Peach #ffd0cd, Cream #fff8f6, ink #1f1416. Figtree only.
import type { Express } from "express";
import { memory } from "./memory.js";
import { extraState, stripeX, stripeI } from "./stripe-extra.js";

// Left side nav shell (Linear/Vercel style). Mobile: CSS-only drawer (checkbox toggle), no bottom tab bar.
const I = (d: string) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON: Record<string, string> = {
  "/": I('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  "/money": I('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'),
  "/payments": I('<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
  "/card": I('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'),
  "/invoices": I('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>'),
  "/billing": I('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  "/connect": I('<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.6 8.6l6.8 6.8M18 9v-3a2 2 0 0 0-2-2h-3M6 15v3a2 2 0 0 0 2 2h3"/>'),
  "/audit": I('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>'),
};
export const NAV: [string, [string, string][]][] = [
  ["", [["/", "Chat"]]],
  ["Money", [["/money", "Overview"], ["/payments", "Payments"], ["/card", "Card"], ["/invoices", "Invoices"]]],
  ["Platform", [["/billing", "Billing"], ["/connect", "Connect"]]],
  ["", [["/audit", "Audit"]]],
];
export const SHELL_CSS = `.sb{position:fixed;top:0;left:0;bottom:0;width:232px;background:#fff;border-right:1px solid #ffd0cd;display:flex;flex-direction:column;padding:18px 12px;z-index:40;font-family:Figtree,sans-serif;transition:transform .25s ease}
.sb .brand{display:flex;align-items:center;gap:10px;padding:2px 10px 18px;text-decoration:none;color:#1f1416}.sb .brand img{height:24px;width:auto}.sb .brand b{font-size:15px;font-weight:700;letter-spacing:-.01em;padding-left:10px;border-left:1px solid #ffd0cd}
.sb .tl{text-transform:none;letter-spacing:0;margin:-8px 10px 8px;font-size:12px;line-height:1.35;color:#6b5557}.sb .grp{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6b5557;padding:14px 12px 6px}
.sb a.it{display:flex;align-items:center;gap:10px;padding:8px 12px;margin:1px 0;border-radius:10px;color:#1f1416;text-decoration:none;font-size:14px;font-weight:500;border-left:3px solid transparent}
.sb a.it:hover{background:#fff8f6}.sb a.it.on{background:#ffd0cd;color:#ed4c4c;border-left-color:#ed4c4c;font-weight:600}
.sb .foot{margin-top:auto;padding:12px}.sb .tm{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;background:#fff8f6;border:1px solid #ffd0cd;color:#1f1416;border-radius:999px;padding:4px 12px}.sb .tm i{width:7px;height:7px;border-radius:50%;background:#ed4c4c}
body.shell{padding-left:232px}.mbar,.nav-t,.scrim{display:none}
@media(max-width:767px){body.shell{padding-left:0;padding-top:52px}.sb{transform:translateX(-100%);box-shadow:none}
.mbar{display:flex;position:fixed;top:0;left:0;right:0;height:52px;background:#fff;border-bottom:1px solid #ffd0cd;align-items:center;gap:12px;padding:0 14px;z-index:35}
.mbar label{display:grid;place-items:center;width:36px;height:36px;border-radius:999px;cursor:pointer;color:#1f1416}.mbar img{height:22px}.mbar b{font-size:15px}
.nav-t:checked~.sb{transform:none;box-shadow:12px 0 40px rgba(31,20,22,.12)}.nav-t:checked~.scrim{display:block;position:fixed;inset:0;background:rgba(31,20,22,.35);z-index:39}}`;
export function sidebar(active = "") {
  const items = NAV.map(([g, xs]) => (g ? `<div class="grp">${g}</div>` : "") + xs.map(([h, l]) => `<a class="it${h === active ? " on" : ""}" href="${h}"${h === active ? ' aria-current="page"' : ""}>${ICON[h]}<span>${l}</span></a>`).join("")).join("");
  return `<input type="checkbox" id="nav-t" class="nav-t" aria-label="Menu"><div class="mbar"><label for="nav-t" aria-label="Open menu">${I('<path d="M4 6h16M4 12h16M4 18h16"/>')}</label><img src="/heysalad-logo-black.svg" alt="HeySalad"><b>Agent 9</b></div>
<nav class="sb" aria-label="Main"><a class="brand" href="/"><img src="/heysalad-logo-black.svg" alt="HeySalad"><b>Agent 9</b></a><p class="tl">Give your agent a financial operating system.</p>${items}<div class="foot"><span class="tm"><i></i>Test mode</span></div></nav><label class="scrim" for="nav-t" aria-label="Close menu"></label>`;
}


// ---- Shared components: content header (logo top right), Stripe output panel, Briefcase slot ----
export const COMP_CSS = `.ph{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px}.ph .crumb{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6b5557}.ph img{height:26px;width:auto}
.so{padding:0;overflow:hidden}.so>summary{list-style:none;cursor:pointer;padding:14px 18px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px}.so>summary::-webkit-details-marker{display:none}
.so>summary:before{content:'';width:8px;height:8px;border-right:2px solid #ed4c4c;border-bottom:2px solid #ed4c4c;transform:rotate(-45deg);transition:transform .2s}.so[open]>summary:before{transform:rotate(45deg)}.so>summary .n{margin-left:auto}
.so .ob{border-top:1px solid #ffd0cd;padding:12px 18px}.so .oh{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}.so .oh b{font-size:13px}.so .oh .sp{flex:1}
.so .pl{display:inline-block;border-radius:999px;padding:4px 12px;font:600 12px Figtree,sans-serif;border:1px solid #ed4c4c;color:#ed4c4c;background:#fff;cursor:pointer;text-decoration:none}.so .pl:hover{background:#ed4c4c;color:#fff}
.so pre.j{margin:0;background:#fff8f6;border-radius:12px;padding:12px;max-height:360px;overflow:auto;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#1f1416}
.j .k{color:#ed4c4c;font-weight:600}.j .s{color:#1f1416}.j .x{color:#6b5557;font-style:italic}.j .m{color:#6b5557}
.so.mini{border:0;background:none;margin:6px 0 0;border-radius:12px}.so.mini>summary{padding:4px 0;font-size:12px;color:#ed4c4c}.so.mini .ob{padding:8px 0}
.bc{border:1px dashed #faa09a;background:#fff}.bc h2{display:flex;align-items:center;gap:8px}.bc table{width:100%;border-collapse:collapse}.bc td,.bc th{padding:8px 6px;border-bottom:1px solid #ffd0cd;text-align:left;font-size:13px;vertical-align:top}.bc th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b5557;font-weight:600}.bc td.r,.bc th.r{text-align:right}.bc code{font-size:11px;word-break:break-all}.bcw{margin:0 0 6px}.bcw>summary{cursor:pointer;font-weight:600;font-size:14px;padding:6px 0;color:#1f1416}.bcw .bc{margin-top:8px}.bc .ph2{color:#6b5557;font-size:14px;margin:0 0 10px}.bc h2 .pill{margin-left:6px}.so .pl:disabled,.bc .pl:disabled{opacity:.5;cursor:not-allowed}.bc .pl{display:inline-block;border-radius:999px;padding:4px 12px;font:600 12px Figtree,sans-serif;border:1px solid #ed4c4c;color:#ed4c4c;background:#fff;cursor:pointer;margin:0;white-space:nowrap}`;
export function pageHead(title: string) { return `<div class="ph"><span class="crumb">${esc(title)}</span><img src="/heysalad-logo-black.svg" alt="HeySalad"></div>`; }
export type SRef = { id?: string; acct?: string; label?: string };
// Collapsible "Stripe output": real objects fetched (on open) from /api/stripe/:id, secrets redacted server-side.
export function stripeOutput(refs: SRef[], opts: { mini?: boolean; title?: string } = {}) {
  const rs = refs.filter(r => r.id && /^(pi|in|sub|iauth|ic|ich|acct|tr|ch|cs|plink|cus)_/.test(r.id)).slice(0, 12);
  if (!rs.length) return opts.mini ? "" : `<details class="card so"><summary>${esc(opts.title || "Stripe output")}<span class="n muted">no Stripe object yet</span></summary></details>`;
  return `<details class="${opts.mini ? "so mini" : "card so"}"><summary>${esc(opts.title || "Stripe output")}<span class="n muted">${rs.length} object${rs.length > 1 ? "s" : ""}</span></summary>${rs.map(r => `<div class="ob" data-sid="${esc(r.id)}" data-acct="${esc(r.acct || "")}"><div class="oh"><b>${esc(r.label || "")}</b> <code>${esc(r.id)}</code><span class="sp"></span><button type="button" class="pl" data-copy>Copy</button><a class="pl" target=_blank href="${esc(dash(r.id!, r.acct))}">Open in Stripe</a></div><pre class="j">Open to load…</pre></div>`).join("")}</details>`;
}
export const SO_JS = `<script>(()=>{const e=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const tint=o=>e(JSON.stringify(o,null,2)).replace(/("(?:\\\\.|[^"\\\\])*")(\\s*:)?|\\b(true|false|null)\\b|-?\\b\\d+(?:\\.\\d+)?\\b/g,(m,str,col,kw)=>str?(col?'<span class="k">'+str+'</span>'+col:'<span class="s">'+str+'</span>'):'<span class="x">'+m+'</span>');
async function load(ob){if(ob.dataset.done)return;ob.dataset.done=1;const pre=ob.querySelector('pre');pre.textContent='Loading from Stripe…';
try{const j=await (await fetch('/api/stripe/'+encodeURIComponent(ob.dataset.sid)+(ob.dataset.acct?'?acct='+encodeURIComponent(ob.dataset.acct):''))).json();ob._j=j;
if(j.error){pre.innerHTML='<span class="x">'+e(j.error)+'</span>';return}
pre.innerHTML=j.objects.map(o=>'<span class="m">// '+e(o.object||'object')+'</span>\\n'+tint(o)).join('\\n\\n')}catch(x){pre.textContent='Could not load: '+x}}
document.addEventListener('toggle',ev=>{const d=ev.target;if(d.matches&&d.matches('details.so')&&d.open)d.querySelectorAll(':scope>.ob').forEach(load)},true);
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-copy]');if(!b)return;const ob=b.closest('.ob');const t=ob._j?JSON.stringify(ob._j.objects,null,2):ob.dataset.sid;navigator.clipboard.writeText(t).then(()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1200)})});})()</script>`;
// ---- Briefcase (briefcase.so): UK AI-native accounting ledger, MCP at https://api.briefcase.so/mcp (OAuth; write tools need user approval; never moves money) ----
export const briefcaseConnected = () => !!process.env.BRIEFCASE_MCP_TOKEN;
const CAT: Record<string, [string, string]> = { restock: ["Kitchen supplies", "0% (food, zero-rated)"], shop: ["Groceries", "0% (food, zero-rated)"], booking: ["Deposit income", "20% standard"], invoice: ["Supplier bill", "20% standard"], outinvoice: ["Sales invoice", "20% standard"], shoplist: ["Groceries", "0% (food, zero-rated)"] };
export type BEntry = { rid: string; pi?: string; doc: string; supplier: string; category: string; vat: string; amount: number; status: "Draft" | "To review" | "Published" };
export function bookEntries(r: any): BEntry[] {
  const [category, vat] = CAT[r.demo] || ["Groceries", "0% (food, zero-rated)"];
  const sup = (r.decisions || []).find((d: any) => d.supplier)?.supplier || ({ shop: "Ocado", restock: "Waitrose", booking: "Diner", invoice: "Bidfood" } as any)[r.demo] || "Supplier";
  return paymentsOf(r).map(p => ({ rid: r.id, pi: p.pi, doc: `Stripe receipt ${p.pi}`, supplier: sup, category, vat, amount: Number(p.amount || 0), status: (r.briefcase?.[p.pi]?.status) || (/paid|succeeded|approved/.test(String(p.status)) ? "To review" : "Draft") }));
}
// Stub: real MCP calls come later.
export async function sendToBriefcase(e: BEntry): Promise<{ ok: boolean; error?: string }> {
  if (!briefcaseConnected()) return { ok: false, error: "Briefcase not connected (BRIEFCASE_MCP_TOKEN missing)" };
  // TODO: briefcase_create_document_upload: upload the Stripe receipt (e.doc) and get an upload id.
  // TODO: briefcase_submit_document: submit it with supplier, category, VAT and amount (user approves the write in Briefcase).
  // TODO: briefcase_get_transaction: read back the booked transaction and store its status (Draft / To review / Published) on the record.
  return { ok: false, error: "Not implemented yet" };
}
// Shared "Booked in Briefcase" panel, same on every page.
export function briefcase(entries: BEntry[] = [], note = "") {
  const on = briefcaseConnected();
  const rows = entries.slice(0, 20).map(e => `<tr><td><code>${esc(e.doc)}</code></td><td>${esc(e.supplier)}</td><td>${esc(e.category)}</td><td class="r">${gbp(e.amount)}</td><td>${esc(e.vat)}</td><td><span class="pill ${e.status === "Published" ? "ok" : "wait"}">${e.status}</span></td><td>${on ? `<button class="pl" onclick="fetch('/api/briefcase/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rid:'${esc(e.rid)}',pi:'${esc(e.pi || "")}'})}).then(r=>r.json()).then(j=>this.textContent=j.ok?'Sent':'Not sent')">Send to Briefcase</button>` : `<button class="pl" disabled title="Preview, not connected">Send to Briefcase</button>`}</td></tr>`).join("");
  return `<section class="card bc" id="briefcase" aria-label="Booked in Briefcase"><h2>${I('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>')}Booked in Briefcase <span class="pill ${on ? "ok" : ""}">${on ? "Connected" : "Preview, not connected"}</span></h2>
<p class="ph2">What each payment would book in <a target=_blank href="https://briefcase.so">Briefcase</a>, the UK accounting ledger. ${on ? "Every write needs your approval in Briefcase." : "Nothing is sent until Briefcase is connected."}${note ? " " + esc(note) : ""}</p>
${rows ? `<div class="scroll"><table><tr><th>Document</th><th>Supplier</th><th>Category</th><th class="r">Amount</th><th>VAT</th><th>Status</th><th></th></tr>${rows}</table></div>` : `<p class="empty">Nothing to book on this page.</p>`}</section>`;
}

export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');${SHELL_CSS}${COMP_CSS}
*{box-sizing:border-box}body{font-family:Figtree,sans-serif;background:#fff8f6;color:#1f1416;margin:0;-webkit-font-smoothing:antialiased;font-size:15px}
main{max-width:1100px;margin:0 auto;padding:24px 20px 60px}h1{font-size:26px;margin:4px 0 6px;letter-spacing:-.02em}h2{font-size:16px;margin:0 0 12px}
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
@media(max-width:640px){main{padding:16px 12px 40px}h1{font-size:22px}td,th{padding:8px 6px;font-size:13px}.hide-m{display:none}}`;

export const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export const gbp = (n: any) => `£${Number(n || 0).toFixed(2)}`;
const when = (s: string) => (s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
export function layout(title: string, body: string, active = "", books: BEntry[] = []) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Agent 9</title><style>${CSS}</style></head><body class="shell">
${sidebar(active)}<main>${pageHead(title)}${body}${briefcase(books)}</main>${SO_JS}</body></html>`;
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
  const tiles = [["/payments", "Payments", `${pays.length} · ${gbp(moved)}`, "Payment Intents and receipts"], ["/card", "Sally's card", x.card ? `•••• ${x.card.last4}` : "Not issued", `${(x.auths || []).length} authorisations`], ["/invoices", "Invoices", String(invs), "Supplier and customer"], ["/billing", "Billing", String((x.subs || []).length), "Sally Plus subscriptions"], ["/connect", "Connect", x.venue ? "Venue live" : "No venue", `${(x.venuePays || []).length} venue payments`], ["/audit", "Audit", String(rs.length), "Every pound, every clause"]];
  return layout("Money", `<h1>Money</h1><p class="sub">Everything Sally moved in Stripe test mode. Tap any tile.</p><div class="grid"><a class="card tile" href="#briefcase"><small>Books</small><b>${briefcaseConnected() ? "Briefcase" : "Preview"}</b><small>Booked in Briefcase ↓</small></a>${tiles.map(([h, t, b, s]) => `<a class="card tile" href="${h}"><small>${t}</small><b>${esc(b)}</b><small>${s}</small></a>`).join("")}</div>${stripeOutput([{ id: x.card?.card, acct: x.card?.account, label: "Issuing card" }, { id: pays[0]?.pi, label: "Latest Payment Intent" }, { id: (x.subs || [])[0]?.subscription, label: "Latest subscription" }, { id: x.venue?.account, label: "Venue account" }])}<div></div>`, "/money", records().flatMap(bookEntries));
}
function paymentsPage() {
  const rows = records().flatMap(r => paymentsOf(r).map(p => ({ r, p })));
  const spt = (extraState().spts || []).map((s: any) => `<tr><td>Shared token checkout<br><span class="muted">${when(s.at)}</span></td><td class="r">${gbp(s.amount)}</td><td>${status(s.status)}</td><td class="hide-m">${obj(s.paymentIntent)}</td><td></td></tr>`).join("");
  const body = rows.map(({ r, p }) => `<tr><td><a href="/r/${r.id}">${esc(name(r))}</a><br><span class="muted">${when(r.createdAt)} · ${esc(p.kind)}</span></td><td class="r">${gbp(p.amount)}</td><td>${status(p.status)}</td><td class="hide-m">${obj(p.pi)}</td><td><a class="btn soft" href="/receipt/${r.id}?pi=${esc(p.pi)}">Receipt</a></td></tr>`).join("");
  return layout("Payments", `<h1>Payments</h1><p class="sub">Every Payment Intent Sally created, with its receipt.</p><div class="card scroll"><table><tr><th>What</th><th class="r">Amount</th><th>Status</th><th class="hide-m">Stripe</th><th></th></tr>${body + spt || `<tr><td colspan=5 class="empty">No payments yet. Ask Sally to restock in <a href="/">Chat</a>.</td></tr>`}</table></div>${stripeOutput([...rows.map(({ p }) => ({ id: p.pi, label: "Payment Intent" })), ...(extraState().spts || []).map((x: any) => ({ id: x.paymentIntent, label: "Payment Intent (shared token)" }))])}`, "/payments", records().flatMap(bookEntries));
}
function receiptPage(r: any, pi?: string) {
  const p = paymentsOf(r).find(x => !pi || x.pi === pi) || paymentsOf(r)[0];
  const want = p?.kind === "auto" ? /^auto_paid$/ : p?.kind === "approved" ? /^human_approved$/ : /paid|approved|matched|requested|sent/;
  const lines = (r.decisions || []).filter((d: any) => want.test(d.status));
  const items = lines.map((d: any) => `<div class="ln"><span>${esc(d.name || d.item)}<br><span class="muted">${esc(d.clause)} · ${esc(String(d.status).replace(/_/g, " "))}</span></span><span>${gbp(d.price)}</span></div>`).join("");
  const inv = r.stripe?.invoice || r.stripe?.sent;
  return layout("Receipt", `<div class="rc"><p><a href="/r/${r.id}">← Record</a></p><div class="card"><img src="/heysalad-logo-black.svg" alt="HeySalad" style="height:26px"><p class="muted" style="margin:14px 0 2px">Receipt · ${esc(name(r))}</p><div class="amt">${gbp(p?.amount ?? r.total)}</div><p class="muted">${when(r.createdAt)} · paid by Sally ${status(p?.status || r.status)}</p>
${items}<div class="ln tot"><span>Total</span><span>${gbp(p?.amount ?? r.total)}</span></div>
<p class="muted">Payment Intent ${obj(p?.pi)}${inv ? `<br>Invoice ${obj(inv.id)}` : ""}<br>Record <code>${esc(r.id)}</code></p>
${p?.receiptUrl ? `<a class="btn" target=_blank href="${esc(p.receiptUrl)}">Stripe receipt</a>` : ""}${p?.pi ? `<a class="btn ghost" target=_blank href="${esc(dash(p.pi))}">Open in Stripe</a>` : ""}${inv?.pdf ? `<a class="btn soft" target=_blank href="${esc(inv.pdf)}">PDF</a>` : ""}</div>${stripeOutput([{ id: p?.pi, label: "Payment Intent + Charge" }, { id: inv?.id, label: "Invoice" }])}<p class="muted">Every line cites a clause in <a href="/policy">policy.md</a>. <a href="/audit">See the audit</a>.</p></div>`, "/payments", bookEntries(r).filter(e => !pi || e.pi === pi));
}
function cardPage() {
  const x = extraState(), c = x.card;
  const auths = (x.auths || []).map((a: any) => `<tr><td>${esc(a.merchant || "Ocado")}<br><span class="muted">${esc((a.category || "").replace(/_/g, " "))} · ${when(a.at)}</span></td><td class="r">${gbp(a.amount)}</td><td>${status(a.approved ? "approved" : "declined")}</td><td>${esc(a.clause)} · ${esc(a.reason)}</td><td class="hide-m">${obj(a.authorization, c?.account)}</td></tr>`).join("");
  const head = c ? `<div class="card"><h2>Virtual card •••• ${esc(c.last4)} ${status(c.status || "active")}</h2><p class="muted">£50 per authorisation · £200 weekly · grocery and restaurants only</p><p>${obj(c.card, c.account)} ${obj(c.cardholder, c.account)}</p></div>` : `<div class="card"><p class="empty">No card yet.</p><button onclick="go('/api/issuing/card')">Issue Sally's card</button></div>`;
  return layout("Card", `<h1>Sally's card</h1><p class="sub">Stripe Issuing. The card itself enforces the policy, so Sally can't overspend.</p>${head}
<div class="card"><h2>Try to make Sally overspend</h2><button onclick="go('/api/issuing/test-auth',{amount:12})">£12 at Ocado</button><button class="ghost btn" onclick="go('/api/issuing/test-auth',{amount:80})">£80 at Ocado</button><button class="ghost btn" onclick="go('/api/issuing/test-auth',{amount:10,category:'package_stores_beer_wine_and_liquor'})">£10 at an off-licence</button></div>
<div class="card scroll"><h2>Authorisations</h2><table><tr><th>Merchant</th><th class="r">Amount</th><th>Result</th><th>Why</th><th class="hide-m">Stripe</th></tr>${auths || `<tr><td colspan=5 class="empty">None yet.</td></tr>`}</table></div>${stripeOutput([{ id: c?.card, acct: c?.account, label: "Issuing card" }, { id: c?.cardholder, acct: c?.account, label: "Cardholder" }, ...(x.auths || []).filter((a: any) => a.authorization).map((a: any) => ({ id: a.authorization, acct: c?.account, label: "Authorisation" }))])}${GO}`, "/card");
}
const GO = `<script>async function go(u,b){document.body.style.opacity=.6;await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b||{})});location.reload()}</script>`;
function invoicesPage() {
  const ids = records().map(r => (r.stripe?.invoice || r.stripe?.sent || r.stripe?.draft || {}).id || r.stripe?.invoiceId).filter(Boolean).map((id: string) => ({ id, label: "Invoice" }));
  const rows = records().filter(r => r.stripe?.invoice || r.stripe?.sent || r.stripe?.draft || r.stripe?.invoiceId).map(r => {
    const i = r.stripe.invoice || r.stripe.sent || r.stripe.draft || { id: r.stripe.invoiceId, hostedUrl: r.stripe.invoiceUrl, pdf: r.stripe.invoicePdf };
    return `<tr><td><a href="/r/${r.id}">${esc(name(r))}</a><br><span class="muted">${esc(r.invoice?.number || r.outInvoice?.customer || "")} · ${when(r.createdAt)}</span></td><td class="r">${gbp(i.amount ?? r.total)}</td><td>${status(i.status || r.status)}</td><td class="hide-m">${obj(i.id)}</td><td>${i.hostedUrl ? `<a class="btn soft" target=_blank href="${esc(i.hostedUrl)}">Invoice</a>` : ""}${i.pdf ? `<a class="btn ghost" target=_blank href="${esc(i.pdf)}">PDF</a>` : ""}</td></tr>`;
  }).join("");
  return layout("Invoices", `<h1>Invoices</h1><p class="sub">Supplier bills Sally checked and paid, and customer invoices she drafted or sent.</p><div class="card scroll"><table><tr><th>Invoice</th><th class="r">Amount</th><th>Status</th><th class="hide-m">Stripe</th><th></th></tr>${rows || `<tr><td colspan=5 class="empty">No invoices yet. Say “pay the Bidfood invoice” in <a href="/">Chat</a>.</td></tr>`}</table></div>${stripeOutput(ids)}`, "/invoices", records().filter(r => /invoice/.test(r.demo || "")).flatMap(bookEntries));
}
function billingPage() {
  const subs = (extraState().subs || []).map((s: any) => `<tr><td>Sally Plus<br><span class="muted">${esc(s.email)} · ${when(s.at)}</span></td><td class="r">£9.00/mo</td><td>${status(s.status)}</td><td class="hide-m">${obj(s.subscription)}</td></tr>`).join("");
  return layout("Billing", `<h1>Billing</h1><p class="sub">Sally Plus, £9 a month, on Stripe Billing.</p><div class="card"><button onclick="go('/api/billing/subscribe')">Start a test subscription</button></div><div class="card scroll"><table><tr><th>Plan</th><th class="r">Price</th><th>Status</th><th class="hide-m">Stripe</th></tr>${subs || `<tr><td colspan=4 class="empty">No subscriptions yet.</td></tr>`}</table></div>${GO}${stripeOutput((extraState().subs || []).map((x: any) => ({ id: x.subscription, label: "Subscription" })))}`, "/billing");
}
function connectPage() {
  const x = extraState();
  const pays = (x.venuePays || []).map((p: any) => `<tr><td>Venue payment<br><span class="muted">${when(p.at)}</span></td><td class="r">${gbp(p.amount)}</td><td class="r">${gbp(p.fee)}</td><td>${status(p.status)}</td><td class="hide-m">${obj(p.paymentIntent)}</td></tr>`).join("");
  return layout("Connect", `<h1>Connect</h1><p class="sub">Sally pays a venue. The venue gets the money, HeySalad keeps a 5% fee.</p><div class="card"><h2>Venue ${x.venue ? obj(x.venue.account) : ""}</h2><button onclick="go('/api/connect/pay',{amount:60})">Pay venue £60</button></div><div class="card scroll"><table><tr><th>Payment</th><th class="r">Amount</th><th class="r">Fee</th><th>Status</th><th class="hide-m">Stripe</th></tr>${pays || `<tr><td colspan=5 class="empty">No venue payments yet.</td></tr>`}</table></div>${GO}${stripeOutput([{ id: x.venue?.account, label: "Venue account" }, ...(x.venuePays || []).map((v: any) => ({ id: v.paymentIntent, label: "Payment Intent + Charge + Transfer" }))])}`, "/connect");
}
const bkStatus = (r: any) => { const e = bookEntries(r); return e.length ? e[0].status : "Not bookable"; };
export function auditPage() {
  const rs = records().filter((r: any) => r.demo || r.decisions?.length);
  const rows = rs.flatMap((r: any) => (r.decisions || []).filter((d: any) => d.price > 0).map((d: any) => `<tr class="${esc(d.status)}"><td>${esc(d.name || d.item)}<br><a class="muted" href="/r/${r.id}">${esc(name(r))}</a></td><td class="r">${gbp(d.price)}</td><td>${status(d.status)}</td><td><b>${esc(d.clause)}</b> <span class="hide-m">${esc(d.reason)}</span>${stripeOutput(paymentsOf(r).map(p => ({ id: p.pi, label: "Payment Intent" })).concat([{ id: (r.stripe?.invoice || r.stripe?.sent || {}).id, label: "Invoice" }]), { mini: true, title: "Stripe object" })}</td><td><span class="pill wait">${esc(bkStatus(r))}</span></td></tr>`)).join("");
  return layout("Audit", `<h1>Every pound</h1><p class="sub">Each line, its decision and the <a href="/policy">policy.md</a> clause behind it.</p><div class="card scroll"><table><tr><th>Line</th><th class="r">£</th><th>Decision</th><th>Clause</th><th>Briefcase status</th></tr>${rows || `<tr><td colspan=5 class="empty">Nothing yet.</td></tr>`}</table></div>`, "/audit");
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
${stripeOutput([...pays.map(p => ({ id: p.pi, label: "Payment Intent + Charge" })), { id: inv?.id, label: "Invoice" }, { id: r.stripe?.paymentLink?.id, label: "Payment Link" }, { id: r.stripe?.sessionId || r.stripe?.session, label: "Checkout Session" }])}<div class="card"><h2>Audit trail</h2><pre>${esc(JSON.stringify(r.audit, null, 2))}</pre></div>
<script>async function why(q){const j=await (await fetch('/r/${r.id}/why?q='+encodeURIComponent(q))).json();w.textContent='Sally: '+j.answer}</script>`, "/payments", bookEntries(r));
}

const SPATH: [RegExp, string][] = [[/^pi_/, "payment_intents"], [/^in_/, "invoices"], [/^sub_/, "subscriptions"], [/^iauth_/, "issuing/authorizations"], [/^ic_/, "issuing/cards"], [/^ich_/, "issuing/cardholders"], [/^acct_/, "accounts"], [/^tr_/, "transfers"], [/^ch_/, "charges"], [/^cs_/, "checkout/sessions"], [/^plink_/, "payment_links"], [/^cus_/, "customers"]];
const SECRET = /secret|password|token|^number$|^cvc$|^key$|^pin$|^ssn|id_number|^url$|_url$/i;
export function redact(o: any): any { if (Array.isArray(o)) return o.map(redact); if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).filter(([k]) => k !== "lastResponse").map(([k, v]) => [k, SECRET.test(k) && v != null && typeof v !== "object" && typeof v !== "boolean" ? "[redacted]" : redact(v)])); return o; }
const KEY = ["id", "object", "status", "amount", "amount_total", "amount_due", "amount_paid", "currency", "created", "livemode"];
const order = (o: any) => { const out: any = {}; for (const k of KEY) if (k in o) out[k] = k === "created" && typeof o[k] === "number" ? new Date(o[k] * 1000).toISOString() : o[k]; for (const k of Object.keys(o)) if (!(k in out)) out[k] = o[k]; return out; };
const SCACHE = new Map<string, { at: number; v: any }>();
async function stripeObjects(id: string, acct?: string) {
  const hit = SPATH.find(([r]) => r.test(id)); if (!hit || !/^[A-Za-z0-9_]+$/.test(id)) throw new Error("Not a Stripe object id");
  const qs = hit[1] === "payment_intents" ? "?expand[]=latest_charge&expand[]=latest_charge.transfer" : "";
  let last: any;
  for (const c of [stripeX, stripeI]) { if (!c) continue;
    try { const o: any = await (c as any).rawRequest("GET", `/v1/${hit[1]}/${id}${qs}`, null, acct ? { stripeAccount: acct } : {});
      if (o.livemode) throw new Error("Live object refused");
      const objs = [o]; const ch = o.latest_charge; if (ch && typeof ch === "object") { o.latest_charge = ch.id; objs.push(ch); if (ch.transfer && typeof ch.transfer === "object") { objs.push(ch.transfer); ch.transfer = ch.transfer.id; } }
      return objs.map(x => order(redact(x)));
    } catch (e: any) { last = e; } }
  throw last || new Error("Stripe not configured");
}

export function mountUi(app: Express) {
  app.post("/api/briefcase/send", async (q: any, res) => { const r = memory.get(q.body?.rid); const e = r && bookEntries(r).find(x => x.pi === q.body?.pi); if (!e) return res.status(404).json({ ok: false, error: "Not found" }); res.json(await sendToBriefcase(e)); });
  app.get("/api/stripe/:id", async (q, res) => {
    const id = String(q.params.id), acct = q.query.acct ? String(q.query.acct) : undefined, k = id + "|" + (acct || "");
    const c = SCACHE.get(k); if (c && Date.now() - c.at < 60000) return res.json({ objects: c.v });
    try { const v = await stripeObjects(id, acct); SCACHE.set(k, { at: Date.now(), v }); res.json({ objects: v }); } catch (e: any) { res.status(200).json({ error: String(e?.message || e).slice(0, 200) }); }
  });
  app.get("/money", (_q, res) => res.send(moneyPage()));
  app.get("/payments", (_q, res) => res.send(paymentsPage()));
  app.get("/receipt/:id", (q, res) => { const r = memory.get(q.params.id); r ? res.send(receiptPage(r, q.query.pi ? String(q.query.pi) : undefined)) : res.status(404).send(layout("Not found", "<h1>Not found</h1>")); });
  app.get("/card", (_q, res) => res.send(cardPage()));
  app.get("/invoices", (_q, res) => res.send(invoicesPage()));
  app.get("/billing", (_q, res) => res.send(billingPage()));
  app.get("/connect", (_q, res) => res.send(connectPage()));
}

// Chat page (public/chat.html) wrapped in the same shell.
import { readFileSync } from "node:fs";
export function chatPage() {
  const h = readFileSync("public/chat.html", "utf8");
  return h.replace("</style>", `${SHELL_CSS}@media(min-width:768px){.dock{margin-left:116px}}</style>`).replace('<body>', `<body class="shell">${sidebar("/")}`).replace("<!--BRIEFCASE-->", `<details class="bcw"><summary>Booked in Briefcase · ${briefcaseConnected() ? "Connected" : "Preview, not connected"}</summary>${briefcase(records().flatMap(bookEntries).slice(0, 3), "Latest three.")}</details>`).replace("</style>", `${COMP_CSS}</style>`);
}
