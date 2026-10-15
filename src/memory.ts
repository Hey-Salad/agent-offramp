// Memory adapter. Named for Cognee: set COGNEE_API_KEY (+ COGNEE_URL) to also push records to Cognee;
// local JSON store is always the source of truth so the demo never blocks.
import fs from "node:fs";
const FILE = "data/records.json";
export interface MemoryAdapter { save(r: any): void; get(id: string): any; all(): any[] }
class LocalStore implements MemoryAdapter {
  db: Record<string, any> = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
  save(r: any) { this.db[r.id] = r; fs.writeFileSync(FILE, JSON.stringify(this.db, null, 2)); }
  get(id: string) { return this.db[id]; }
  all() { return Object.values(this.db).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)); }
}
// Cognee Cloud: COGNEE_API_KEY + COGNEE_BASE_URL (tenant URL). Dataset: COGNEE_DATASET (default sally-memory).
const cBase = () => (process.env.COGNEE_BASE_URL || process.env.COGNEE_URL || "").replace(/\/$/, "");
const cKey = () => process.env.COGNEE_API_KEY || "";
const cSet = () => process.env.COGNEE_DATASET || "sally-memory";
export const cogneeOn = () => !!(cBase() && cKey());
export const recentMemories: { at: string; text: string }[] = [];
// Store a fact: Cognee /remember ingests + cognifies (builds the knowledge graph) in one call.
export async function remember(text: string): Promise<{ ok: boolean; cognee: boolean; error?: string }> {
  recentMemories.unshift({ at: new Date().toISOString(), text }); recentMemories.splice(20);
  if (!cogneeOn()) return { ok: true, cognee: false };
  try {
    const f = new FormData(); f.append("datasetName", cSet()); f.append("raw_data", text);
    const r = await fetch(`${cBase()}/api/v1/remember`, { method: "POST", headers: { "X-Api-Key": cKey() }, body: f, signal: AbortSignal.timeout(20000) });
    return r.ok ? { ok: true, cognee: true } : { ok: false, cognee: true, error: `cognee ${r.status}` };
  } catch (e: any) { return { ok: false, cognee: true, error: String(e?.name || e) }; }
}
// Recall: natural-language question over Sally's memory graph. Falls back to recent local facts.
export async function recall(query: string): Promise<{ answer: string; cognee: boolean }> {
  const local = () => ({ answer: recentMemories.slice(0, 5).map(m => m.text).join("\n") || "Nothing remembered yet.", cognee: false });
  if (!cogneeOn()) return local();
  try {
    const r = await fetch(`${cBase()}/api/v1/recall`, { method: "POST", headers: { "X-Api-Key": cKey(), "content-type": "application/json" }, body: JSON.stringify({ query, datasets: [cSet()] }), signal: AbortSignal.timeout(30000) });
    if (!r.ok) return local();
    const j: any = await r.json();
    const t = (Array.isArray(j) ? j : [j]).map((x: any) => x?.text ?? x?.raw?.value ?? "").filter(Boolean).join("\n");
    return t ? { answer: t, cognee: true } : local();
  } catch { return local(); }
}
const summary = (r: any) => `${r.createdAt?.slice(0, 10) || ""} Sally ${r.demo || r.channel || "record"} ${r.id}: status ${r.status}, total £${Number(r.total || 0).toFixed(2)}` +
  (Array.isArray(r.items) ? `; items: ${r.items.map((i: any) => `${i.name || i.desc || ""} £${Number(i.amount ?? i.price ?? 0).toFixed(2)} ${i.status || i.decision || ""}`).join(", ")}` : "") +
  (r.customer ? `; customer ${r.customer}` : "");
export class CogneeMemory implements MemoryAdapter {
  local = new LocalStore();
  seen = new Map<string, string>();
  save(r: any) {
    this.local.save(r);
    // Remember spending decisions once per status change (paid / held / sent / blocked ...), never per audit line.
    const k = `${r.status}|${r.total}`;
    if (r.id && r.status && this.seen.get(r.id) !== k) { this.seen.set(r.id, k); remember(summary(r)).catch(() => {}); }
  }
  get(id: string) { return this.local.get(id); }
  all() { return this.local.all(); }
}
export const memory = new CogneeMemory();
