# Sally — open-source money agent for restaurants

**Text, call or chat; Sally acts within your policy, and every pound lands in Stripe with a reason.**

Built on **Stripe Agent Toolkit — [github.com/stripe/ai](https://github.com/stripe/ai)** (`@stripe/agent-toolkit`, MIT). Stripe test mode only. MIT licensed.

## 3 demos (type them in the chat, or text/call the Twilio number)
1. **Restock the kitchen** — Sally builds the basket, pays what is within policy (R1–R4), holds anything over £25 (R2), blocks alcohol and unapproved suppliers. Tap **Approve & pay** (or text `YES <id>`) for the rest.
2. **Table for 6 Saturday 8pm** — groups of 6+ get a £10/head deposit Stripe Payment Link (H1). No human raises the bill. Allergy mentions go to staff.
3. **Pay the Bidfood invoice** — Sally checks supplier + purchase order (I1–I3), then creates and pays a Stripe invoice. Mismatches wait for a human.

## How it maps to judging
| Criterion | Where |
|---|---|
| Money moves in Stripe test mode | PaymentIntents, Payment Links, Customers, Invoices + invoice items: real test objects |
| Autonomy within policy | `policy.md` rules run in code **before** any Stripe call; amounts come from policy, never the model; over-limit → human |
| Explains every pound | Live audit panel, `/r/:id/why`, `/audit`, every line cites a clause |
| Product & creativity | One agent across chat, SMS and voice for a real restaurant |

## Quickstart
```bash
npm install
cp .env.example .env   # STRIPE_SECRET_KEY=sk_test_...
npm run dev            # http://localhost:3000
```

## Twilio (SMS + voice)
Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `PUBLIC_URL` in `.env`. On the number in the Twilio console:
- Messaging webhook: `POST {PUBLIC_URL}/sms`
- Voice webhook: `POST {PUBLIC_URL}/voice`

Requests are signature-checked when `TWILIO_AUTH_TOKEN` is set. Phone triggers appear live in the web chat.

## For other agents
See [AGENTS.md](AGENTS.md): `POST /api/chat {"text": "..."}`.
