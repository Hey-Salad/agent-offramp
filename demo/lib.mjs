import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
export const ROOT = path.resolve(import.meta.dirname, '..');
export const WORK = path.join(ROOT, 'demo/work');
export const OUT = path.join(ROOT, 'demo/out');
export const lines = [
  ['hook', 'Save time and money. I gave my AI a credit card.'],
  ['basket', 'Sally restocks the kitchen, pays Waitrose, and holds anything that needs my approval.'],
  ['approve', "This item is over twenty-five pounds, so she asks me first. One click, and it's paid."],
  ['attempt', 'Then I tried eighty pounds at Ocado, and ten pounds at an off-licence.'],
  ['declines', 'Both declined, by the card itself. The spending limits stay in place.'],
  ['receipt', 'Every payment has a receipt, so I can see where my money went.'],
  ['audit', 'Every decision shows the rule behind it.'],
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
  assert(env.ELEVENLABS_API_KEY, 'ELEVENLABS_API_KEY is required for British narration.');
  assert(env.OPENAI_API_KEY, 'OPENAI_API_KEY is required for audio alignment verification.');
  for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_ISSUING_KEY']) if (env[k]) assert(env[k].startsWith('sk_test_'), 'Only Stripe test keys are permitted.');
  return u.origin;
}
export function timeline(durations) {
  assert(durations.length === lines.length && durations.every(d => Number.isFinite(d) && d > 0), 'Eight valid voice durations are required.');
  const total = durations.reduce((sum, d) => sum + Math.ceil(d * 30) / 30, 0);
  assert(total >= 30 && total <= 40, 'Natural narration must run 30–40 seconds; adjust the script or regenerate the take. Audio is never stretched.');
  let frame = 0;
  return durations.map((d, i) => {
    const start = frame / 30;
    frame += Math.ceil(d * 30);
    const end = frame / 30;
    return { id: lines[i][0], text: lines[i][1], start, end, duration: end - start, voiceDuration: d, playbackRate: 1 };
  });
}
