// Cognee memory test: MCP exposes remember/recall (12 tools), and they round-trip. Run with the server up:
//   node test/memory.test.mjs   (SALLY_URL defaults to http://localhost:3000)
const base = process.env.SALLY_URL || "http://localhost:3000";
let ok = 0, fail = 0;
const t = (name, cond) => { console.log((cond ? "PASS " : "FAIL ") + name); cond ? ok++ : fail++; };
async function rpc(method, params) {
  const r = await fetch(base + "/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const s = await r.text(); const line = s.split("\n").find(l => l.startsWith("data:")); return JSON.parse(line ? line.slice(5) : s).result;
}
const tools = (await rpc("tools/list", {})).tools.map(x => x.name);
t(`MCP has remember + recall (${tools.length} tools)`, tools.includes("remember") && tools.includes("recall") && tools.length >= 12);
const rem = await rpc("tools/call", { name: "remember", arguments: { text: "Test: the restaurant's preferred dairy supplier is Bidfood." } });
t("remember stores", /Remembered/.test(rem.content[0].text));
const rec = await rpc("tools/call", { name: "recall", arguments: { query: "What milk does Peter prefer?" } });
t("recall answers", /Sally remembers/.test(rec.content[0].text));
const st = await (await fetch(base + "/api/memory/status")).json();
t("UI status has latest memory", !!st.latest);
console.log(`${ok}/${ok + fail} passed`); process.exit(fail ? 1 : 0);
