# OMNI Lunar — Cloudflare Workers Free
Deploy from the existing repository on Cloudflare Workers, keeping the account on the Free plan. The SQLite-backed Durable Objects keep keys and subscriptions private and schedule alarms without a continuously running server. The registry is capped at 150 devices as a conservative initial limit; free quotas are shared across the Cloudflare account and delivery is not guaranteed.

Use the root build configuration (npm install, npm run deploy). No manual VAPID secrets needed. Do not copy the generated private keys into GitHub.

After deployment, verify /health and /config on the actual assigned HTTPS URL. Only then publish that URL as registry in push-config.json on the original OMNI Lunar repo. Existing clients can retry or migrate their subscriptions. Verify a real push with the PWA closed, recurring scheduled delivery, and unsubscribe. No UI or icon changes are needed.
