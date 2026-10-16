# What customers actually open

The short overview stays at 59.133 seconds. The additional `agent9-walkthrough.mp4` and portrait version preserve all nine chat examples, then follow real clicks to:

1. Sally's public Stripe receipt for the supplier payment.
2. The unpaid £32.50 Checkout prepared in chat.
3. The £60 deposit Payment Link, opening the customer's payment page.
4. A real paid supplier-test invoice, with its line items expanded.
5. The invoice PDF downloaded from that same hosted invoice and opened in Chromium's native PDF viewer.

The invoice document is a separate paid supplier example, clearly distinct from the unsent customer draft shown in the nine-product overview. The PDF is the bill; the receipt is proof of payment. Stripe's Download invoice button creates the actual file. Capture verifies its %PDF- signature, Poppler rendering, and exact invoice letters/digits and amount against the visible hosted invoice (PDF font encoding maps hyphens to NUL during text extraction), then records those exact downloaded bytes with a SHA256 digest. Stripe serves this file as application/octet-stream, so MIME alone is not used as a PDF validity check.

No card fields are filled, Checkout is never submitted, no invoice email is sent, and held basket items remain on hold. Customer pages retain native Stripe styling. A card field showing the empty `1234 1234 1234 1234` hint is an empty placeholder, never card data. Native PDF viewing uses fixed reading scales loaded before each proof shot: 125% for the wide video and 75% for the portrait crop, which contains every invoice column. These are separately recorded views of the same invoice, each with its own real download hash. No camera zoom, pan, music or captions are added.

`npm run demo` rebuilds the overview and longer walkthrough. `npm run demo -- --walkthrough-only` refreshes only customer journeys, using the existing overview; add `--edit-only` to avoid repeating financial requests. `--overview-only` builds just the nine-chat overview. `--verify-only` reads existing exports and performs read-only hosted checks.

Proof is in `demo/out/customer-beats.json`, `customer-proof-table.md`, `customer-proof/`, and `customer-qa/`. Video streams preserve the nine original-chat proof frames exactly; voice alignment is measured from the final exported audio, not assumed from edit settings. The original short MP4 hashes are checked before and after the longer edit.

The four final MP4s and the exact recorded test invoice PDF are committed for GitHub viewing/download, alongside customer receipt and payment-page proof frames. `demo/out/documents/manifest.json` records the invoice PDF hash; it contains no signed page URL or credentials.
