// Sally as an MCP server (plugin for Claude, Cursor, Codex, ChatGPT).
// Every tool calls Sally's own HTTP API, so policy.md is enforced server-side: the AI client can ask, never override.
//   stdio:  SALLY_URL=http://localhost:3000 npx tsx src/mcp.ts
//   HTTP:   <PUBLIC_URL>/mcp (Streamable HTTP, mounted by server.ts)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const port = Number(process.env.PORT || 3000);
const base = () => (process.env.SALLY_URL || `http://localhost:${port}`).replace(/\/$/, "");

async function call(method: string, path: string, body?: any) {
  const r = await fetch(base() + path, { method, headers: { "content-type": "application/json", accept: "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}
const link = (j: any) => j?.stripe?.paymentLink?.url || j?.stripe?.sent?.hostedUrl || j?.stripe?.invoice?.hostedUrl || j?.stripe?.approved?.receiptUrl || j?.stripe?.auto?.receiptUrl || "";
function out(j: any) {
  if (typeof j !== "object" || !j) return { content: [{ type: "text" as const, text: String(j) }] };
  const s = `${j.demo ?? "record"} ${j.id ?? ""}: status=${j.status ?? "?"}, total=£${Number(j.total || 0).toFixed(2)}` + (link(j) ? `\nStripe: ${link(j)}` : "") + (j.url ? `\nRecord: ${j.url}` : "") + (j.error ? `\nError: ${j.error}` : "");
  const { audit, ...rec } = j;
  return { content: [{ type: "text" as const, text: s }, { type: "text" as const, text: JSON.stringify(rec, null, 2) }] };
}

export function buildMcp() {
  const s = new McpServer({ name: "sally-heysalad", version: "1.0.0" });
  s.tool("restock", "Restock the kitchen. Sally auto-pays items within policy (Stripe test mode) and holds over-threshold items for human approval.", {}, async () => out(await call("POST", "/demo/restock")));
  s.tool("shop", "Autonomous Waitrose grocery shop: Sally picks the best-match product per list line, auto-pays up to £25 (S1, Stripe test) and holds the rest for approval (R2).", { list: z.array(z.string()).optional().describe("grocery lines; default = Sally's weekly W18 list") }, async ({ list }) => out(await call("POST", "/demo/shop", list ? { list } : {})));
  s.tool("book_table", "Book a table. Groups at/over the policy size get a Stripe deposit Payment Link.", { text: z.string().describe("e.g. 'Table for 6 Saturday 8pm, name Ada'") }, async ({ text }) => out(await call("POST", "/demo/booking", { text })));
  s.tool("pay_supplier_invoice", "Pay the Bidfood supplier invoice after a 3-way PO check. Mismatches wait for a human.", { mismatch: z.boolean().optional() }, async ({ mismatch }) => out(await call("POST", "/demo/invoice", { mismatch: !!mismatch })));
  s.tool("prepare_invoice", "Prepare a DRAFT Stripe invoice to a customer (nothing sent).", { customer: z.string(), amount: z.number().positive().describe("GBP"), desc: z.string().optional() }, async (a) => out(await call("POST", "/demo/outinvoice", a)));
  s.tool("send_invoice", "Send a drafted invoice. Over the policy limit it waits for human approval instead.", { id: z.string() }, async ({ id }) => out(await call("POST", `/r/${encodeURIComponent(id)}/send`, {})));
  s.tool("email_shopping_list_draft", "Draft (never send) an email with the shopping list.", {}, async () => out(await call("POST", "/demo/shoplist")));
  s.tool("approve", "Human approval of a held record (restock items, invoice mismatch, large invoice). Only call when the human explicitly says approve.", { id: z.string() }, async ({ id }) => out(await call("POST", `/r/${encodeURIComponent(id)}/approve`, {})));
  s.tool("get_audit", "Audit trail: recent records with every decision, policy clause and Stripe ID. Optional id for one record.", { id: z.string().optional() }, async ({ id }) => {
    const j: any = await call("GET", id ? `/api/records/${encodeURIComponent(id)}` : "/api/records");
    const list = Array.isArray(j) ? j.slice(0, 10) : j;
    const sum = Array.isArray(list) ? list.map((r: any) => `${r.id} ${r.demo ?? r.channel ?? ""} ${r.status} £${Number(r.total || 0).toFixed(2)}`).join("\n") || "No records yet" : `Record ${id}`;
    return { content: [{ type: "text" as const, text: sum }, { type: "text" as const, text: JSON.stringify(list, null, 2) }] };
  });
  s.tool("get_policy", "Sally's spending policy (policy.md).", {}, async () => ({ content: [{ type: "text" as const, text: String(await call("GET", "/policy")) }] }));
  s.tool("remember", "Save a shopping preference, past order or spending decision to Sally's Cognee memory.", { text: z.string().describe("e.g. 'Peter prefers oat milk; weekly grocery budget £60'") }, async ({ text }) => { const j: any = await call("POST", "/api/memory/remember", { text }); return { content: [{ type: "text" as const, text: j?.ok ? `Remembered${j.cognee ? " in Cognee" : " locally"}.` : `Could not remember: ${j?.error || j}` }] }; });
  s.tool("recall", "Ask Sally's Cognee memory before planning a shop or explaining a spend (preferences, past orders, past decisions).", { query: z.string() }, async ({ query }) => { const j: any = await call("POST", "/api/memory/recall", { query }); return { content: [{ type: "text" as const, text: `Sally remembers${j?.cognee ? " (Cognee)" : ""}: ${j?.answer ?? j}` }] }; });
  const j = (x: any) => ({ content: [{ type: "text" as const, text: JSON.stringify(x, null, 2) }] });
  s.tool("issue_card", "Issue (or reuse) Sally's Stripe Issuing virtual card with spending controls that mirror policy.md (test mode).", {}, async () => j(await call("POST", "/api/issuing/card", {})));
  s.tool("pay_venue", "Pay a venue through Stripe Connect (destination charge, HeySalad fee), test mode.", { amount: z.number().positive().describe("GBP") }, async ({ amount }) => j(await call("POST", "/api/connect/pay", { amount })));
  s.tool("subscribe_sally_plus", "Start a Sally Plus £9/month subscription (Stripe Billing, test mode).", { email: z.string().optional() }, async ({ email }) => j(await call("POST", "/api/billing/subscribe", { email })));
  s.tool("pay_with_shared_token", "Agentic checkout: pay with a scoped, expiring Stripe shared payment token (Sally never sees card details), test mode.", { amount: z.number().positive().describe("GBP") }, async ({ amount }) => j(await call("POST", "/api/spt/pay", { amount })));
  return s;
}

export function mountMcp(app: any) {
  app.post("/mcp", async (req: any, res: any) => {
    const server = buildMcp();
    const t = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { t.close(); server.close(); });
    await server.connect(t);
    await t.handleRequest(req, res, req.body);
  });
  const no = (_q: any, res: any) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
  app.get("/mcp", no); app.delete("/mcp", no);
}

if (process.argv[1]?.endsWith("mcp.ts")) {
  await buildMcp().connect(new StdioServerTransport());
}
