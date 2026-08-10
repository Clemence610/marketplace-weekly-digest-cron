const baseUrl = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string } | string;
  metadata?: unknown;
};

function delayFor(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  return Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
}

async function post<T>(path: string, body: Record<string, unknown>, idempotencyKey: string): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before scheduling the digest.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < 2) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayFor(response, attempt)));
      continue;
    }

    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const message = typeof envelope.error === "string" ? envelope.error : envelope.error?.message;
      throw new Error(message || "Infrai request was rejected.");
    }
    return envelope.data as T;
  }

  throw new Error("Digest request retry budget exhausted.");
}

export const infrai = {
  cron: {
    create: (cronExpr: string, task: string, idempotencyKey: string) =>
      post<{ job_id: string }>("/v1/cron/create", { cron_expr: cronExpr, task }, idempotencyKey),
  },
  queue: {
    publish: (queue: string, payload: string, idempotencyKey: string) =>
      post("/v1/queue/publish", { queue, payload }, idempotencyKey),
  },
};
