import fs from 'node:fs/promises';
import { WORK, OUT, VIDEO_STEM, ROOT, ff, assert } from './lib.mjs';
export async function fontCSS() {
  const data = (await fs.readFile(`${ROOT}/demo/fonts/Figtree.ttf`)).toString('base64');
  const css = `@font-face{font-family:Figtree;src:url(data:font/ttf;base64,${data});font-weight:300 900;font-style:normal}`;
  await fs.mkdir(WORK, { recursive: true }); await fs.writeFile(`${WORK}/font.css`, css); return css;
}
export async function edit(captures, timeline) {
  for (const capture of captures) {
    const vertical = capture.format === 'vertical', width = vertical ? 1080 : 1920, height = vertical ? 1920 : 1080;
    const parts = [];
    for (let i = 0; i < timeline.length; i++) {
      const line = timeline[i], beat = capture.beats[i]; assert(beat.id === line.id, 'Capture/timeline order mismatch.');
      const file = `${WORK}/${capture.format}/part-${i}.mp4`; parts.push(file);
      // Full-height portrait crop follows each beat's observed DOM action center.
      const crop = vertical ? `crop=608:1080:${Math.round(Math.max(0, Math.min(1312, beat.focus.x - 304)) / 2) * 2}:0,scale=${width}:${height},` : '';
      const sourceDuration = beat.end - beat.start;
      const frames = Math.round(line.duration * 30);
      // A continuous 1–3% camera move means held footage never freezes.
      const focusX = vertical ? width / 2 : beat.focus.x, focusY = beat.focus.y * height / 1080;
      const zoom = `zoompan=z='1.01+0.02*on/${frames}':x='max(0,min(iw-iw/zoom,${focusX}-iw/zoom/2))':y='max(0,min(ih-ih/zoom,${focusY}-ih/zoom/2))':d=1:s=${width}x${height}:fps=30`;
      ff(['-ss', String(beat.start), '-t', String(sourceDuration), '-i', capture.video, '-i', `${WORK}/voice/${line.id}.wav`,
        '-filter_complex', `[0:v]setpts=(PTS-STARTPTS)*${line.duration / sourceDuration},fps=30,tpad=stop_mode=clone:stop_duration=1,${crop}${zoom}[v];[1:a]apad,atrim=duration=${line.duration},asetpts=PTS-STARTPTS[a]`,
        '-map', '[v]', '-map', '[a]', '-t', String(line.duration), '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-b:a', '160k', '-movflags', '+faststart', file]);
    }
    const list = `${WORK}/${capture.format}/concat.txt`;
    // Paths are generated under this repo; ffmpeg concat escaping still handles apostrophes.
    await fs.writeFile(list, parts.map(p => `file '${p.replaceAll("'", "'\\''")}'`).join('\n'));
    const output = `${OUT}/${VIDEO_STEM}${vertical ? '-vertical' : ''}.mp4`;
    ff(['-copyts', '-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'copy', '-c:a', 'aac', '-af', 'aresample=async=1:first_pts=0', '-b:a', '160k', '-avoid_negative_ts', 'disabled', '-movflags', '+faststart', output]);
  }
}
