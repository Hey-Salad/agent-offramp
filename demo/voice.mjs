import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { WORK, lines, ff, probe, assert, json } from './lib.mjs';
export async function voice() {
  const durations = [];
  await fs.mkdir(`${WORK}/voice`, { recursive: true });
  for (const [id, text] of lines) {
    const request = { model: 'gpt-4o-mini-tts', voice: 'marin', input: text, response_format: 'wav', instructions: 'Warm, clear British English. Read naturally and briskly. No long pauses. Speak only the supplied words.' };
    const hash = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const raw = `${WORK}/voice/${id}-${hash}.wav`;
    if (!(await fs.stat(raw).catch(() => null))) {
      const r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(90000) });
      assert(r.ok, `OpenAI speech request failed (${r.status}); response omitted to protect credentials.`);
      await fs.writeFile(raw, Buffer.from(await r.arrayBuffer()));
    }
    const file = `${WORK}/voice/${id}.wav`;
    ff(['-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0,areverse', '-ar', '48000', '-ac', '1', file]);
    durations.push(Number(probe(file).format.duration));
  }
  await json(`${WORK}/voice/provenance.json`, { model: 'gpt-4o-mini-tts', voice: 'marin', syntheticVoice: true, lines });
  return durations;
}
