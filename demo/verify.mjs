import fs from 'node:fs/promises';
import { alignment } from './alignment.mjs';
import { OUT, VIDEO_STEM, ff, probe, command, assert, json } from './lib.mjs';
export async function verify(origin, timeline) {
  const report = { status: 'automated checks passed; human visual/audio review required', duration: timeline.at(-1).end, checks: [], samples: [] };
  for (const format of ['landscape', 'vertical']) {
    const name = `${VIDEO_STEM}${format === 'vertical' ? '-vertical' : ''}`;
    const file = `${OUT}/${name}.mp4`, info = probe(file), v = info.streams.find(s => s.codec_type === 'video'), a = info.streams.find(s => s.codec_type === 'audio');
    assert(v && a, 'Both video and narration streams are required.');
    assert(Number(v.start_time) === 0 && Number(a.start_time) === 0, 'Voice and video must start at zero.');
    assert(Number(info.format.duration) >= 30 && Number(info.format.duration) <= 40, 'Video must run 30–40 seconds.');
    assert(v.width === (format === 'vertical' ? 1080 : 1920) && v.height === (format === 'vertical' ? 1920 : 1080), 'Wrong export dimensions.');
    assert(Math.abs(Number(a.duration) - Number(v.duration)) < 0.15, 'Audio/video duration mismatch.');
    const diagnostics = command('ffmpeg', ['-hide_banner', '-i', file, '-vf', 'freezedetect=n=-60dB:d=1', '-af', 'silencedetect=noise=-45dB:d=1', '-f', 'null', '-']);
    assert(!/freeze_start|silence_start/.test(diagnostics), 'Freeze or dead air over one second detected.');
    const dir = `${OUT}/frames/${format}`; await fs.mkdir(dir, { recursive: true });
    ff(['-i', file, '-vf', "select='not(mod(n,60))'", '-fps_mode', 'vfr', `${dir}/frame-%02d.png`]);
    const names = (await fs.readdir(dir)).filter(n => n.endsWith('.png')).sort();
    for (const [i, frame] of names.entries()) {
      const text = command('tesseract', [`${dir}/${frame}`, 'stdout', '--psm', '11']);
      assert(!/\b(login|log in|sign in|password)\b/i.test(text), 'Login text in exported frame.');
      const compact = text.toLowerCase().replace(/\s+/g, '');
      assert(!compact.includes(new URL(origin).hostname.toLowerCase()) && !/https?:\/\//i.test(text), 'App URL or unexpected URL detected in exported frame.');
      assert(!/\bSal\b/.test(text), 'Unexpected agent name in exported frame.');
      report.samples.push({ format, frame: `frames/${format}/${frame}`, at: i * 2 });
    }
    report.checks.push(`${format}: geometry, duration, A/V length, no >1s silence/freeze, OCR login/URL/name scan passed`);
  }
  report.audioAlignment = await alignment(timeline);
  await json(`${OUT}/verification.json`, report);
  // Six small, reviewable attachments: three frames from each rendered output.
  await fs.mkdir(`${OUT}/pr`, { recursive: true });
  for (const format of ['landscape', 'vertical']) {
    const name = `${VIDEO_STEM}${format === 'vertical' ? '-vertical' : ''}`;
    for (const [i, id] of ['basket', 'declines', 'slate'].entries()) {
      const line = timeline.find(b => b.id === id);
      ff(['-ss', String(line.end - Math.min(0.4, line.duration / 4)), '-i', `${OUT}/${name}.mp4`, '-frames:v', '1', '-vf', 'scale=960:-2', `${OUT}/pr/${format}-${i + 1}-${id}.png`]);
    }
  }
  await fs.copyFile(`${OUT}/beats.json`, `${OUT}/pr/beats.json`);
  return report;
}
