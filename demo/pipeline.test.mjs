import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { narrationConfig } from './voice.mjs';
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { timeline, validateEnv, lines, prepareOutput } from './lib.mjs';
import { normalize } from './alignment.mjs';
const env = { APP_URL: 'https://example.invalid', OPENAI_API_KEY: 'test-only', ELEVENLABS_API_KEY: 'test-only' };
test('configuration rejects missing credentials, credentials in URLs, dashboard and live Stripe keys', () => {
  for (const input of [{}, { ...env, OPENAI_API_KEY: '' }, { ...env, ELEVENLABS_API_KEY: '' }, { ...env, APP_URL: 'https://user:password@example.invalid' }, { ...env, APP_URL: 'https://dashboard.stripe.com' }, { ...env, STRIPE_SECRET_KEY: 'sk_live_example' }, { ...env, STRIPE_ISSUING_KEY: 'sk_live_example' }]) assert.throws(() => validateEnv(input));
  assert.equal(validateEnv(env), 'https://example.invalid');
});
test('cuts preserve natural audio speed and round up only to complete video frames', () => {
  const durations = [4.7, 4.4, 6.2, 4.1, 4.8, 4.7, 3.4, 3.6];
  const cuts = timeline(durations);
  assert.equal(cuts[0].start, 0);
  assert.ok(cuts.at(-1).end >= 30 && cuts.at(-1).end <= 40);
  for (const [i, cut] of cuts.entries()) {
    assert.equal(cut.id, lines[i][0]); assert.equal(cut.voiceDuration, durations[i]);
    assert.equal(cut.playbackRate, 1); assert.equal(cut.tempo, undefined);
    assert.ok(cut.duration >= durations[i] - 1e-8 && cut.duration - durations[i] < 1/30 + 1e-8);
    assert.ok(Math.abs(cut.end * 30 - Math.round(cut.end * 30)) < 1e-8);
    if (i) assert.equal(cut.start, cuts[i - 1].end);
  }
});
test('invalid or implausible TTS duration fails instead of stretching narration', () => {
  for (const d of [[], Array(8).fill(0), Array(8).fill(0.1), Array(8).fill(20)]) assert.throws(() => timeline(d));
});

test('spoken sterling amounts compare equally with transcription currency notation', () => {
  assert.equal(normalize('£25'), normalize('twenty-five pounds'));
  assert.equal(normalize('£80'), normalize('eighty pounds'));
  assert.equal(normalize('£10'), normalize('ten pounds'));
});

test('Irish preset uses Jessica at natural speed while British retains Megan', () => {
  assert.equal(narrationConfig('irish', {}).voice, 'Jessica Gallagher (Irish)');
  assert.equal(narrationConfig('irish', {}).accent, 'irish');
  assert.equal(narrationConfig('irish', {}).speed, 1);
  assert.equal(narrationConfig('british', {}).voice, 'Megan');
});
test('rebuilding the British export preserves Irish comparisons and unrelated files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sally-demo-'));
  try {
    await fs.mkdir(path.join(dir, 'irish'));
    await fs.writeFile(path.join(dir, 'irish', 'sally-demo-irish.mp4'), 'comparison');
    await fs.writeFile(path.join(dir, 'sally-demo.mp4'), 'old output');
    await fs.writeFile(path.join(dir, 'notes.txt'), 'keep');
    await prepareOutput(dir, 'sally-demo');
    assert.equal(await fs.readFile(path.join(dir, 'irish', 'sally-demo-irish.mp4'), 'utf8'), 'comparison');
    assert.equal(await fs.readFile(path.join(dir, 'notes.txt'), 'utf8'), 'keep');
    assert.equal(await fs.stat(path.join(dir, 'sally-demo.mp4')).catch(() => null), null);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
