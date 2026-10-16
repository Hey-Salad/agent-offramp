# Agent 9 demo pipeline

`npm run demo` builds `demo/out/agent9-demo.mp4` (1920×1080) and `demo/out/agent9-demo-vertical.mp4` (1080×1920). It records nine genuine Stripe test workflows, using the committed [shotlist](shotlist.md). The original overview is validated at 50–60 seconds and preserved in `demo/out/overview/`. The default export combines it with four real chat journeys (about 105 seconds), as requested in the later chat-first direction.

## Setup

Install Node dependencies with `npm ci`, Chromium with `npx playwright install chromium`, and system `ffmpeg`/`ffprobe` and `tesseract`. Run from a graphical desktop: Chromium is headed. The browser viewport and recording are 1920×1200 at device scale 1.

Set these environment variables, or put them in the ignored `demo/.env` (chmod 600). Never put values in shell arguments, logs, screenshots or Git:

- `STRIPE_SECRET_KEY`: an `sk_test_` key with Payments, Checkout, Payment Links, Invoicing, Connect, Billing, shared-payment test helpers and Agent Toolkit access.
- `ELEVENLABS_API_KEY`: access to Jessica Gallagher (Irish), voice ID `DbwWo4rVEd5NrejHYUnm`, model `eleven_multilingual_v2`.
- `APP_URL`: the existing hosted **test-mode** app, used for the Issuing scene and the original-interface chat walkthrough. Its server must already have an active test card, £50 spending limit, the £80 test authorization button and a working Stripe output panel. This URL is never rendered or logged.

The other eight scenes run on an automatically started local app with an ephemeral port. The runner explicitly enables AGENT9_DEMO=1; the additional workspace is otherwise disabled. Its fixed commands and timestamped audit records follow recording rule D1 in policy.md. The local child gets only its test Stripe key; no Issuing, messaging or Cognee credentials. No hosted deployment occurs. The command prepares Connect's test venue and waits up to five minutes for its transfers capability to activate. If verification remains pending, it fails clearly; rerun when Stripe finishes verification. No simulated decline or Toolkit SDK fallback is accepted. Unavailable features fail the build.

## Rebuild and inspect

```sh
npm run demo
npm run demo -- --scene=9
npm run demo -- --resume
npm run demo -- --edit-only
npm run demo -- --verify-only
npm run demo -- --combine-only
npm run demo -- --walkthrough-only
npm run demo -- --overview-only
```

The first command regenerates fresh financial scenes. `--scene=N` replaces just one saved source scene (0–10), then rebuilds both edits and all evidence. `--resume` continues after the last successfully saved scene when a feature was temporarily unavailable. Voice synthesis is cached privately by request hash. Editing and verification can be rerun without repeating financial actions. ElevenLabs synthesis consumes the account's normal API allowance; Stripe actions use test money only. Invoices remain drafts, Checkout remains unpaid and Payment Links remain uncollected. No customer email is sent by this pipeline.

`demo/work/agent9/raw/scene-00.mp4` through `scene-10.mp4` are separate source clips, including opening and closing. `demo/out/clips/` contains edited landscape/vertical scenes. A black sync marker, outside the final edit, synchronizes browser-clock beat timestamps to actual recorded video. `beats.json` records source phase times, marker offsets, final cuts and real read-back proof. Cuts are derived from those measurements.

Each scene keeps ~1s before, retimes its measured action to 47 frames, then plays the actual proof recording at normal speed. Natural voice begins with the proof; only action footage changes speed. No music, subtitles, captions, zoom, pan or camera animation. Hard cuts only. The vertical crop is fixed at x=772, y=0, width=608, height=1080 in the source content column, then scaled to 1080×1920; the sidebar stays outside it. The hosted scene uses the same content column via a checked-in presentation-only stylesheet. No Stripe data is modified by capture styling or network observation.

The opening is rendered HTML with the unmodified official Stripe slate wordmark and nine original line icons. The closing is rendered HTML with the original HeySalad logo and exact tagline. No GitHub or Stripe Dashboard page is recorded.

