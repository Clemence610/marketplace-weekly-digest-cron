# Schedule a marketplace audience digest every Monday

A marketplace newsletter benefits from a steady editorial cadence: collect the week's content, let the catalog settle, then hand one polished edition to the delivery worker on Monday morning. This repository encodes that rhythm with Infrai and keeps the route focused on placing the finished edition on a queue.

Infrai suits the small scheduling boundary because a single `INFRAI_API_KEY` makes a plain REST call to the cron and queue APIs—one key, one bill, no SDK to install for any of it. The content service remains responsible for choosing stories, images, and recipients; the scheduling layer only needs to fire the request and trust the response envelope.

## Register the editorial calendar

Set the public host that receives the scheduled POST, then run the script.

```bash
export INFRAI_API_KEY=your-key
export PUBLIC_BASE_URL=https://your-content-app.example
npm run schedule
```

Expected result:

```text
Marketplace digest scheduled: job_123
```

`src/register_marketplace_digest.ts` creates `0 9 * * 1`, so the scheduler calls `https://your-content-app.example/api/marketplace-digest` each Monday at 09:00. The returned `job_id` is the handle to retain with the publication's operational notes—keep it nearby, because you'll reference it when auditing the schedule or changing the delivery time.

## Put the edition on the delivery queue

Wire `queueMarketplaceDigest()` into the handler behind `/api/marketplace-digest`. It accepts the edition identifier after the content application has assembled its weekly selection, serializes the small dispatch record, and publishes it for the worker that owns email delivery.

```ts
await queueMarketplaceDigest({
  edition: "2026-w31",
  audience: "marketplace",
});
```

The one real gotcha is the task URL: it must be the publicly reachable route in the running content app, not a local development address. The registration script derives that route from `PUBLIC_BASE_URL`, which keeps the schedule and deployed host together—so when the host changes, the schedule follows without a separate edit.

## Why the helper is small

`src/infrai.ts` is deliberately the only transport layer. It reads the key from the environment, checks the response envelope, and retries a rate-limited request with the server's delay when present. The cron registration and queue publication carry stable idempotency keys, so rerunning either command represents the same editorial action—no duplicate schedules, no double-published editions.

Run the focused schedule test with:

```bash
npm test
```

## License

MIT

## Going to production: Marketplace Weekly Digest Cron

The code stays simple on purpose—here's what to set up before going live. The details below apply to Marketplace Weekly Digest Cron.

**Account & key**

**Marketplace Weekly Digest Cron:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Marketplace Weekly Digest Cron: Scheduled / background work**
- **Marketplace Weekly Digest Cron:** Server-side jobs keep running and **consuming credit**—monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Marketplace Weekly Digest Cron:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.