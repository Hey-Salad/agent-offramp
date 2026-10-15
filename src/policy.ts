import catalog from "../data/catalog.json" with { type: "json" };
export type Item = { sku: string; name: string; price: number; category: string; allergens: string[]; merchant: string };
export type Decision = { sku: string; item: string; price: number; merchant: string; status: "approved" | "blocked" | "needs_approval"; clause: string; reason: string; evidence: string };
export const POLICY = { capGBP: 40, maxCapGBP: 50, approvalThresholdGBP: 15, allowedMerchants: ["Ocado", "Waitrose"], blockedCategories: ["alcohol"] };
const CAT = catalog as Item[];

export function parseRequest(text: string) {
  const t = text.toLowerCase();
  const capM = t.match(/(?:under|below|max|cap)\s*£?\s*(\d+)/);
  const cap = Math.min(capM ? Number(capM[1]) : POLICY.capGBP, POLICY.maxCapGBP);
  const allergens: string[] = [];
  for (const a of ["nuts", "peanuts", "gluten", "milk", "egg", "fish"]) if (new RegExp(`no ${a}|${a}[- ]free`).test(t)) allergens.push(a);
  if (allergens.includes("nuts")) allergens.push("peanuts");
  // explicit items mentioned, otherwise "weekly shop" = whole catalog wish-list
  const mentioned = CAT.filter(i => i.name.toLowerCase().split(/\s+/).some(w => w.length > 3 && t.includes(w)) || t.includes(i.category));
  const wanted = /weekly|usual|shop/.test(t) || mentioned.length === 0 ? CAT : mentioned;
  return { cap, allergens, wanted };
}

export function decide(text: string) {
  const { cap, allergens, wanted } = parseRequest(text);
  const decisions: Decision[] = [];
  let total = 0;
  const base = (i: Item) => ({ sku: i.sku, item: i.name, price: i.price, merchant: i.merchant });
  for (const i of wanted) {
    const ev = `catalog:${i.sku} category=${i.category} allergens=[${i.allergens.join(",")}] merchant=${i.merchant} price=£${i.price.toFixed(2)}`;
    if (!POLICY.allowedMerchants.includes(i.merchant)) { decisions.push({ ...base(i), status: "blocked", clause: "P5", reason: `${i.merchant} is not an allowed merchant`, evidence: ev }); continue; }
    if (POLICY.blockedCategories.includes(i.category)) { decisions.push({ ...base(i), status: "blocked", clause: "P3", reason: "No alcohol", evidence: ev }); continue; }
    const hit = i.allergens.find(a => allergens.includes(a));
    if (hit) { decisions.push({ ...base(i), status: "blocked", clause: "P4", reason: `Contains ${hit}; request said no ${hit}`, evidence: ev }); continue; }
    if (i.price > POLICY.approvalThresholdGBP) { decisions.push({ ...base(i), status: "needs_approval", clause: "P2", reason: `£${i.price.toFixed(2)} is over the £${POLICY.approvalThresholdGBP} single-item threshold; not added without human OK`, evidence: ev }); continue; }
    if (total + i.price > cap) { decisions.push({ ...base(i), status: "blocked", clause: "P1", reason: `Would take basket to £${(total + i.price).toFixed(2)}, over £${cap} cap`, evidence: ev }); continue; }
    total += i.price;
    decisions.push({ ...base(i), status: "approved", clause: "P1,P3,P4,P5", reason: `Passes all rules; running total £${total.toFixed(2)} of £${cap}`, evidence: ev });
  }
  return { cap, allergens, decisions, total: Math.round(total * 100) / 100 };
}
