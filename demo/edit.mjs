import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { WORK, OUT, ROOT, ff, assert, json } from './lib.mjs';
export async function fontCSS() {
  const data = (await fs.readFile(`${ROOT}/demo/fonts/Figtree.ttf`)).toString('base64');
  const css = `@font-face{font-family:Figtree;src:url(data:font/ttf;base64,${data});font-weight:300 900;font-style:normal}`;
  await fs.mkdir(WORK, { recursive: true }); await fs.writeFile(`${WORK}/font.css`, css); return css;
}
export async function edit(captures, timeline) {
  const browser = await chromium.launch();
  const captionBounds = [];
  try {
    for (const capture of captures) {
      const vertical = capture.format === 'vertical', width = vertical ? 1080 : 1920, height = vertical ? 1920 : 1080;
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const parts = [];
      for (let i = 0; i < timeline.length; i++) {
        const line = timeline[i], beat = capture.beats[i]; assert(beat.id === line.id, 'Capture/timeline order mismatch.');
        const caption = `${WORK}/${capture.format}/caption-${i}.png`;
        await page.setContent(`<style>${await fs.readFile(`${WORK}/font.css`, 'utf8')}*{box-sizing:border-box}body{margin:0;background:transparent;font-family:Figtree}#pill{position:absolute;left:50%;bottom:${vertical ? 240 : 55}px;transform:translateX(-50%);max-width:${width - 140}px;width:max-content;border-radius:42px;background:#ed4c4c;color:#fff;padding:18px 34px;font-weight:800;font-size:${vertical ? 52 : 48}px;line-height:1.18;text-align:center}</style><div id="pill"></div>`);
        await page.locator('#pill').evaluate((el, text) => el.textContent = text, line.text);
        await page.evaluate(() => document.fonts.ready);
        const box = await page.locator('#pill').boundingBox();
        assert(box.x >= 60 && box.x + box.width <= width - 60 && box.y >= 60 && box.y + box.height <= height - 50, 'Caption outside safe area.');
        captionBounds.push({ format: capture.format, id: line.id, ...box });
        await page.screenshot({ path: caption, omitBackground: true });
        const file = `${WORK}/${capture.format}/part-${i}.mp4`; parts.push(file);
        // Full-height portrait crop follows each beat's observed DOM action center.
        const crop = vertical ? `crop=608:1080:${Math.round(Math.max(0, Math.min(1312, beat.focus.x - 304)) / 2) * 2}:0,scale=${width}:${height},` : '';
        const sourceDuration = beat.end - beat.start;
        const frames = Math.round(line.duration * 30);
        // A continuous 1–3% camera move means held footage never freezes.
        const focusX = vertical ? width / 2 : beat.focus.x, focusY = beat.focus.y * height / 1080;
        const zoom = `zoompan=z='1.01+0.02*on/${frames}':x='max(0,min(iw-iw/zoom,${focusX}-iw/zoom/2))':y='max(0,min(ih-ih/zoom,${focusY}-ih/zoom/2))':d=1:s=${width}x${height}:fps=30`;
        ff(['-ss', String(beat.start), '-t', String(sourceDuration), '-i', capture.video, '-i', `${WORK}/voice/${line.id}.wav`, '-loop', '1', '-i', caption,
          '-filter_complex', `[0:v]setpts=(PTS-STARTPTS)*${line.duration / sourceDuration},fps=30,${crop}${zoom}[shot];[shot][2:v]overlay=0:0:shortest=1[v];[1:a]atempo=${line.tempo},apad,atrim=duration=${line.duration},asetpts=PTS-STARTPTS[a]`,
          '-map', '[v]', '-map', '[a]', '-t', String(line.duration), '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-b:a', '160k', '-movflags', '+faststart', file]);
      }
      await page.close();
      const list = `${WORK}/${capture.format}/concat.txt`;
      // Paths are generated under this repo; ffmpeg concat escaping still handles apostrophes.
      await fs.writeFile(list, parts.map(p => `file '${p.replaceAll("'", "'\\''")}'`).join('\n'));
      const output = `${OUT}/sally-demo${vertical ? '-vertical' : ''}.mp4`;
      ff(['-copyts', '-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'copy', '-c:a', 'aac', '-af', 'aresample=async=1:first_pts=0', '-b:a', '160k', '-avoid_negative_ts', 'disabled', '-movflags', '+faststart', output]);
    }
  } finally { await browser.close(); }
  await json(`${OUT}/caption-bounds.json`, captionBounds);
}
