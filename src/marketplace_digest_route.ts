import { createHash } from "node:crypto";
import { infrai } from "./infrai.ts";

type DigestRequest = {
  edition: string;
  audience: "marketplace";
};

export async function queueMarketplaceDigest(request: DigestRequest): Promise<void> {
  const payload = JSON.stringify({ edition: request.edition, audience: request.audience });
  const idempotencyKey = createHash("sha256").update(payload).digest("hex");
  await infrai.queue.publish("marketplace-digest", payload, idempotencyKey);
}
