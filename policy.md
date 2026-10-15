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
- **I1** Supplier invoices only from approved suppliers.
- **I2** Invoice total must match the purchase order exactly; any mismatch waits for a human.
- **I3** Invoices up to £250 are paid automatically.
