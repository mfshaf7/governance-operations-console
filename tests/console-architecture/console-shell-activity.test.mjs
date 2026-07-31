import assert from "node:assert/strict";
import test from "node:test";

import {
  filterConsoleActivity,
  projectConsoleActivity,
} from "../../src/console-shell/activity/console-activity-model.ts";

function activityEvent({
  eventId,
  occurredAt,
  outcome = "succeeded",
  owner = "delivery-operation",
  summary = "A governed command produced a durable receipt.",
}) {
  return {
    action: {
      id: "delivery.work-design.apply",
      label: "Work Design applied",
    },
    actor: {
      kind: "operator",
      ref: "operator:test",
    },
    causationId: null,
    category: "receipt",
    correlationId: "delivery:756",
    durability: "source-projected",
    eventId,
    evidenceRefs: ["evidence://review/756"],
    occurredAt,
    outcome,
    receiptRef: "receipt://delivery/756",
    source: {
      authority: "delivery-read-model",
      label: "Delivery",
      mode: "domain-projection",
      owner,
      ref: "delivery://756/work-design",
    },
    subject: {
      kind: "delivery-package",
      label: "Delivery package 756",
      ref: "756",
    },
    summary,
  };
}

test("Governance Activity keeps one valid event per source identity and sorts newest first", () => {
  const older = activityEvent({
    eventId: "event:older",
    occurredAt: "2026-07-27T10:00:00.000Z",
  });
  const replacement = activityEvent({
    eventId: "event:older",
    occurredAt: "2026-07-28T08:00:00.000Z",
    summary: "The source replaced its earlier projection.",
  });
  const newest = activityEvent({
    eventId: "event:newest",
    occurredAt: "2026-07-28T09:00:00.000Z",
  });
  const malformed = activityEvent({
    eventId: "event:malformed",
    occurredAt: "not-a-date",
  });

  const projected = projectConsoleActivity([
    older,
    newest,
    malformed,
    replacement,
  ]);

  assert.deepEqual(
    projected.map((event) => event.eventId),
    ["event:newest", "event:older"],
  );
  assert.equal(
    projected[1].summary,
    "The source replaced its earlier projection.",
  );
});

test("Governance Activity filters structured source, outcome, and reference facts", () => {
  const delivery = activityEvent({
    eventId: "event:delivery",
    occurredAt: "2026-07-28T09:00:00.000Z",
  });
  const blockedProposal = activityEvent({
    eventId: "event:proposal",
    occurredAt: "2026-07-28T08:00:00.000Z",
    outcome: "blocked",
    owner: "proposal-operation",
    summary: "Repository admission is required before handoff.",
  });
  const events = projectConsoleActivity([delivery, blockedProposal]);

  assert.deepEqual(
    filterConsoleActivity(events, {
      outcome: "blocked",
      query: "",
      source: "all",
    }).map((event) => event.eventId),
    ["event:proposal"],
  );
  assert.deepEqual(
    filterConsoleActivity(events, {
      outcome: "all",
      query: "receipt://delivery/756",
      source: "delivery-operation",
    }).map((event) => event.eventId),
    ["event:delivery"],
  );
  assert.equal(
    filterConsoleActivity(events, {
      outcome: "all",
      query: "navigation click",
      source: "all",
    }).length,
    0,
  );
});
