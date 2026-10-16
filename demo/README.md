# Sally demo video

From the repository root, after `npm ci` and `npx playwright install chromium`, install FFmpeg (including ffprobe) and Tesseract on your machine. Set `APP_URL` and `OPENAI_API_KEY` in your environment or the ignored `demo/.env`, then:

```sh
npm run demo
```

Outputs are `demo/out/sally-demo.mp4` (1920×1080) and `demo/out/sally-demo-vertical.mp4` (1080×1920). The edit is 32 seconds, 30fps H.264/AAC with no music. Run from the repo root. Node 22+ is required.

The target must be the app from `feat/viral-cleanup-ui`, reachable without login, configured with **Stripe test keys** and Issuing enabled. The pipeline makes real test-mode restock/approval payments and two test authorizations per format. Rebuilds add test records; use a dedicated test instance. No production deployment or dashboard login is needed. Do not share or commit `.env`, raw captures, or working audio.

## How it rebuilds

1. `voice.mjs` calls OpenAI `gpt-4o-mini-tts`, voice `marin`, one short line per beat. Takes are content-addressed and cached locally under `demo/work/voice`; delete that directory to regenerate. FFmpeg removes only leading/trailing silence. Measured audio durations set the cuts, with a uniform pitch-preserving tempo adjustment to 32 seconds. Implausible takes fail rather than padding dead air. The hook leads with saving time and money. Receipt/audit split one sentence into two short lines.
2. `record.mjs` uses Chromium `recordVideo`, 1920×1080 and CSS 125% zoom. A black sync marker is detected in the saved video, so monotonic action times map to real capture timestamps (25fps precision). Page loading happens before the hook. Every result is held for at least 1.5 seconds before editing. Test payment/authorization responses and UI results are asserted. Policy-only declines fail. External requests/navigation, login screens and visible target URLs are rejected. The app address never enters saved metadata or console messages.
3. Portrait uses a separate real capture with the same viewport/zoom, a narrow content column and hidden Stripe-ID column. Amount, status and rule remain visible. DOM action coordinates define each beat's full-height 9:16 crop. This is a crop of actual app content, without letterboxing; it makes another test restock and approval. Neither pass stubs network results or rewrites decisions. The cursor is rendered because Playwright video omits the native pointer.
4. `edit.mjs` burns browser-rendered Figtree **800** captions (white on rounded Cherry `#ed4c4c` pills) into FFmpeg clips. The bundled variable Figtree font supports ExtraBold; its OFL is included. Each shot gets a continuous gentle camera zoom; no frozen-frame padding. The closing Cream `#fff8f6` slate is local `slate.html`, never GitHub in a browser. Caption and speech begin at 0.0s. AI voice disclosure is on the slate.
5. `verify.mjs` checks codec geometry/duration, A/V length, >1s freeze/silence, samples **both outputs every two seconds**, OCR-scans login/URLs/name, and checks caption bounds. `alignment.mjs` uses OpenAI `whisper-1` word timestamps on the final exported AAC, compares the normalized transcript with all captions (at most 5% ASR word error, with differences reported) and verifies line boundaries within 750ms. Both formats must decode to identical narration. TTS and transcription use the provided OpenAI key and incur API usage.

`demo/out/beats.json` contains actual source start/end times, action centers, voice durations, tempo and final caption/cut intervals. `caption-bounds.json`, `audio-alignment.json` and `verification.json` provide machine evidence. `demo/out/pr/` contains six representative frames (basket, declines, slate in both formats) plus `beats.json` for attaching to a PR. Nothing is uploaded automatically.

## Review before sharing

Inspect every image in `demo/out/frames/{landscape,vertical}` at full size and play both MP4s. Check that the newest £80 and £10 rows and their red declines are readable, captions are complete, receipts/rules remain visible, and speech matches the captions and action. OCR and duration checks supplement this visual review. Generated outputs/work are ignored; only copy reviewed, secret-free evidence into `demo/evidence/` if it is intended for the PR. Link those six images and the JSON in the PR description. Do not merge as part of generating the demo.

Tests: `npm run demo:test` checks input safety and measured timing failures without API calls. `npm run lint` covers the app's existing type checks. The real `npm run demo` is the media integration gate; no fixture video substitutes for it.

API contracts: [OpenAI speech](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create), [OpenAI transcription](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).