## Proof and verification

- `demo/out/proof/`: nine product-name frames per format.
- `demo/out/proof-table.md`: first product phoneme timestamp, Stripe prefix, status and voice line.
- `demo/out/beats.json`, `timeline.json`: actual capture and edit timing; no environment values.
- `demo/out/qa/`: frames every 2s in both formats, OCR results, measured PCM correlation against each original voice line, and machine checks.

Provider character timestamps identify the first product phoneme. The extraction time rounds up to the next video frame, with the proof already visible. ffprobe checks dimensions, stream counts, A/V starts and duration. PCM correlation measures the final narration offset within 50ms; OCR checks readable statuses and unwanted login/URL text. Review all proof images and two-second contact sheets visually before publishing: OCR alone cannot certify layout or style.

Run `npm run lint`, `npm run test:agent9`, and the existing read-only UI tests against a running test app (`SALLY_URL=… node test/ui.test.mjs`). The existing full `npm test` also performs local Issuing actions; it is intentionally not used for this recording because Issuing is explicitly assigned to the hosted app.

Only the plan, source/assets, proof frames, timing JSON, verification evidence and proof table belong in the PR. Voice caches, raw recordings, final MP4s and credentials stay ignored. Add selected generated evidence explicitly with `git add -f`, after checking it for secrets. Do not merge or deploy as part of the video build.

## Original-interface journeys

See [the browser-driver walkthrough](walkthrough.md) for real receipts, invoices, deposit checkout, exact click paths, screenshots and the draft-detail display issue found during exploration. Working test URLs are kept in the ignored local walkthrough guide.

## Combined, chat-first cut

The default build keeps the nine products in their original order, removes the original closing slate, adds a continuous request-to-document walkthrough, then restores the same closing slate. `--overview-only` rebuilds just the 59-second overview under `demo/out/overview/`. `--walkthrough-only` records fresh chat journeys and combines them with that saved overview. `--combine-only` edits and verifies already-recorded sources without calling Stripe or ElevenLabs. `--edit-only` rebuilds both from saved raw sources.

The walkthrough types four real requests in the original hosted Chat: restock; table for six; a £120 customer invoice draft; and the matched supplier invoice. It opens the real links from Sally's response: itemised receipt → Stripe receipt; booking → Stripe Sandbox checkout; supplier record → Stripe invoice → payment details. Every chat response is genuine and recorded continuously with its document navigation. The receipt covers automatically paid Waitrose and Bidfood lines together. Held restock items remain held, customer invoices stay unsent, and checkout stays unpaid. The matched supplier-bill example is paid automatically using existing deterministic test policy. No Dashboard navigation or hosted deployment occurs.

`demo/walkthrough-record.mjs` measures actual browser phases, detects the sync marker, and splits the continuously recorded journeys into eight source scenes under the ignored `demo/work/combined/raw/`. `demo/combine.mjs` uses those timestamps for cuts and fixed portrait crops on the current action area. The invoice detail panel cuts to its download controls as they are named, without a moving crop. Narration starts after each response or named document becomes visible. The original clips are reused without video re-encoding, with one closing slate at the end. All 19 voice lines are checked against final audio by PCM correlation. Both formats have identical narration.

`demo/out/proof/` contains 17 evidence frames per format: the original nine product proofs and eight walkthrough results. The proof table and beats JSON describe the combined cut. The overview retains its separate proof/QA files. Every two-second combined frame is extracted and checked for logins and exposed app origins. Public Stripe pages keep their genuine native colours and merchant support links; the original app remains white/ink through presentation-only capture CSS. No captions, music or camera motion are added.

## Social exports

`npm run demo:social` builds and checks the eight-second Issuing loop from the combined recording: `demo/out/agent9.gif`, `agent9-x.mp4`, and `agent9-square.mp4`. The small social files are committed for README/X use; full-length video and private captures remain ignored. See [candidate choices and verification](social.md). The GIF is embedded near the top of the repository README. Theme previews and all-frame security checks are under `demo/out/gif-proof/`.
