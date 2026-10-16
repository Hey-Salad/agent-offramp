import test from 'node:test';
import { strict as assert } from 'node:assert';
import { timeline, validateEnv, lines } from './lib.mjs';
const env = { APP_URL: 'https://example.invalid', OPENAI_API_KEY: 'test-only' };
test('configuration rejects missing credentials, credentials in URLs, dashboard and live Stripe keys', () => {
  for (const input of [{}, { ...env, OPENAI_API_KEY: '' }, { ...env, APP_URL: 'https://user:password@example.invalid' }, { ...env, APP_URL: 'https://dashboard.stripe.com' }, { ...env, STRIPE_SECRET_KEY: 'sk_live_example' }, { ...env, STRIPE_ISSUING_KEY: 'sk_live_example' }]) assert.throws(() => validateEnv(input));
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
