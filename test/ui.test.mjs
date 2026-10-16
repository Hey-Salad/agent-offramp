// UI consistency: every page renders inside the left side-nav shell with the right active item, uses only brand colours and Figtree. Server must be running.
const base = process.env.SALLY_URL || "http://localhost:3000";
let ok = 0, fail = 0;
const t = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); c ? ok++ : fail++; };
const pages = ["/money", "/payments", "/card", "/invoices", "/billing", "/connect", "/audit"];
const BRAND = new Set(["#faa09a", "#ffd0cd", "#fff8f6", "#1f1416", "#fff", "#ffffff", "#6b5557"]);
const NAV = ["/", ...pages];
const sidebarOk = (h, active) => h.includes('<nav class="sb"') && h.includes('class="nav-t"') && h.includes("Agent 9") && h.includes("Test mode") && NAV.every(x => h.includes(`href="${x}"`))
  && (h.match(/class="it on"/g) || []).length === 1 && h.includes(`<a class="it on" href="${active}"`) && !/class="top"><a href="\/"><img/.test(h);
for (const p of pages) {
  const r = await fetch(base + p); const h = await r.text();
  t(`${p} 200`, r.status === 200);
  t(`${p} sidebar, ${p} active`, sidebarOk(h, p));
  t(`${p} Stripe output panel, Briefcase slot, logo top left only`, (h.includes('class="card so"') || h.includes('class="so mini"')) && h.includes('id="briefcase"') && /class="brand" href="\/"><img src="\/heysalad-logo-black\.svg"/.test(h) && (h.match(/heysalad-logo-black\.svg/g) || []).length === 2 && !/class="ph">[^\n]*?<img/.test(h.split('</div>').find(x => x.includes('class="ph"')) || ""));
  t(`${p} no Cherry red`, !/#ed4c4c/i.test(h));
  t(`${p} no "PaymentIntents" label`, !/>[^<]*PaymentIntents/.test(h));
  t(`${p} Figtree, no Grandstander`, h.includes("Figtree") && !/grandstander/i.test(h));
  const off = [...h.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)].map(m => m[0].toLowerCase()).filter(c => !BRAND.has(c));
  t(`${p} brand colours only`, off.length === 0 || (console.log("  off-brand:", [...new Set(off)]), false));
}
const recs = await (await fetch(base + "/api/records")).json();
const paid = recs.find(r => Object.values(r.stripe || {}).some(v => v && v.paymentIntent));
if (paid) {
  const h = await (await fetch(base + "/receipt/" + paid.id)).text(); t("receipt renders with total + Stripe link", h.includes("Total") && h.includes("dashboard.stripe.com/test/payments/"));
  t("receipt in shell, Payments active", sidebarOk(h, "/payments"));
  t("receipt has Stripe output", h.includes('data-sid="pi_'));
  const pi = h.match(/data-sid="(pi_[A-Za-z0-9]+)"/)?.[1];
  if (pi) { const j = await (await fetch(base + "/api/stripe/" + pi)).json(); const o = j.objects || [];
    t("Stripe output: real PI + charge, test mode, secrets redacted", o[0]?.id === pi && o[0]?.livemode === false && o.some(x => x.object === "charge") && o[0]?.client_secret === "[redacted]" || (console.log("  ", j.error || Object.keys(o[0] || {})), false)); }
  const rr = await (await fetch(base + "/r/" + paid.id)).text(); t("/r/:id in shell, Payments active", sidebarOk(rr, "/payments"));
}
const chat = await (await fetch(base + "/")).text();
t("chat links to money pages", chat.includes('href="/money"') && chat.includes('href="/payments"') && !/grandstander/i.test(chat));
t("chat in shell, Chat active", sidebarOk(chat, "/"));
t("chat has Briefcase slot", chat.includes('id="briefcase"'));
t("chat: no Cherry red, logo only top left", !/#ed4c4c/i.test(chat) && (chat.match(/heysalad-logo-black\.svg/g) || []).length === 2);
const pay = await (await fetch(base + "/payments")).text();
t("Stripe output JSON has no pink bubble", /\.so pre\.j\{[^}]*background:#fff;/.test(pay) && !/\.so pre\.j\{[^}]*#fff8f6/.test(pay));
t("Booked in Briefcase preview (not connected), Send pill disabled", pay.includes("Booked in Briefcase") && pay.includes("Preview, not connected") && /disabled[^>]*>Send to Briefcase/.test(pay));
t("audit has Briefcase status column", (await (await fetch(base + "/audit")).text()).includes("Briefcase status"));
t("overview has Books card", (await (await fetch(base + "/money")).text()).includes("<small>Books</small>"));
t("/api/stripe rejects non-Stripe ids", !!(await (await fetch(base + "/api/stripe/notastripeid")).json()).error);
console.log(`${ok}/${ok + fail} passed`); process.exit(fail ? 1 : 0);
