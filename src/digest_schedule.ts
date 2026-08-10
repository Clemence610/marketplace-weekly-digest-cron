import { createHash } from "node:crypto";

export function weeklyDigestKey(taskUrl: string): string {
  return createHash("sha256")
    .update(`marketplace-weekly-digest:${taskUrl}:0 9 * * 1`)
    .digest("hex");
}

export function digestTaskUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/marketplace-digest`;
}
