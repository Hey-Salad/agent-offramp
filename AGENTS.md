# AGENTS.md — calling Sally from another agent

Sally is a policy-bound money agent. You send plain language; Sally decides with deterministic rules and moves Stripe **test** money. You cannot set amounts — they come from `policy.md`.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | `{"text":"restock"}` → `{reply, record}` (same router as SMS) |
| POST | `/r/:id/approve` | Human approval for held items (`accept: application/json` for JSON) |
| GET | `/r/:id/why?q=<item>` | Plain-English reason for a line or record |
| GET | `/api/records/:id` | Full record: decisions, Stripe ids, audit |
| GET | `/api/feed` | Money moved today + latest audit lines |
| GET | `/policy` | The policy text |
| POST | `/sms`, `/voice` | Twilio webhooks |

## Intents `/api/chat` understands
- `restock` → basket, auto-pay within policy, held items → `awaiting_human`
- `table for N <when>` → deposit Payment Link if N ≥ 6, else confirmed; allergy words → staff
- `invoice` (add `mismatch` to test I2) → PO check, pay Stripe invoice
- `YES <record id>` → approve a held record (only do this when a human said yes)

## Policy contract
- Rules R1–R4, H1–H2, I1–I3 in `policy.md` run **before** any Stripe call.
- Every decision has `status`, `clause`, `reason`. Every action is in `audit` with a timestamp and channel.
- Stripe writes (prices, payment links, customers, invoice items) go through the Stripe Agent Toolkit (`stripe_api_write`), falling back to the Stripe SDK; `audit` events `stripe_tool` record which.

## Example
```bash
curl -s localhost:3000/api/chat -H 'content-type: application/json' -d '{"text":"Table for 6 Saturday 8pm"}'
```
