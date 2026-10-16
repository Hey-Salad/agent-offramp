import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { ROOT, OUT, WORK, validateEnv, timeline, json, command } from './lib.mjs';
import { voice } from './voice.mjs';
import { record } from './record.mjs';
import { fontCSS, edit } from './edit.mjs';
import { verify } from './verify.mjs';
dotenv.config({ path: `${ROOT}/demo/.env`, quiet: true });
try {
  const origin = validateEnv(process.env);
  for (const bin of ['ffmpeg', 'ffprobe', 'tesseract']) command(bin, [bin === 'tesseract' ? '--version' : '-version']);
  await fs.rm(OUT, { recursive: true, force: true }); await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(WORK, { recursive: true }); await fontCSS();
  console.log('Generating/caching eight Marin voice lines.');
  const cuts = timeline(await voice());
  const captures = [];
  for (const format of ['landscape', 'vertical']) captures.push(await record(origin, format));
  await json(`${OUT}/beats.json`, { schema: 2, captions: false, audioPlaybackRate: 1, syntheticVoice: true, model: 'gpt-4o-mini-tts', voice: 'marin', fps: 30, timeline: cuts, captures: captures.map(({ video, ...c }) => c) });
  console.log('Rendering both formats from measured capture and narration timestamps.');
  await edit(captures, cuts); await verify(origin, cuts);
  console.log('Exports and automated evidence are in demo/out. Review all two-second frames and listen before publishing.');
} catch (e) {
  // Playwright/network exceptions can contain APP_URL, requests or credentials. Never print them.
  let message = String(e?.message || 'Demo failed.');
  for (const key of ['APP_URL', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_ISSUING_KEY']) if (process.env[key]) message = message.replaceAll(process.env[key], '[redacted]');
  message = message.replace(/https?:\/\/[^\s)\"']+/g, '[URL]').replace(/(?:sk[-_]|Bearer\s+)\S+/g, '[credential]');
  console.error(message);
  process.exitCode = 1;
}
