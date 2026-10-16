# Sally's Spending Policy (v1)

Sally may build a basket on her own, but **never pays**. Payment is off-ramped to a human.

| Clause | Rule |
|---|---|
| P1 | Weekly cap: total basket must not exceed the cap (default **£40**, max £50). Lowest-priority items are dropped to fit. |
| P2 | Any single line over **£15** needs explicit human approval (flagged, not auto-included). |
| P3 | **No alcohol.** Category `alcohol` is always blocked. |
| P4 | Allergen rules: items containing a declared allergen (e.g. "no nuts") are blocked. |
| P5 | Allowed merchants only: **Ocado, Waitrose**. |
| P6 | Sally cannot move money. A human must approve via Stripe Checkout (test mode). |
| P7 | Every line, approved or blocked, gets a decision record with clause + evidence. |

## Sally for restaurants (HeySalad)
- **R1** Weekly restock cap £150. Within it Sally pays on her own.
- **R2** Any single item over £25 waits for human approval.
- **R3** Approved suppliers only: Waitrose, Bidfood, Brakes.
- **R4** No alcohol unless a premises licence is on file (it isn't).
- **H1** Bookings of 6+ guests pay a £10/head deposit via a Stripe Payment Link. No human raises the bill.
- **H2** Any booking that mentions an allergy goes to a member of staff, not the agent.
- **I1** Supplier invoices only from approved suppliers.
- **I2** Invoice total must match the purchase order exactly; any mismatch waits for a human.
- **I3** Invoices up to £250 are paid automatically.
- **I4** Outgoing customer invoices: Sally prepares a DRAFT; up to **£500** she may send it, over £500 waits for human approval. Stripe test mode only; customer email is a test address.
- **E1** Emails (e.g. shopping list) are drafts only. Sally never sends email.
- **S1** Autonomous grocery shop (Waitrose): Sally picks the best-match product per list line and auto-pays up to **£25** per shop; the rest waits for human approval (R2). Stripe test mode only.

## Recording-only test workspace (D1)

When explicitly enabled with `AGENT9_DEMO=1`, `/agent9` accepts only its nine fixed, human-selected demo commands. It uses Stripe test keys and verifies every resulting object has `livemode: false`. Amounts are fixed by the committed shotlist, never supplied by a model. Existing restock, booking, invoice, card-control and token-limit checks still apply. Checkout and outgoing invoices are prepared only; no Checkout completion or invoice email is triggered. The £80 Issuing request deliberately exercises the card's decline. Connect's £60 venue payment and the £9 Billing subscription are explicitly authorized test-demo operations. All workspace requests, policy decisions, results and Toolkit operations are timestamped in the existing audit store. The workspace is disabled unless opted in, and no deployment is implied by a recording.

## Original-chat card examples

The original chat accepts three fixed Stripe test authorizations: £12 at Ocado (within P1), £80 at Ocado (exceeds P2's £50 per-authorization limit), and £10 at an off-licence (blocked by P3). Other amounts return help. The model cannot change these amounts or controls. A card result requires a real active GBP test card, verified controls, and the resulting authorization retrieved from Stripe with `livemode: false`. No simulated decision is presented as a Stripe decline, and an authorized card amount is not described as a captured payment. All attempts, results and unavailable outcomes are timestamped in the existing audit store.
