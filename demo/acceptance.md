# Acceptance ledger — revised 16 October 2026

The follow-up request supersedes the original caption requirement: remove captions and fix the slow voice. The original edit stretched roughly 22 seconds of speech to 32 seconds. The revised edit preserves narration at 1×, expands the script to retain the original 30–40 second goal, and retimes footage only.

- [x] `npm run demo` rebuilds both formats using actual app captures and natural ElevenLabs British narration.
- [x] No burned captions; app content and rendered end slate remain.
- [x] Audio is never time-stretched; every timeline entry has `playbackRate: 1` and each shot exceeds its original voice duration by less than one frame.
- [x] Both outputs run 30–40 seconds, start at zero, and pass geometry/A/V/silence/freeze checks.
- [x] Real test payments/approval and Stripe-backed declines asserted for both passes.
- [x] Every two-second sample checked for login/target URLs and absence of caption overlays; six new PR frames and actual beats replace old evidence.
- [x] Syntax, timing/safety tests, app type checks and staged privacy checks pass. Existing PR updated without merging or force-pushing.


## British voice acceptance (registered before rebuild)

- [x] ElevenLabs Megan is available to the configured account and speech generation succeeds at speed 1.
- [x] Final metadata identifies ElevenLabs and Megan; no secrets or app URLs enter committed evidence.
- [x] Both fresh exports and all sampled frames pass the existing checks; refreshed evidence and existing PR updated without merging.


## Observed evidence — British voice rebuild

- Voice listing and all eight ElevenLabs speech requests succeeded for Megan, a British female voice available in the configured account. Model: `eleven_multilingual_v2`; voice setting speed 1; no post-generation tempo changes.
- `npm run demo` exited 0. Both exports are 30.533333 seconds, 1920×1080 and 1080×1920, with matching audio/video start at zero and matching end times.
- Both outputs pass silence/freeze checks at one second. All 32 two-second samples were OCR-scanned and visually reviewed in contact sheets: no captions, login pages or target URLs.
- Final decoded narration is identical in both formats. Whisper shot alignment passed within 750ms and the normalized script matches exactly (0% word error). Sterling notation is normalized to its spoken form; a regression test covers £25, £80 and £10. These are automated audio checks, not a claim of human listening.
- Real test-mode restocks, £32.50 approvals and both Stripe-backed declines passed in both capture runs. Metadata and six PR frames were regenerated.
- `npm run demo:test` passed 4/4; `npm run lint`, all demo syntax checks and whitespace/privacy checks passed. Configuration remains ignored and secrets were never displayed.

## Irish comparison acceptance (registered before rebuild)

- [x] `npm run demo:irish` generates Jessica Gallagher's Irish narration at speed 1 and builds both formats without captions.
- [x] Comparison outputs, work files and evidence use an isolated Irish directory; Megan's existing MP4 hashes remain unchanged.
- [x] Both Irish exports run 30–40 seconds and pass the real capture, audio/video, transcription and frame-review gates.
- [x] Fresh Irish evidence added to the existing PR without replacing the verified British evidence or merging.


## Observed evidence — Irish comparison

- `npm run demo:irish` exited 0 with Jessica Gallagher (Irish), `eleven_multilingual_v2`, speech speed 1 and playback rate 1. The faster voice uses a slightly longer Sally introduction to retain 30–40 seconds without stretching audio.
- Both fresh Irish streams start at zero and end at 30.700000 seconds; 1920×1080 and 1080×1920 exports pass A/V, silence/freeze and Stripe test-mode capture assertions.
- All 32 two-second frames passed OCR and were visually inspected in contact sheets: no captions, login pages or target URLs. Six Irish review frames and actual beat timestamps are saved separately in `demo/evidence/irish/`.
- Final AAC alignment passed within 750ms. Both formats decode to identical narration; ASR word error is 1% (licence/license spelling).
- Both original Megan MP4 SHA-256 values still match the committed British manifest byte for byte. A cleanup regression test also proves rebuilding the default output cannot erase an Irish comparison directory.
- `npm run demo:test` passed 6/6. App type checks, all demo syntax checks and whitespace/privacy checks passed. Audio verification is automated, not a claim of human listening.
