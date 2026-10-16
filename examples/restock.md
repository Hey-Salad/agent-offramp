# Restock the kitchen
Say `restock` in chat, or call MCP `restock`.

1. Sally builds the basket (Waitrose list plus Bidfood items).
2. Pays everything within R1–R4 in one PaymentIntent.
3. Blocks wine (R4) and the Amazon truffle oil (R3). Holds the £32.50 olive oil (R2).
4. Tap **Approve & pay** (or `YES <id>`) to pay the held items.

See it: `/payments` → **Receipt**, then `/audit`.
```bash
curl -s localhost:3000/api/chat -H 'content-type: application/json' -d '{"text":"restock"}'
```
