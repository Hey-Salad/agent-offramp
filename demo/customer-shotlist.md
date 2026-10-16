# Customer-facing walkthrough (alongside the 59s chat overview)

The user chose to retain the short overview and add a longer step-by-step cut. Preserve its nine original-chat product scenes; insert these five stages before the closing slate. Financial objects must be real Stripe test objects. Customer pages use Stripe's native appearance. No card fields are filled, no Checkout is submitted, no invoice is emailed, and no held basket is approved.

| Stage | Before / chat action | Customer-visible proof | Voiceover | Target |
| --- | --- | --- | --- | ---: |
| Receipt | Ask Sally to pay approved suppliers; open her receipt link | Actual Stripe receipt, amount paid and last four digits only | Open the receipt to see what was paid. | 6–7s |
| Checkout | Ask for £32.50 Checkout; click Open checkout | Actual unpaid customer Checkout page, empty payment fields | Your customer opens a secure checkout, ready to pay. | 6–7s |
| Payment Link | Ask for the six-guest deposit link; open it | Actual £60 customer payment page | Share the deposit link. Your customer chooses how to pay. | 6–7s |
| Invoice page | Ask Sally to check/pay the fixed matching supplier test invoice; open its full record and Stripe invoice | Paid hosted invoice, expand real line items | Open a paid invoice to see the bill and its details. | 7–8s |
| Invoice PDF | From that same paid invoice, click its invoice download | Actual downloaded Stripe PDF, displayed in Chromium's native PDF viewer; scroll its page | Download the invoice PDF to save or share. | 6–7s |

Use one headed Playwright journey per task. For each measured stage retain a short before view, a clear action and the loaded customer document. VO starts after the corresponding page/document is visible. Save exact click/load/proof times, test object readback and the PDF's SHA256. Preserve the matching invoice id across the invoice page and PDF. Never represent a draft invoice as having a finalized PDF.

## Acceptance

- Existing 59.133s overview stays intact and passes its existing checks.
- Separate landscape and portrait `agent9-walkthrough` exports retain all nine chat scenes and add all five customer stages.
- Real links are clicked, Stripe Dashboard is blocked, empty payment fields stay empty.
- Downloaded file has a valid %PDF- header and parses in Poppler (Stripe serves application/octet-stream); displayed bytes match the download hash and matching real test invoice; PDF text/render includes the correct invoice/amount.
- Proof frames for all five customer stages, both formats; narration measured against final audio; two-second extracts inspected for secrets, login screens, app origin and cropping.
- Public Stripe placeholders (e.g. 1234 1234 1234 1234) are empty form hints, not filled card data. Checks distinguish these from an entered card number.
- Shotlist, scripts, safe timestamps and proof evidence committed to PR #10; no merge.
