# Agent 9 proof table

Product names are aligned using ElevenLabs character timestamps. Frames come from the final exports at the first product phoneme (rounded up to the next frame). Full object IDs and statuses are readable in the frames; this table uses prefixes only. Payment Links has an `active` flag rather than a `status` field. All objects are test mode.

| Product | Product named at | Stripe prefix | Status | Voiceover |
| --- | ---: | --- | --- | --- |
| PaymentIntents | 8.567s | pi_ | succeeded | PaymentIntents confirms your supplier payment. |
| Checkout | 13.767s | cs_test_ | open | Checkout prepares your customer's secure payment. |
| Payment Links | 19.100s | plink_ | active | Payment Links prepares your booking deposits. |
| Invoicing | 24.400s | in_ | draft | Invoicing turns completed work into bills. |
| Issuing | 29.833s | iauth_ | closed; approved: false | Issuing keeps your agent within budget. |
| Connect | 34.900s | pi_ | succeeded | Connect pays partners and records fees. |
| Billing | 40.100s | sub_ | active | Billing starts your customer's recurring subscription. |
| Shared payment tokens | 45.600s | pi_ | succeeded | Shared payment tokens keep card details private. |
| Agent Toolkit | 51.400s | in_ | draft | Agent Toolkit creates invoices through Stripe's tools. |

Runtime: 59.133s. Opening: 0–6s. Closing slate: 55.133–59.133s. Natural Jessica Gallagher voice at speed 1. No captions, subtitles, music, zoom, pan or crossfades. Issuing is captured on the hosted test app by explicit user direction; all other financial scenes run locally against real Stripe test objects.
