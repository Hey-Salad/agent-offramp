import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const url = process.env.SALLY_URL || "http://localhost:3000";
for (const kind of ["stdio", "http"]) {
  const c = new Client({ name: "t", version: "1" });
  await c.connect(kind === "stdio" ? new StdioClientTransport({ command: "npx", args: ["tsx", "src/mcp.ts"] }) : new StreamableHTTPClientTransport(new URL(url + "/mcp")));
  console.log(kind, "tools:", (await c.listTools()).tools.map(t => t.name).join(","));
  const r: any = await c.callTool({ name: "restock", arguments: {} });
  console.log(kind, "restock:", r.content[0].text.replace(/\n/g, " | "));
  const a: any = await c.callTool({ name: "get_audit", arguments: {} });
  console.log(kind, "audit:", a.content[0].text.split("\n").slice(0, 3).join(" | "));
  await c.close();
}
