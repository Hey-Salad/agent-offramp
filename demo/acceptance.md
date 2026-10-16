# Acceptance ledger (registered before implementation)

- [x] `npm run demo` records APP_URL, generates Marin TTS and builds both MP4s without manual editing.
- [x] Real test-mode basket, approval, Stripe-backed declines, newest restock receipt and audit are asserted while recording. No Stripe dashboard navigation.
- [x] Raw capture is Chromium 1920×1080 at 125% zoom; cursor, smooth scroll, result holds ≥1.5 seconds; actual capture start/end times persisted.
- [x] Outputs: 30–40 seconds, 1920×1080 and 1080×1920, portrait action reframed, moving footage, no music, no >1 second freeze/silence.
- [x] Caption and voice start at zero; measured voice durations drive cuts; Figtree 800 white/cherry rounded pills, cream HTML end slate.
- [x] Frames every two seconds from both exports checked for login/URL leaks and clipped captions; six PR frames and beats.json attached.
- [x] Static checks, app build/type checks, targeted pipeline failure tests and real end-to-end execution pass. Missing credentials must remain explicitly unverified.


## Observed evidence — 16 October 2026

- `npm run demo` exited 0 against the configured app. Both capture passes asserted successful test PaymentIntents, the £32.50 approval, and real Stripe `iauth_` declines (simulation rejected).
- FFprobe: landscape 1920×1080, portrait 1080×1920, both containers/audio 32.000s. Video/audio start at 0.000s. Portrait video stream is 31.900s with a 100ms final audio tail, inside the 150ms A/V gate and under the one-second freeze limit.
- Both FFmpeg scans: no silence or freeze over one second. Both formats have identical decoded narration.
- All 32 frames (0, 2, …, 30 seconds in each export) OCR-scanned and visually inspected in contact sheets; representative basket, declines and slate frames also opened at full size. No login screens, target URLs or clipped captions found. Portrait shows both newest decline amounts/statuses/reasons together; audit includes plain-language rule reasons.
- Caption bounds passed for all eight lines in each format. Final AAC transcribed with Whisper word timestamps: all line boundaries within 750ms, 3.33% ASR word error ("rules"/"rolls", "tried"/"try"), with differences retained in the report. Speech starts at 0.0s. This is machine audio verification, not a claim of human listening.
- `npm run lint` exited 0; `npm run demo:test` passed 3/3; all demo JavaScript syntax checks and `git diff --check` passed. Existing app UI smoke tests passed 30/30 against the configured target. No standalone build script exists; the app's TypeScript check and real browser execution are the relevant build/runtime checks.
- Six reviewed frames, actual `beats.json`, caption bounds and verification reports are in `demo/evidence/`. Full MP4s and all two-second frames remain under ignored `demo/out/`.
