import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { OUT, WORK, ff, assert, json } from './lib.mjs';
export const normalize = text => text.toLowerCase().replace(/-/g, ' ').replace(/25/g, 'twenty five').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
export async function alignment(timeline) {
  // Decode the exported AAC, rather than trusting the pre-mux narration files.
  const audio = `${WORK}/final-voice.wav`;
  ff(['-i', `${OUT}/sally-demo.mp4`, '-vn', '-ar', '16000', '-ac', '1', audio]);
  const pcm = await fs.readFile(audio);
  const hash = createHash('sha256').update(pcm).digest('hex');
  const cache = `${WORK}/transcript-${hash}.json`;
  let transcript = await fs.readFile(cache, 'utf8').then(JSON.parse).catch(() => null);
  if (!transcript) {
    const form = new FormData(); form.set('model', 'whisper-1'); form.set('language', 'en');
    form.set('response_format', 'verbose_json'); form.append('timestamp_granularities[]', 'word');
    form.set('file', new Blob([pcm], { type: 'audio/wav' }), 'narration.wav');
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form, signal: AbortSignal.timeout(90000) });
    assert(r.ok, `Audio alignment transcription failed (${r.status}); response omitted.`);
    transcript = await r.json(); await json(cache, transcript);
  }
  const expected = timeline.flatMap(line => normalize(line.text).split(' ').map(token => ({ token, id: line.id })));
  const observed = transcript.words.flatMap(word => normalize(word.word).split(' ').map(token => ({ token, start: word.start, end: word.end })));
  // ASR can confuse homophones (e.g. British "rules" / "rolls"). Keep the
  // differences visible, allow at most 5% word error, and still check actual boundaries.
  const dp = Array.from({ length: expected.length + 1 }, () => Array(observed.length + 1).fill(0));
  for (let i = 0; i <= expected.length; i++) dp[i][0] = i;
  for (let j = 0; j <= observed.length; j++) dp[0][j] = j;
  for (let i = 1; i <= expected.length; i++) for (let j = 1; j <= observed.length; j++) dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + Number(expected[i-1].token !== observed[j-1].token));
  const wordErrorRate = dp[expected.length][observed.length] / expected.length;
  assert(wordErrorRate <= 0.05, 'Rendered narration differs from captions; inspect local transcript before publishing.');
  const matched = new Map(), differences = [];
  let i = expected.length, j = observed.length;
  while (i || j) {
    if (i && j && dp[i][j] === dp[i-1][j-1] + Number(expected[i-1].token !== observed[j-1].token)) {
      matched.set(i-1, observed[j-1]);
      if (expected[i-1].token !== observed[j-1].token) differences.push({ expected: expected[i-1].token, heard: observed[j-1].token });
      i--; j--;
    } else if (i && dp[i][j] === dp[i-1][j] + 1) { differences.push({ missing: expected[i-1].token }); i--; }
    else { differences.push({ extra: observed[j-1].token }); j--; }
  }
  const boundaries = [];
  for (const line of timeline) {
    const firstIndex = expected.findIndex(w => w.id === line.id), lastIndex = expected.findLastIndex(w => w.id === line.id);
    const first = matched.get(firstIndex), last = matched.get(lastIndex);
    assert(first && last && Math.abs(first.start - line.start) < 0.75 && Math.abs(last.end - line.end) < 0.75, `Caption/audio boundary mismatch for ${line.id}.`);
    boundaries.push({ id: line.id, captionStart: line.start, speechStart: first.start, captionEnd: line.end, speechEnd: last.end });
  }
  ff(['-i', `${OUT}/sally-demo-vertical.mp4`, '-vn', '-ar', '16000', '-ac', '1', `${WORK}/vertical-voice.wav`]);
  assert(createHash('sha256').update(await fs.readFile(`${WORK}/vertical-voice.wav`)).digest('hex') === hash, 'Portrait narration differs from landscape.');
  const result = { method: 'Whisper word timestamps from final decoded AAC; <=5% word error, line boundaries within 750ms; identical audio in both exports', wordErrorRate, differences, boundaries };
  await json(`${OUT}/audio-alignment.json`, result); return result;
}
