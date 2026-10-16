# Nine business tasks, one chat

Record the original `/` chat, never the separate `/agent9` workspace. All actions use Stripe test mode. Each example starts with a fresh conversation, types the exact request, shows Sally's result, then expands Stripe output. No invoice email, held-item approval, live money or Checkout completion. Jessica Gallagher voice, no captions, fixed framing.

| Scene / product | Chat request | Before | Action | After proof | Voiceover | Target |
| --- | --- | --- | --- | --- | --- | ---: |
| 1 PaymentIntents | Pay my approved suppliers | Empty chat | Fixed restock within existing rules | Succeeded PaymentIntent; held items remain held | PaymentIntents confirms your supplier payment. | 5–6s |
| 2 Checkout | Create a £32.50 checkout | Empty chat | Prepare unpaid Checkout | Open Session id/status; real Open checkout link | Checkout prepares your customer's secure payment. | 5–6s |
| 3 Payment Links | Create a deposit link for six guests | Empty chat | £10 per guest under H1 | Active Payment Link; real Open payment link action | Payment Links prepares your booking deposits. | 5–6s |
| 4 Invoicing | Draft a £120 invoice for completed work | Empty chat | Draft only; no email | Draft Invoice id/status/total | Invoicing turns completed work into bills. | 5–6s |
| 5 Issuing | Spend £80 at Ocado | Empty chat | Real authorization on existing hosted card | Declined authorization id, approved false; £50 limit | Issuing keeps your agent within budget. | 5–6s |
| 6 Connect | Pay my partner £60 | Empty chat | Fixed destination test charge | Succeeded PaymentIntent and real matching transfer/fee | Connect pays partners and records your fees. | 5–6s |
| 7 Billing | Start a £9 monthly subscription | Empty chat | Synthetic test customer | Active Subscription id/interval | Billing starts your customer's monthly subscription. | 5–6s |
| 8 Shared payment tokens | Pay £9.60 without sharing card details | Empty chat | Scoped test grant and payment | Succeeded PaymentIntent and grant identifier, no payload | Shared payment tokens keep card details private. | 5–6s |
| 9 Agent Toolkit | Use Stripe tools to draft a £75 services invoice | Empty chat | Strict Toolkit writes; no SDK fallback | Draft Invoice plus actual agent-toolkit execution audit | Agent Toolkit creates invoices through Stripe's tools. | 5–6s |

Opening: existing white nine-product card, 6s. Closing: HeySalad tagline, 4s. Retiming uses measured before/action/proof timestamps; VO begins only after proof is visible. Target total 50–60s. Each raw scene remains a separate clip.

## Acceptance evidence (registered before implementation)

- Nine examples appear in the original chat; choosing one fills the composer and requires Send. Browser test/screenshots.
- Exact commands map to fixed policy amounts; unknown variants never reach new financial actions. Parser and HTTP tests.
- Failures show unavailable, no fake proof. No-key runtime tests.
- Every proof comes from a Stripe readback with livemode false; all nine hosted captures have object id/status and audit. Toolkit requires actual Toolkit execution.
- Existing card safety and workspace opt-in tests pass; typecheck passes.
- Two exports, 50–60s, no subtitles/zoom; per-scene proof frames and timestamp table; frame scan for secrets/PAN/client_secrets.
- Changes committed to PR #10, no merge or force push. Hosted test deployment pinned and verified separately.
