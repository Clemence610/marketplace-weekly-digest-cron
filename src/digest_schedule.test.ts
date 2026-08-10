import assert from "node:assert/strict";
import test from "node:test";
import { digestTaskUrl, weeklyDigestKey } from "./digest_schedule.ts";

test("uses one stable weekly schedule identity for a digest route", () => {
  const task = digestTaskUrl("https://creator.example/");
  assert.equal(task, "https://creator.example/api/marketplace-digest");
  assert.equal(weeklyDigestKey(task), weeklyDigestKey(task));
});
