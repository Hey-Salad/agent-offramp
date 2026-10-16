import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { performance } from 'node:perf_hooks';
import { WORK, assert, command, json } from './lib.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function record(origin, format) {
  const portrait = format === 'vertical';
  const dir = `${WORK}/${format}`; await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir, size: { width: 1920, height: 1080 } }, serviceWorkers: 'block' });
  // Only the target app and font sources may be requested. No dashboard or external navigation.
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    return [origin, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(u.origin) ? route.continue() : route.abort();
  });
  await context.addInitScript(({ portrait }) => {
    document.addEventListener('DOMContentLoaded', () => {
      const css = document.createElement('style');
      css.textContent = `html{zoom:1.25;scroll-behavior:smooth}#demo-cursor{position:fixed;width:30px;height:30px;border:3px solid #ed4c4c;border-radius:50%;background:#ed4c4c33;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%)}${portrait ? 'main{max-width:470px!important}.hide-m{display:none!important}table{table-layout:fixed}td:nth-child(1),th:nth-child(1){width:24%}td:nth-child(2),th:nth-child(2){width:18%;white-space:nowrap}td:nth-child(3),th:nth-child(3){width:21%}td:nth-child(4),th:nth-child(4){width:37%}.pill{white-space:nowrap}td:nth-child(4) span.hide-m{display:inline!important}code{overflow-wrap:anywhere}#log{max-width:470px!important;padding-left:12px!important;padding-right:12px!important}.dock{width:440px!important}.chips{display:none!important}.top nav{font-size:11px}header nav{display:none!important}' : ''}`;
      document.head.append(css);
      const cursor = document.createElement('div'); cursor.id = 'demo-cursor'; document.body.append(cursor);
      document.addEventListener('mousemove', e => { const zoom = Number(getComputedStyle(document.documentElement).zoom) || 1; cursor.style.left = e.clientX / zoom + 'px'; cursor.style.top = e.clientY / zoom + 'px'; });
    });
  }, { portrait });
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  let zero, recordId; const beats = [];
  async function safe() {
    assert(new URL(page.url()).origin === origin, 'Unexpected app navigation; recording stopped.');
    const text = await page.locator('body').innerText();
    assert(!/\b(sign in|log in|login|password)\b/i.test(text), 'Login page detected; recording stopped.');
    assert(!text.includes(origin) && !text.includes(new URL(origin).hostname), 'App URL visible in page text; recording stopped.');
    assert(!/\bSal\b/.test(text), 'Unexpected agent name in app.');
  }
  async function moveClick(locator) {
    await locator.waitFor({ state: 'visible' });
    const b = await locator.boundingBox(); assert(b, 'Action not visible.');
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
    await locator.click();
  }
  async function authorize(name) {
    let payload;
    const endpoint = origin + '/api/issuing/test-auth';
    await page.route(endpoint, async route => {
      const response = await route.fetch();
      payload = { ok: response.ok(), data: await response.json() };
      await route.fulfill({ response });
    });
    const reload = page.waitForEvent('framenavigated', frame => frame === page.mainFrame());
    await moveClick(page.getByRole('button', { name, exact: true }));
    await reload; await page.waitForLoadState('networkidle'); await page.unroute(endpoint);
    assert(payload?.ok, 'Stripe authorization request failed.');
    return payload.data;
  }
  async function hold() { await safe(); await sleep(1500); }
  async function beat(id, action, focus) {
    const start = (performance.now() - zero) / 1000;
    await action(); await safe();
    const b = await page.locator(focus).first().boundingBox();
    assert(b, `Missing focus for ${id}.`);
    const center = Math.max(304, Math.min(1616, b.x + b.width / 2));
    beats.push({ id, start, end: (performance.now() - zero) / 1000, focus: { x: center, y: Math.max(200, Math.min(880, b.y + b.height / 2)) }, resultHoldSeconds: id === 'hook' ? 0 : id === 'slate' ? 1.7 : 1.5 });
    console.log(`Recorded ${format}: ${id}`);
  }
  async function scroll(selector = 'html') {
    await page.locator(selector).evaluate(el => new Promise(resolve => {
      const start = el.scrollTop, started = performance.now();
      const step = now => {
        const progress = Math.min(1, (now - started) / 1800);
        el.scrollTo({ top: start + 220 * (0.5 - Math.cos(Math.PI * progress) / 2), behavior: 'instant' });
        progress < 1 ? requestAnimationFrame(step) : resolve();
      };
      requestAnimationFrame(step);
    }));
  }
  try {
    // A full black sync marker provides a real video timestamp, independent of browser startup latency.
    await page.goto(origin + '/', { waitUntil: 'networkidle' }); await safe();
    await page.evaluate(() => { const marker = document.createElement('div'); marker.id = 'sync-marker'; marker.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647'; document.body.append(marker); }); await sleep(800);
    zero = performance.now();
    await page.evaluate(() => document.querySelector('#sync-marker').remove());
    await beat('hook', async () => { await safe(); assert(await page.getByText('Stripe test mode', { exact: true }).count(), 'Test-mode indicator required.'); await page.locator('#q').pressSequentially('restock', { delay: 95 }); }, '.dock');
    await beat('basket', async () => {
      const response = page.waitForResponse(r => r.url() === origin + '/api/chat' && r.request().method() === 'POST');
      await moveClick(page.locator('#send')); const r = await response; assert(r.ok(), 'Restock failed.');
      const j = await r.json(); const rec = j.record; recordId = rec?.id;
      assert(rec?.stripe?.auto?.status === 'succeeded' && /^pi_/.test(rec.stripe.auto.paymentIntent), 'A real Stripe test payment is required.');
      assert(rec.decisions.some(d => d.supplier === 'Waitrose' && d.status === 'auto_paid') && rec.decisions.some(d => d.supplier === 'Bidfood' && d.status === 'needs_approval') && rec.decisions.some(d => d.supplier === 'Amazon' && d.status === 'blocked'), 'Unexpected restock decisions.');
      await page.locator('.co').filter({ hasText: 'Amazon' }).waitFor();
      if (await page.locator('#panel.open').count()) await moveClick(page.getByRole('button', { name: 'Close', exact: true }));
      await page.locator('#log').evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })); await sleep(500); await hold();
    }, '.co');
    await beat('approve', async () => {
      const response = page.waitForResponse(r => r.url().endsWith(`/r/${recordId}/approve`) && r.request().method() === 'POST');
      await moveClick(page.locator('#log').getByRole('button', { name: 'Approve £32.50', exact: true }).last());
      const r = await response; assert(r.ok(), 'Approval failed.'); const j = await r.json();
      assert(j.status === 'paid' && j.stripe?.approved?.status === 'succeeded', 'Approval payment did not succeed.');
      await page.locator('#log .co .tick').last().waitFor();
      if (await page.locator('#panel.open').count()) await moveClick(page.getByRole('button', { name: 'Close', exact: true }));
      await hold();
    }, '.co:last-child');
    await beat('attempt', async () => {
      await page.goto(origin + '/card', { waitUntil: 'networkidle' }); await safe();
      // Require a real test-mode virtual card before authorizing.
      if (await page.getByRole('button', { name: "Issue Sally's card" }).count()) {
        const r = await context.request.post(origin + '/api/issuing/card'); const j = await r.json();
        assert(r.ok() && j.ok && /^ic_/.test(j.card), 'A real Stripe test virtual card is required.'); await page.reload({ waitUntil: 'networkidle' });
      }
      const j = await authorize('£80 at Ocado');
      assert(j.ok && /^iauth_/.test(j.authorization) && j.approved === false && !j.simulated, 'Overspend must be declined by Stripe, not policy simulation.');
      await hold();
    }, 'main');
    await beat('declines', async () => {
      const j = await authorize('£10 at an off-licence');
      assert(j.ok && /^iauth_/.test(j.authorization) && j.approved === false && !j.simulated, 'Category must be declined by Stripe.');
      await page.locator('td .pill.no').nth(1).waitFor();
      await page.getByRole('heading', { name: 'Authorisations', exact: true }).evaluate(el => { window.scrollBy({ top: el.getBoundingClientRect().top - 120, behavior: 'smooth' }); });
      await sleep(700);
      const resultBox = await page.locator('td .pill.no').first().boundingBox();
      await page.mouse.move(resultBox.x + resultBox.width / 2, resultBox.y + resultBox.height / 2, { steps: 20 });
      await hold();
    }, 'table');
    await beat('receipt', async () => {
      await page.goto(origin + '/payments', { waitUntil: 'networkidle' }); await safe(); await hold();
      const row = page.locator('tr').filter({ has: page.locator(`a[href="/r/${recordId}"]`) }).first();
      await moveClick(row.getByRole('link', { name: 'Receipt', exact: true }));
      await page.waitForURL(u => u.pathname === `/receipt/${recordId}`); await hold(); await scroll();
    }, '.rc');
    await beat('audit', async () => { await page.goto(origin + '/audit', { waitUntil: 'networkidle' }); await hold(); await scroll(); }, 'table');
    await beat('slate', async () => {
      // Local rendered HTML, never a GitHub browser page.
      await page.setContent(await fs.readFile(new URL('./slate.html', import.meta.url), 'utf8'));
      await page.addStyleTag({ content: await fs.readFile(`${WORK}/font.css`, 'utf8') });
      await page.evaluate(() => document.fonts.ready); await sleep(1700);
    }, 'main');
  } finally { await context.close(); await browser.close(); }
  const raw = await page.video().path();
  const log = command('ffmpeg', ['-hide_banner', '-i', raw, '-vf', 'blackdetect=d=0.1:pix_th=0.02', '-an', '-f', 'null', '-']);
  const sync = /black_start:[\d.]+ black_end:([\d.]+)/.exec(log);
  assert(sync, 'Video synchronization marker missing.');
  const offset = Number(sync[1]);
  for (const b of beats) { b.start += offset; b.end += offset; }
  const result = { format, video: raw, clock: 'Monotonic action clock aligned to blackdetect marker; 25fps capture resolution', syncEnd: offset, beats };
  await json(`${dir}/capture.json`, result); return result;
}
