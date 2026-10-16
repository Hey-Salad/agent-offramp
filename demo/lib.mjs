import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
export const ROOT = path.resolve(import.meta.dirname, '..');
export const WORK = path.join(ROOT, 'demo/work');
export const OUT = path.join(ROOT, 'demo/out');
export const lines = [
  ['hook', 'Save time and money. I gave my AI a credit card.'],
  ['basket', "Sally restocks the kitchen and pays what's in my rules."],
  ['approve', 'Anything over twenty-five pounds? She asks me first.'],
  ['attempt', 'So I tried to make her overspend.'],
  ['declines', 'Declined, by the card itself.'],
  ['receipt', 'Every pound on a receipt.'],
  ['audit', 'With the rule behind it.'],
  ['slate', "Give your AI a card it can't misuse."],
];
export function assert(ok, message) { if (!ok) throw new Error(message); }
export function command(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 30e6 });
  // Never echo process arguments, target URLs, API bodies or keys.
  assert(r.status === 0, `${bin} failed; inspect local tool installation/input (exit ${r.status ?? 'unavailable'}).`);
  return r.stdout + r.stderr;
}
export const ff = args => command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
export function probe(file) { return JSON.parse(command('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file])); }
export async function json(file, data) { await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n'); }
export function validateEnv(env) {
  assert(env.APP_URL, 'APP_URL is required; configure demo/.env or your environment.');
  let u; try { u = new URL(env.APP_URL); } catch { throw new Error('APP_URL must be an absolute HTTP(S) URL.'); }
  assert(['http:', 'https:'].includes(u.protocol) && !u.username && !u.password && !u.search && !u.hash, 'APP_URL must have no credentials, query or fragment.');
  assert(u.hostname !== 'dashboard.stripe.com', 'Stripe dashboard recording is forbidden.');
  assert(env.OPENAI_API_KEY, 'OPENAI_API_KEY is required for Marin narration.');
  for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_ISSUING_KEY']) if (env[k]) assert(env[k].startsWith('sk_test_'), 'Only Stripe test keys are permitted.');
  return u.origin;
}
export function timeline(durations, target = 32) {
  assert(durations.length === lines.length && durations.every(d => Number.isFinite(d) && d > 0), 'Eight valid voice durations are required.');
  const rate = durations.reduce((a, b) => a + b, 0) / target;
  assert(rate >= 0.65 && rate <= 1.6, 'Narration needs a new take: excessive tempo change for 32 seconds.');
  let at = 0;
  return durations.map((d, i) => {
    // Quantize every cut to the output frame grid; cumulative total remains 32s.
    const end = Math.round((at + d / rate) * 30) / 30;
    const start = Math.round(at * 30) / 30; at += d / rate;
    return { id: lines[i][0], text: lines[i][1], start, end, duration: end - start, voiceDuration: d, tempo: d / (end - start) };
  });
}
