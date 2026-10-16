# My spending policy (fork me)

Sally reads these numbers from code in `src/restaurant.ts` (`RPOLICY`) and `src/policy.ts` (`POLICY`). Change both together.

| Clause | Rule | Default |
|---|---|---|
| R1 | Weekly spend cap | £150 |
| R2 | Any single item over this waits for a human | £25 |
| R3 | Approved suppliers only | Waitrose, Bidfood, Brakes |
| R4 | No alcohol unless licensed | not licensed |
| H1 | Deposit for groups of this size or more | 6 guests, £10/head |
| H2 | Allergy mentions go to staff | always |
| I2 | Supplier invoice must match the PO exactly | £0.00 tolerance |
| I3 | Supplier invoices paid automatically up to | £250 |
| I4 | Customer invoices sent without approval up to | £500 |
| P2 | Card: max per authorisation | £50 |
| P3 | Card: allowed merchant categories | grocery, restaurants |
