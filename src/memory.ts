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
export class CogneeMemory implements MemoryAdapter {
  local = new LocalStore();
  save(r: any) {
    this.local.save(r);
    const url = process.env.COGNEE_URL, key = process.env.COGNEE_API_KEY;
    if (url && key) fetch(`${url}/api/v1/add`, { method: "POST", headers: { "X-Api-Key": key, "Content-Type": "application/json" }, body: JSON.stringify({ data: JSON.stringify(r), datasetName: "offramp-audit" }) }).catch(() => {});
  }
  get(id: string) { return this.local.get(id); }
  all() { return this.local.all(); }
}
export const memory = new CogneeMemory();
