# Nine examples in the original chat

Open **Try a business task · 9 Stripe tools**, choose a task, then press Send. The chooser fills the composer without creating a payment. Each conversation ends with Sally's plain-English reply and an expandable **Stripe output** card. Checkout and payment-link results include links to the real public Stripe page. Every displayed financial proof is read back from Stripe in test mode. A failed action displays no verified proof.

The exact fixed requests and amounts are in [the shotlist](nine-chat-shotlist.md) and policy C9. Card spending retains its original stricter authorization checks. Partner payments and subscriptions are explicitly selected test examples. No model chooses the amount, no held restock item is approved, and no invoice email or Checkout completion occurs.

Agent Toolkit is shown honestly as the tool execution layer preparing a draft invoice; it is not a separate kind of Stripe payment object. The strict example fails if real Toolkit execution is unavailable. Other operations preserve the existing audited Toolkit/SDK fallback behavior.

`npm run demo` now records **all nine products in the original chat on the hosted test app**, using separate headed Playwright clips and real timestamps. It produces a narrated 50–60s landscape video and a content-cropped portrait video. The old combined cut is retained locally in `demo/out/previous-combined/`; its original script remains `node demo/legacy-run.mjs`. No captions, music, zoom or camera movement are added.

## Verification

Before recording: `npm run lint`, `npm run test:chat-card`, `npm run test:agent9`, `npm run test:chat-examples`. The last test exercises all nine no-key HTTP paths, altered-amount refusal, the chooser's explicit Send step, link allowlisting and inline proof rendering. UI fixtures are confined to tests and never used for recordings.

During capture: each request is made in a fresh original-chat context on the real hosted app. The script requires an actual `livemode: false` object, reads the persisted record/audit, checks actual Toolkit execution, and requires a real declined Issuing authorization. It never calls the old workspace API or runs Issuing locally. Stripe Dashboard navigation is blocked.

After editing: `demo/out/beats.json`, `proof-table.md`, one proof frame per product per orientation, two-second frame extracts, OCR, media dimensions/duration, and PCM narration alignment. Source MP4s and audio remain ignored. Proof frames, safe object metadata and the shotlist are committed for review.
