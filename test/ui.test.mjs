// UI consistency: every money page renders, shares the nav, uses only brand colours and Figtree. Server must be running.
const base = process.env.SALLY_URL || "http://localhost:3000";
let ok = 0, fail = 0;
const t = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); c ? ok++ : fail++; };
const pages = ["/money", "/payments", "/card", "/invoices", "/billing", "/connect", "/audit"];
const BRAND = new Set(["#ed4c4c", "#faa09a", "#ffd0cd", "#fff8f6", "#1f1416", "#fff", "#ffffff", "#6b5557"]);
for (const p of pages) {
  const r = await fetch(base + p); const h = await r.text();
  t(`${p} 200`, r.status === 200);
  t(`${p} has full nav`, pages.every(x => h.includes(`href="${x}"`)));
  t(`${p} Figtree, no Grandstander`, h.includes("Figtree") && !/grandstander/i.test(h));
  const off = [...h.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)].map(m => m[0].toLowerCase()).filter(c => !BRAND.has(c));
  t(`${p} brand colours only`, off.length === 0 || (console.log("  off-brand:", [...new Set(off)]), false));
}
const recs = await (await fetch(base + "/api/records")).json();
const paid = recs.find(r => Object.values(r.stripe || {}).some(v => v && v.paymentIntent));
if (paid) { const h = await (await fetch(base + "/receipt/" + paid.id)).text(); t("receipt renders with total + Stripe link", h.includes("Total") && h.includes("dashboard.stripe.com/test/payments/")); }
const chat = await (await fetch(base + "/")).text();
t("chat links to money pages", chat.includes('href="/money"') && chat.includes('href="/payments"') && !/grandstander/i.test(chat));
console.log(`${ok}/${ok + fail} passed`); process.exit(fail ? 1 : 0);
