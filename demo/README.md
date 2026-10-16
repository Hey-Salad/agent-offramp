# Sally demo video

After `npm ci` and `npx playwright install chromium`, install FFmpeg (including ffprobe) and Tesseract. Set `APP_URL`, `ELEVENLABS_API_KEY` and `OPENAI_API_KEY` in the environment or ignored `demo/.env`, then run from the repository root:

```sh
npm run demo
```

Outputs: `demo/out/sally-demo.mp4` (1920×1080) and `demo/out/sally-demo-vertical.mp4` (1080×1920), 30fps H.264/AAC. **No captions and no music. ElevenLabs Megan (a soft British female voice) plays at natural 1× speed.** The source script is long enough to run 30–40 seconds; the pipeline fails if a take falls outside that range, rather than stretching speech. Node 22+ is required.

The target must be the app from `feat/viral-cleanup-ui`, reachable without login, configured with **Stripe test keys** and Issuing enabled. Each format makes a real test-mode restock/approval payment and two test authorizations. Rebuilds add test records; use a dedicated test instance. No production deployment or dashboard login is needed. Configuration, raw footage and working audio stay ignored.

## Rebuild stages

1. `voice.mjs` calls ElevenLabs `eleven_multilingual_v2`, voice **Megan**, at speed 1, one short line per beat. `ELEVENLABS_VOICE_ID` and `ELEVENLABS_VOICE_NAME` can override the default using a voice accessible to your account. Takes are content-addressed and cached under `demo/work/voice`; delete that directory to regenerate. Only leading/trailing silence is removed. Audio is never slowed down or sped up. Measured durations determine shot lengths, rounded up by less than one video frame per line. The hook leads with saving time and money.
2. `record.mjs` uses Chromium `recordVideo`, 1920×1080 and CSS 125% zoom. A black sync marker maps monotonic action times to real video timestamps at 25fps precision. Page loading happens before the hook. Results are held at least 1.5 seconds before editing. Real test payment/authorization responses and UI results are asserted; policy-only declines fail. External requests/navigation, login screens and visible target URLs are rejected. App addresses are excluded from logs and saved metadata.
3. Portrait records another real pass with the same viewport/zoom and a narrow content column, preserving amounts, statuses and rule reasons. DOM action coordinates determine each beat's full-height 9:16 crop, without letterboxing. It makes another test restock and approval. Neither pass stubs results or rewrites decisions. The cursor is rendered because Playwright video omits the native pointer.
4. `edit.mjs` changes **footage speed only**, adds gentle continuous camera motion, and muxes unchanged narration. There is no caption renderer or overlay input. Brief source-end padding remains animated by the camera move. The closing Cream `#fff8f6` slate is rendered local `slate.html`, never a GitHub page. It uses bundled Figtree 800 (OFL included) and discloses the AI voice. Voice and video start at 0.0s.
5. `verify.mjs` checks geometry/duration, A/V length, >1s freeze/silence, and extracts both outputs every two seconds for OCR login/URL/name checks. `alignment.mjs` uses OpenAI `whisper-1` timestamps on final decoded AAC, compares narration with the script (at most 5% ASR word error; differences reported), and verifies shot boundaries within 750ms. Both formats must decode to identical narration. TTS uses `ELEVENLABS_API_KEY`; transcription uses `OPENAI_API_KEY`. Both incur API usage.

`demo/out/beats.json` contains measured source start/end times, action centers, original voice durations, natural playback rate and final shot intervals. `audio-alignment.json` and `verification.json` provide machine evidence. `demo/out/pr/` holds six representative frames (basket, declines and slate in both formats) plus `beats.json`. Nothing uploads automatically.

Inspect every image under `demo/out/frames/{landscape,vertical}` and play both MP4s before sharing. Check readable declines, receipts and rule reasons, no caption pills, no login/target URLs, and natural speech. Copy only reviewed evidence into `demo/evidence/` for the PR; full outputs/work remain ignored. Do not merge as part of generating the demo.

Tests: `npm run demo:test` covers configuration safety and timing without API calls, including the invariant that narration stays at 1×. `npm run lint` runs existing app type checks. `npm run demo` is the real media integration gate.

API contracts: [ElevenLabs speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [OpenAI transcription](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).

## British and Irish comparison

`npm run demo` keeps Megan as the default British voice and writes the original `demo/out/sally-demo.mp4` and vertical companion. Run `npm run demo:irish` for the fixed **Jessica Gallagher (Irish)** preset, at natural 1× speed with the same walkthrough and no captions. Its slightly longer Sally introduction keeps this faster voice within 30–40 seconds without stretching audio. This writes:

- `demo/out/irish/sally-demo-irish.mp4`
- `demo/out/irish/sally-demo-irish-vertical.mp4`

Irish recordings, audio cache, beat timestamps, frame samples and reports are isolated under `demo/work/irish/` and `demo/out/irish/`. Rebuilding either profile preserves the other profile's outputs. The Irish preset takes precedence over generic voice ID/name overrides so comparison runs consistently use Jessica. Each full run still makes the documented Stripe test-mode operations. Reviewed Irish PR evidence lives in `demo/evidence/irish/`; the original British evidence remains in `demo/evidence/`.
