# Card spending in the original chat

The business-facing demo stays in the normal chat: **Spend £80 at Ocado** → Sally explains the £50 limit → **Declined · No money taken** → expand **Stripe output**. The output contains only the verified authorization ID, status, approval, amount, currency, test-mode flag and card last four digits. No card number or client secret is returned.

The three fixed test examples are £12 at Ocado, £80 at Ocado and £10 at an off-licence. This is test-card authorization, not a captured payment. Missing cards, unexpected currency, live/unverified objects and policy-control mismatches show **Not checked**. A simulated policy decision can never become a claimed Stripe result. Unsupported amounts/currencies return help rather than a model-selected amount. Requests and outcomes retain timestamped audit records. Concurrent chat responses track their own record IDs.

Deployment was explicitly requested in the user's chat-first direction. `node demo/deploy-test.mjs` checks the signed-in Modal workspace matches APP_URL, requires a clean pushed PR #10 commit, deploys that exact SHA to the existing test-only app using its existing named secrets, then verifies `/api/build`. It does not merge the PR or copy the hosted Issuing key locally. Deployment logs and authentication remain private/ignored.

After deployment, `node demo/chat-card-record.mjs` records the original hosted chat in headed Chromium, 1920×1200, with real typing, response and inline Stripe output. Actual timestamps and sync-marker offsets are saved under ignored `demo/work/chat-card/`. The live app origin is read from APP_URL and never rendered in the video.

Acceptance:

- Type checks and `npm run test:chat-card` pass, including missing-key UI and concurrent request isolation.
- `npm run test:agent9` retains workspace and live-key refusal checks.
- Hosted deployment reports the pinned commit and test-only mode.
- Real hosted chat returns a new `iauth_`, `approved: false`, GBP 8000 and `livemode: false`.
- New silent social exports show the chat flow, have matching loop boundaries, and pass the all-frame credential/card-number scan.
- README previews and PR #10 are updated. No merge.
