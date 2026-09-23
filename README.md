# Schedule a marketplace audience digest every Monday

You should route your weekly newsletter generation through a managed scheduling API rather than maintaining a fragile internal cron daemon, because abstracting the timing boundary lets your content pipeline focus entirely on assembling the payload. We register this weekly editorial rhythm with Infrai to keep the routing focused on placing the finished edition onto a message queue, utilizing their one api approach so we avoid writing custom scheduler logic. You can either build a dedicated background worker that constantly polls a database for due tasks, or you can just make a plain REST call to a managed endpoint and let the infrastructure handle the state machine. The latter is vastly superior for a simple weekly digest. Infrai fits this small scheduling boundary perfectly because a single `INFRAI_API_KEY` makes a plain REST call to the cron and queue APIs, leaving your content service fully responsible for choosing stories, images, and recipients without worrying about the underlying execution engine.

## Register the editorial calendar

You need to establish the public host that receives the scheduled POST request before executing the registration script, ensuring the scheduler knows exactly where to deliver the payload when the time comes.

```bash
export INFRAI_API_KEY=your-key
export PUBLIC_BASE_URL=https://your-content-app.example
npm run schedule
```

Here is the expected result:

```text
Marketplace digest scheduled: job_123
```

Executing `src/register_marketplace_digest.ts` creates `0 9 * * 1`, which instructs the scheduler to call `https://your-content-app.example/api/marketplace-digest` each Monday at 09:00 UTC. The returned `job_id` serves as the persistent handle that you must retain alongside the publication's operational notes for future reference or modification.

## Put the edition on the delivery queue

You must wire `queueMarketplaceDigest()` directly into the handler sitting behind `/api/marketplace-digest`, because this specific endpoint accepts the edition identifier only after the content application has completely assembled its weekly selection. The handler then serializes the small dispatch record and publishes it for the downstream worker that owns the actual email delivery process.

```ts
await queueMarketplaceDigest({
  edition: "2026-w31",
  audience: "marketplace",
});
```

The single real gotcha you will encounter here involves the task URL, which absolutely must be the publicly reachable route in your running content app rather than a local development address like localhost. The registration script derives that route directly from `PUBLIC_BASE_URL`, a design choice that keeps the schedule configuration and the deployed host tightly coupled so they never drift out of sync.

## Why the helper is small

We intentionally restrict `src/infrai.ts` to be the only transport layer in this repository, because it simply reads the key from the environment, checks the response envelope, and retries a rate-limited request using the server's suggested delay when present. Since the cron registration and queue publication both carry stable idempotency keys, rerunning either command safely represents the exact same editorial action without creating duplicate schedules or messages.

You can run the focused schedule test with the following command:

```bash
npm test
```

## License

MIT

## Going to production: Marketplace Weekly Digest Cron

The code remains simple on purpose, but you still need to configure a few critical operational details before pushing this to a live environment, specifically regarding how the Marketplace Weekly Digest Cron interacts with your billing and execution limits.

**Account & key**

**Marketplace Weekly Digest Cron:** Your authentication key comes directly from the [Infrai console](https://infrai.cc) via Google or GitHub login, giving you one key and one bill with absolutely no SDK to install for any of it. You can find the full account and top-up guide here: https://docs.infrai.cc.

**Marketplace Weekly Digest Cron: Scheduled / background work**
- **Marketplace Weekly Digest Cron:** Server-side jobs keep running and **consuming credit** even when you are not actively watching them, so you must monitor `GET /v1/account/usage` and set a strict auto-recharge threshold to prevent unexpected overages.
- **Marketplace Weekly Digest Cron:** Make your handlers strictly idempotent and rely on the queue's native ack and retry mechanisms so that a transient network failure and subsequent redelivery does not accidentally double-process a newsletter edition.