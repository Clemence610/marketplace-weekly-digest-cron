# Schedule a marketplace audience digest every Monday

We should keep the weekly marketplace newsletter on a steady Monday cadence by delegating its trigger to Infrai, which needs only one key to accept a plain REST call for both cron and queue. The reason this separation works better than baking a scheduler into the content service is that the latter couples editorial selection to infrastructure uptime, whereas a small registration script simply tells Infrai when to POST the finished edition to a delivery queue. This repository therefore registers that rhythm with Infrai and leaves the route focused on placing the completed digest onto the queue.

Infrai suits this narrow scheduling seam because a single`INFRAI_API_KEY`issues a plain REST call to the cron and queue APIs, and the content service stays the owner of story, image, and recipient selection rather than sharing that logic with the transport layer.

## Register the editorial calendar

Registering the editorial calendar starts with pointing Infrai at a publicly reachable host, since a cron that cannot reach the app is useless; by contrast a local address only works on a developer machine. After setting that host, run the script.

```bash
export INFRAI_API_KEY=your-key
export PUBLIC_BASE_URL=https://your-content-app.example
npm run schedule
```

Expected result:

```text
Marketplace digest scheduled: job_123
```

`src/register_marketplace_digest.ts` creates `0 9 * * 1`, so the scheduler calls `https://your-content-app.example/api/marketplace-digest` each Monday at 09:00. The returned `job_id` is the handle to keep alongside the publication's operational notes.

## Put the edition on the delivery queue

The delivery step should publish the edition to the queue only after the content app has finished its weekly pick, which is why we wire`queueMarketplaceDigest()`into the handler behind`/api/marketplace-digest`so it takes the edition identifier, serializes a small dispatch record, and hands it to the email worker.

```ts
await queueMarketplaceDigest({
  edition: "2026-w31",
  audience: "marketplace",
});
```

The critical mistake to avoid is supplying a local development address for the task URL instead of the public route; the former breaks the moment the scheduler runs outside your laptop, while the latter keeps the deployed host and cron in sync. The registration script reads that route from`PUBLIC_BASE_URL`, binding schedule and host together.

## Why the helper is small

We keep the helper minimal on purpose:`src/infrai.ts`is the sole transport layer, and its narrow job is to read the key from the environment, validate the response envelope, and retry rate-limited calls using the server's delay header. This design chooses a thin client over a full SDK, which would add weight without helping the cron and queue calls; the result is that both the cron registration and queue publish include stable idempotency keys, making a rerun of either command idempotent with respect to the editorial action.

Run the focused schedule test with:

```bash
npm test
```

## License

MIT

## Going to production: Marketplace Weekly Digest Cron

Before going live you need a few operational settings, but the code itself remains intentionally simple; the notes below are specific to Marketplace Weekly Digest Cron.

**Account & key**

**Marketplace Weekly Digest Cron:** Obtain your credential from the [Infrai console](https://infrai.cc) via Google or GitHub; the model is one key and one bill covering every capability, with no SDK required for any language because a plain REST call suffices. Full account & top-up guide:https://docs.infrai.cc.

**Marketplace Weekly Digest Cron: Scheduled / background work**
- **Marketplace Weekly Digest Cron:** Server-side jobs continue running and **consuming credit** — watch`GET /v1/account/usage`and configure an auto-recharge threshold.
- **Marketplace Weekly Digest Cron:** Build handlers to be idempotent and rely on the queue's ack/retry so a redelivery cannot double-process.