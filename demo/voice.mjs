import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { WORK, lines, ff, probe, assert, json } from './lib.mjs';
export function narrationConfig() {
  return { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voice: process.env.ELEVENLABS_VOICE_NAME || 'Megan', voiceId: process.env.ELEVENLABS_VOICE_ID || '45Ax8wdajmGTaLOJAJwK', syntheticVoice: true, speed: 1 };
}
export async function voice() {
  const durations = [], config = narrationConfig();
  await fs.mkdir(`${WORK}/voice`, { recursive: true });
  for (const [index, [id, text]] of lines.entries()) {
    const request = { text, model_id: config.model, seed: 20261016 + index,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: 1 },
      ...(index ? { previous_text: lines[index - 1][1] } : {}),
      ...(index + 1 < lines.length ? { next_text: lines[index + 1][1] } : {}) };
    const hash = createHash('sha256').update(JSON.stringify({ config, request, output_format: 'mp3_44100_128' })).digest('hex');
    const raw = `${WORK}/voice/${id}-${hash}.mp3`;
    if (!(await fs.stat(raw).catch(() => null))) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(request), signal: AbortSignal.timeout(90000) });
      assert(r.ok, `ElevenLabs speech request failed (${r.status}); response omitted to protect credentials.`);
      await fs.writeFile(raw, Buffer.from(await r.arrayBuffer()));
    }
    const file = `${WORK}/voice/${id}.wav`;
    ff(['-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0,areverse', '-ar', '48000', '-ac', '1', file]);
    durations.push(Number(probe(file).format.duration));
  }
  await json(`${WORK}/voice/provenance.json`, { ...config, lines });
  return durations;
}
