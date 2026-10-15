// Stripe Agent Toolkit (github.com/stripe/ai, MIT): Sally's money actions go through Stripe's own agent tools.
// Policy runs in our code BEFORE any call here; amounts always come from policy, never from a model.
// If the toolkit is unreachable we fall back to the plain Stripe SDK so the demo never blocks.
import { createStripeAgentToolkit } from "@stripe/agent-toolkit/openai";
let tk: any = null;
async function kit() {
  if (tk || !process.env.STRIPE_SECRET_KEY) return tk;
  try { tk = await createStripeAgentToolkit({ secretKey: process.env.STRIPE_SECRET_KEY, configuration: {} }); }
  catch (e: any) { console.error("agent-toolkit unavailable:", e.message); }
  return tk;
}
export const toolkitLog: { op: string; via: string; at: string }[] = [];
/** Call a Stripe API write via the Agent Toolkit's stripe_api_write tool; fall back to the SDK. */
export async function stripeWrite<T = any>(op: string, params: any, fallback: () => Promise<T>): Promise<T & { _via?: string }> {
  const k = await kit();
  if (k) {
    try {
      const out = JSON.parse(await k.mcpClient.callTool("stripe_api_write", { stripe_api_operation_id: op, parameters: params }));
      if (out?.id) { toolkitLog.push({ op, via: "agent-toolkit", at: new Date().toISOString() }); return Object.assign(out, { _via: "agent-toolkit" }); }
    } catch (e: any) { console.error(`toolkit ${op} failed, using SDK:`, e.message); }
  }
  const r: any = await fallback();
  toolkitLog.push({ op, via: "stripe-sdk", at: new Date().toISOString() });
  return Object.assign(r, { _via: "stripe-sdk" });
}
