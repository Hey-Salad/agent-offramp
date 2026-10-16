# Acceptance ledger — revised 16 October 2026

The follow-up request supersedes the original caption requirement: remove captions and fix the slow voice. The original edit stretched roughly 22 seconds of speech to 32 seconds. The revised edit preserves narration at 1×, expands the script to retain the original 30–40 second goal, and retimes footage only.

- [x] `npm run demo` rebuilds both formats using actual app captures and natural Marin narration.
- [x] No burned captions; app content and rendered end slate remain.
- [x] Audio is never time-stretched; every timeline entry has `playbackRate: 1` and each shot exceeds its original voice duration by less than one frame.
- [x] Both outputs run 30–40 seconds, start at zero, and pass geometry/A/V/silence/freeze checks.
- [x] Real test payments/approval and Stripe-backed declines asserted for both passes.
- [x] Every two-second sample checked for login/target URLs and absence of caption overlays; six new PR frames and actual beats replace old evidence.
- [x] Syntax, timing/safety tests, app type checks and staged privacy checks pass. Existing PR updated without merging or force-pushing.


## Observed evidence

- `npm run demo` exited 0. Both exports: 33.533333 seconds, H.264/AAC, audio and video start at 0.000s and end together.
- All eight source voice lines play at 1×. Only footage is retimed. No caption inputs or overlay filter remain in the editor.
- All 34 samples (0, 2, …, 32 seconds for each export) passed OCR and were visually inspected in contact sheets: no caption pills, login screens or target URLs. Six representative PR frames were refreshed.
- Both formats passed the >1s silence/freeze checks and have identical decoded narration. Final AAC transcription checked against the expanded script and shot boundaries; see the audio-alignment report for measured ASR differences. Audio verification is automated, not a claim of human listening.
- Real Stripe test-mode payments, £32.50 approval and both Stripe-backed declines passed in both capture runs. Test simulation remains rejected.
- `npm run lint`, all JavaScript syntax checks, `npm run demo:test` (3/3), and whitespace/privacy checks passed.
