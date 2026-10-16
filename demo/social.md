# Agent 9 social loop

## Candidates reviewed from the combined video

| Source window | Why it works silently |
| --- | --- |
| 26.27–34.27s | Preferred: the £80 Ocado attempt exceeds the £50 card limit, followed by the declined row and Stripe output. The neighbouring product fragments are excluded from the final edit. |
| 74.73–83.73s | A six-guest chat request becomes a £60 deposit link, then opens customer checkout. |
| 97.23–104.10s | The checked supplier invoice opens a paid Stripe invoice with line items and receipt downloads. |

**Selected: Issuing.** The usable card scene itself is 27.267–32.333s, only 5.067 seconds. To make a readable eight-second cycle without including adjacent products, begin with one second of its genuine decline proof (30.133–31.133s), then replay the complete scene retimed to seven seconds. It ends on the same stable proof view it starts on. The hard cut to the card setup is inside the loop; the wrap boundary has matching UI. No reverse action, fabricated result, captions, animated zoom or audio.

Constant crops centre on the content at x=1076: GIF and square video use 1080×1080 from x=536, y=0; the landscape X video uses 1440×810 from x=356, y=0. The £80 declined row and `approved: false` remain visible. GIF uses explicit palettegen/paletteuse, 192 colours, Sierra dithering and infinite looping. The white footage is opaque, so its text remains legible against either GitHub theme.

Rebuild from the existing combined demo: `npm run demo:social`. It does not call Stripe or TTS. The three small social exports are deliberately committed despite the output-directory ignore. Full-length MP4s, raw frames and voice caches remain ignored. README previews use GitHub's Markdown-render API with local light/dark GitHub-style framing; they are not screenshots of a deployed README.

## Acceptance ledger

- [x] GIF: 1200px wide, 15fps, eight seconds, infinite loop, under 8,000,000 bytes — ffprobe, file size and GIF loop metadata.
- [x] X video: H.264, 1280×720, 30fps, no audio, under 15,000,000 bytes — ffprobe/file size.
- [x] Square: H.264, 1080×1080 content crop, 30fps, no audio — ffprobe and frame review.
- [x] Start/end views match; no partial input or transitions — extracted boundary frames and pixel comparison.
- [x] Every decoded frame scanned for keys, full card numbers and client secrets — OCR plus known-environment-value matching; visual review of before/action/proof.
- [x] README alt text exact, hero below logo/tagline, readable in light/dark — rendered before/after screenshots.
- [x] Changes pushed to PR #10 branch; no merge.

Validation: `node demo/social.mjs` and `node demo/social-verify.mjs` passed **596 checks**. All **600 decoded frames** were covered (580 distinct PNGs after exact duplicate detection). No full card number, key or client-secret value was detected. First/last-frame mean RGB error is below 0.10/255 for every format, with no pixel-channel difference above 15/255 in the downscaled boundary comparison. Visual review confirms stable proof views and the £80 decline remains readable.

| Export | Dimensions | Frame rate | Duration | Bytes |
| --- | --- | --- | --- | ---: |
| `agent9.gif` | 1200×1200 | 15 fps (120 frames / 8s) | 8.00s | 1,698,537 |
| `agent9-x.mp4` | 1280×720 | 30 fps | 8.00s | 218,946 |
| `agent9-square.mp4` | 1080×1080 | 30 fps | 8.00s | 314,349 |

GIF centisecond timing alternates six/seven-centisecond frame delays, totaling 8s at 15 effective fps; ffprobe's GIF `avg_frame_rate` reports 50/3, while its `r_frame_rate` and the decoded frame-count/runtime ratio are 15. Verification uses the actual frame-count/runtime ratio, not that unreliable GIF average field.

README preview reproduction: `node demo/readme-preview.mjs --before=ee7a8f2`. Four screenshots under `demo/out/gif-proof/` show before/after in both themes, with theme-correct logos and the complete 720px hero. The renderer uses GitHub's Markdown API with local theme framing. `npm run lint` and module syntax checks pass.
