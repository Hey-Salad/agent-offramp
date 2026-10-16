import test from 'node:test';
import { strict as assert } from 'node:assert';
import { timeline, validateEnv, lines } from './lib.mjs';
const env = { APP_URL: 'https://example.invalid', OPENAI_API_KEY: 'test-only' };
test('configuration rejects missing credentials, credentials in URLs, dashboard and live Stripe keys', () => {
  for (const input of [{}, { ...env, OPENAI_API_KEY: '' }, { ...env, APP_URL: 'https://user:password@example.invalid' }, { ...env, APP_URL: 'https://dashboard.stripe.com' }, { ...env, STRIPE_SECRET_KEY: 'sk_live_example' }, { ...env, STRIPE_ISSUING_KEY: 'sk_live_example' }]) assert.throws(() => validateEnv(input));
  assert.equal(validateEnv(env), 'https://example.invalid');
});
test('cuts follow measured narration, start at zero and total exactly 32 seconds on frame boundaries', () => {
  const durations = [4.7, 4.4, 4.2, 3.1, 2.8, 2.7, 2.4, 4.6];
  const cuts = timeline(durations);
  assert.equal(cuts[0].start, 0); assert.equal(cuts.at(-1).end, 32);
  for (const [i, cut] of cuts.entries()) {
    assert.equal(cut.id, lines[i][0]); assert.equal(cut.voiceDuration, durations[i]);
    assert.ok(Math.abs(cut.tempo * cut.duration - durations[i]) < 1e-8);
    assert.ok(Math.abs(cut.end * 30 - Math.round(cut.end * 30)) < 1e-8);
    if (i) assert.equal(cut.start, cuts[i - 1].end);
  }
});
test('invalid or implausible TTS duration fails instead of padding dead air', () => {
  for (const d of [[], Array(8).fill(0), Array(8).fill(0.1), Array(8).fill(20)]) assert.throws(() => timeline(d));
});
