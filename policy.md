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
