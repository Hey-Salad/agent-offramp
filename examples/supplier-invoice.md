# Supplier invoice
Say `invoice` (or `invoice mismatch`), or call MCP `pay_supplier_invoice`.

1. Sally checks supplier (I1), PO total £184.60 (I2) and the £250 limit (I3).
2. Match: she creates, finalises and pays a Stripe invoice.
3. Mismatch (£35 surcharge not on the PO): held for you.

See it: `/invoices` → **Invoice** / **PDF**.
