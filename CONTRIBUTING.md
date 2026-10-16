# Contributing

- Branch from `master`, open a PR. No force-pushes.
- Stripe **test mode** only. Never commit keys; `.env` is git-ignored.
- Run `npm run lint` and `npm test` (with `npm run dev` running) before you push.
- UI: Figtree, Cherry `#ed4c4c`, Peach `#faa09a`, Light Peach `#ffd0cd`, Cream `#fff8f6`, ink `#1f1416`. Use `layout()` from `src/ui.ts`.
- New spend rule? Add the clause to `policy.md`, enforce it before any Stripe call, and add a row to “Try to make Sally overspend”.
- Found a way to make the agent overspend? Open an issue with the exact prompt.
