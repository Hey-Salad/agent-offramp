# Agent 9 social loop

## Candidates reviewed from the combined video

| Source window | Why it works silently |
| --- | --- |
| 26.27–34.27s | Preferred: the £80 Ocado attempt exceeds the £50 card limit, followed by the declined row and Stripe output. The neighbouring product fragments are excluded from the final edit. |
| 74.73–83.73s | A six-guest chat request becomes a £60 deposit link, then opens customer checkout. |
| 97.23–104.10s | The checked supplier invoice opens a paid Stripe invoice with line items and receipt downloads. |

**Selected: Issuing, now shown through the original chat.** The user subsequently preferred the chat interface and requested deployment of real card spending there. The source is the fresh hosted recording in `demo/work/chat-card/chat-card.mp4`, with measured phases in its `beats.json`: request typed → real declined response → click Stripe output → verified authorization. The eight-second loop uses a 1s proof lead-in, 0.6s before typing, 1.4s typing/result transition, 1.2s clear reply, 0.8s opening proof, and 3s proof. Each phase uses its real measured source timestamps; no UI is fabricated. It starts and ends on the same completed chat/proof view. No captions, animated zoom or audio.

Constant crops exclude the clipped memory/header line above the chat. GIF and square video use 960×960 from x=596, y=120, centred on the content at x=1076. The landscape X video uses 1680×945 from x=236, y=124, retaining the conversation, proof and composer. These are fixed crops with no moving camera or zoom. The £80 declined row and `approved: false` remain visible. GIF uses explicit palettegen/paletteuse, 192 colours, Sierra dithering and infinite looping. The white footage is opaque, so its text remains legible against either GitHub theme.

Rebuild from the existing combined demo: `npm run demo:social`. It does not call Stripe or TTS. The three small social exports are deliberately committed despite the output-directory ignore. Full-length MP4s, raw frames and voice caches remain ignored. README previews use GitHub's Markdown-render API with local light/dark GitHub-style framing; they are not screenshots of a deployed README.

## Acceptance ledger

- [x] GIF: 1200px wide, 15fps, eight seconds, infinite loop, under 8,000,000 bytes — ffprobe, file size and GIF loop metadata.
- [x] X video: H.264, 1280×720, 30fps, no audio, under 15,000,000 bytes — ffprobe/file size.
- [x] Square: H.264, 1080×1080 content crop, 30fps, no audio — ffprobe and frame review.
- [x] Start/end views match; no partial input or transitions — extracted boundary frames and pixel comparison.
- [x] Every decoded frame scanned for keys, full card numbers and client secrets — OCR plus known-environment-value matching; visual review of before/action/proof.
- [x] README alt text exact, hero below logo/tagline, readable in light/dark — rendered before/after screenshots.
- [x] Changes pushed to PR #10 branch; no merge.

Validation: `npm run demo:social` passed **1150 checks**. All **600 decoded frames** were covered (567 distinct images after exact duplicate detection). No full card number, key, client-secret value or stray memory/header text was detected. Boundary comparisons and visual review confirm matching completed chat/proof views.

| Export | Dimensions | Frame rate | Duration | Bytes |
| --- | --- | --- | --- | ---: |
| `agent9.gif` | 1200×1200 | 15 fps | 8.00s | 729,166 |
| `agent9-x.mp4` | 1280×720 | 30 fps | 8.00s | 71,535 |
| `agent9-square.mp4` | 1080×1080 | 30 fps | 8.00s | 124,482 |

The GIF's 120 decoded frames / 8 seconds give 15 effective fps, using the format's six/seven-centisecond frame delays. Validation uses frame count / runtime rather than ffprobe's unreliable GIF average-rate field.

README preview reproduction: `node demo/readme-preview.mjs --before=ee7a8f2`. Four screenshots under `demo/out/gif-proof/` show before/after in both themes, with theme-correct logos and the complete 720px hero. The renderer uses GitHub's Markdown API with local theme framing. `npm run lint` and module syntax checks pass.
