import { weeklyDigestKey, digestTaskUrl } from "./digest_schedule.ts";
import { infrai } from "./infrai.ts";

const publicBaseUrl = process.env.PUBLIC_BASE_URL;
if (!publicBaseUrl) throw new Error("Set PUBLIC_BASE_URL to the host serving the digest route.");

const task = digestTaskUrl(publicBaseUrl);
const job = await infrai.cron.create("0 9 * * 1", task, weeklyDigestKey(task));
console.log(`Marketplace digest scheduled: ${job.job_id}`);
