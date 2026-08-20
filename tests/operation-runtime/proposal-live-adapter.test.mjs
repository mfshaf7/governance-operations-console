import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  projectProposalCanonicalDrafts,
  projectProposalLiveRecords,
} from "../../src/domain-workspaces/proposal/live-runtime/proposal-live-projection.ts";
import {
  applyProposalCommand,
  applyProposalDeliveryHandoff,
  listProposalLiveRecords,
  ProposalOosError,
} from "../../src/domain-workspaces/proposal/server/proposal-oos-client.ts";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-secret",
};

test("case:console-proposal-adapter-positive projects OOS truth and submits a version-bound command", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).includes("/v1/ideas?")) {
      return jsonResponse({
        ideas: [{ created_at: "2026-08-16T00:00:00Z", idea_id: "idea-851" }],
        page: { count: 1, has_more: false },
      });
    }
    if (String(url).endsWith("/projection")) return jsonResponse(proposalProjection());
    if (String(url).endsWith("/history")) return jsonResponse(proposalHistory());
    if (String(url).endsWith("/commands")) {
      const command = JSON.parse(String(init.body));
      assert.equal(command.authority.mutation_adapter, "operator-orchestration-service");
      assert.equal(command.operator.id, "operator:console-owner");
      assert.equal(command.source.record_version, "version-17");
      assert.equal(command.command.type, "triage");
      return jsonResponse(proposalCommandResult(), 201);
    }
    throw new Error(`Unexpected request ${url}`);
  };

  const liveRecords = await listProposalLiveRecords({ env, fetchImpl });
  const [surfaceRecord] = projectProposalLiveRecords(liveRecords);
  const drafts = projectProposalCanonicalDrafts(liveRecords);

  assert.equal(surfaceRecord.id, "idea-851");
  assert.equal(surfaceRecord.status, "captured");
  assert.equal(drafts.triageDrafts["idea-851"], undefined);
  assert.equal(calls[0].init.headers["x-oos-caller-secret"], "test-only-secret");

  const result = await applyProposalCommand(
    {
      commandId: "proposal-command:idea-851:triage:test",
      payload: {
        advisorDraft: "",
        advisorPrompt: "",
        step: "triage",
        summary: "Ready for disposition.",
      },
      proposalId: "idea-851",
      source: {
        projectionState: "current",
        recordRef: "openproject://work_packages/851",
        recordVersion: "version-17",
        status: "captured",
      },
    },
    { env, fetchImpl },
  );
  assert.equal(result.projection.status, "triaged");
  assert.equal(result.receipt.owner, "operator-orchestration-service");
});

test("case:console-proposal-adapter-negative fails closed without fixture or direct OpenProject fallback", async () => {
  const fetchImpl = async () =>
    jsonResponse(
      { code: "proposal_record_version_stale", error: "Refresh required." },
      409,
    );

  await assert.rejects(
    applyProposalCommand(
      {
        commandId: "proposal-command:idea-851:triage:stale",
        payload: {
          advisorDraft: "",
          advisorPrompt: "",
          step: "triage",
          summary: "Stale command.",
        },
        proposalId: "idea-851",
        source: {
          projectionState: "current",
          recordRef: "openproject://work_packages/851",
          recordVersion: "version-16",
          status: "captured",
        },
      },
      { env, fetchImpl },
    ),
    (error) =>
      error instanceof ProposalOosError &&
      error.status === 409 &&
      error.code === "proposal_record_version_stale",
  );

  const clientSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/proposal/live-runtime/use-proposal-live-runtime.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(clientSource, /proposalWorkspace(ReadModel|Scenarios)/);
  assert.doesNotMatch(clientSource, /openproject/i);
  assert.match(clientSource, /response\.status === 409|await refresh\(\)/);
});

test("case:console-proposal-delivery-application submits a stable version-bound application", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    return jsonResponse(proposalHandoffApplicationResult(), 201);
  };

  const result = await applyProposalDeliveryHandoff(
    {
      proposalId: "idea-851",
      source: {
        handoffPacketRef: "proposal-packet:851",
        recordRef: "openproject://work_packages/851",
        recordVersion: "version-19",
        status: "accepted",
      },
    },
    { env, fetchImpl },
  );

  const application = JSON.parse(String(calls[0].init.body));
  assert.equal(
    calls[0].url,
    "http://127.0.0.1:8080/v1/proposals/idea-851/handoff/apply",
  );
  assert.equal(application.application_id, "proposal-application:851:delivery-1");
  assert.equal(application.operator.id, "operator:console-owner");
  assert.equal(application.source.handoff_packet_ref, "proposal-packet:851");
  assert.equal(application.source.record_version, "version-19");
  assert.equal(result.receipt.target_record_ref, "openproject://work_packages/901");
  assert.equal(result.projection.handoff.state, "applied");
});

test("case:console-proposal-delivery-application rejects an unproven target result", async () => {
  const malformed = proposalHandoffApplicationResult();
  malformed.projection.handoff.target_record_ref =
    "openproject://work_packages/902";

  await assert.rejects(
    applyProposalDeliveryHandoff(
      {
        proposalId: "idea-851",
        source: {
          handoffPacketRef: "proposal-packet:851",
          recordRef: "openproject://work_packages/851",
          recordVersion: "version-19",
          status: "accepted",
        },
      },
      { env, fetchImpl: async () => jsonResponse(malformed, 201) },
    ),
    /handoff application result is invalid/i,
  );
});

test("canonical live projection drives triage, route, gate, and history state", () => {
  const record = {
    createdAt: "2026-08-16T00:00:00Z",
    history: proposalHistory({ disposition: true, triage: true }),
    projection: proposalProjection({
      decision_notes: "Accept into Prototype exploration.",
      route: {
        rationale: "Validate the product boundary before Delivery.",
        source_custody: {
          classification: "existing-repo",
          owner: "workspace-prototype-studio",
          rationale: "Existing source custody is resolved.",
          repository_gate_state: "resolved",
          repository_mode: "existing",
          source_ref: "repo://workspace-prototype-studio",
        },
        target: "prototype",
      },
      status: "accepted",
      triage_summary: "The proposal is bounded enough for disposition.",
    }),
  };
  const [surfaceRecord] = projectProposalLiveRecords([record]);
  const drafts = projectProposalCanonicalDrafts([record]);

  assert.equal(surfaceRecord.status, "ready-to-route");
  assert.equal(surfaceRecord.repoGate.state, "clear");
  assert.equal(drafts.triageDrafts["idea-851"].appliedAt, "2026-08-16T01:00:00Z");
  assert.equal(drafts.decisionDrafts["idea-851"].outcome, "accepted");
  assert.equal(drafts.routeSelectionDrafts["idea-851"].routeTarget, "Prototype");
  assert.equal(drafts.repositoryGateResolutions["idea-851"].result, "resolved");
});

test("Delivery handoff stays actionable until target application is proven", () => {
  const route = {
    rationale: "The accepted proposal is ready for Delivery.",
    source_custody: {
      classification: "existing-repo",
      owner: "governance-operations-console",
      rationale: "Existing source custody is resolved.",
      repository_gate_state: "resolved",
      repository_mode: "existing",
      source_ref: "repo://governance-operations-console",
    },
    target: "delivery",
  };
  const preparedEvent = proposalEvent({
    event_id: "proposal-event:851:handoff-prepared",
    event_type: "handoff-prepared",
    occurred_at: "2026-08-16T03:00:00Z",
    receipt_refs: ["proposal-receipt:851:handoff-prepared"],
    status_after: "accepted",
    status_before: "accepted",
    summary: "Prepared the Delivery handoff.",
  });
  const preparedRecord = {
    createdAt: "2026-08-16T00:00:00Z",
    history: {
      events: [preparedEvent],
      next_cursor: null,
      proposal_id: "idea-851",
      record_version: "version-19",
      schema_version: 1,
    },
    projection: proposalProjection({
      handoff: {
        packet_ref: "proposal-packet:851",
        state: "ready",
        target_receipt_ref: null,
        target_record_ref: null,
      },
      record_version: "version-19",
      route,
      status: "accepted",
    }),
  };

  const [preparedSurface] = projectProposalLiveRecords([preparedRecord]);
  const preparedDraft = projectProposalCanonicalDrafts([preparedRecord])
    .handoffDrafts["idea-851"];
  assert.equal(preparedSurface.status, "ready-to-route");
  assert.equal(preparedDraft.appliedAt, undefined);

  const appliedEvent = proposalEvent({
    event_id: "proposal-event:851:handoff-applied",
    event_type: "handoff-applied",
    occurred_at: "2026-08-16T04:00:00Z",
    receipt_refs: ["proposal-target-receipt:idea-851:abc123"],
    status_after: "accepted",
    status_before: "accepted",
    summary: "Applied the prepared Proposal handoff to Delivery.",
  });
  const appliedRecord = {
    ...preparedRecord,
    history: {
      ...preparedRecord.history,
      events: [preparedEvent, appliedEvent],
      record_version: "version-21",
    },
    projection: proposalProjection({
      handoff: {
        packet_ref: "proposal-packet:851",
        state: "applied",
        target_receipt_ref: "proposal-target-receipt:idea-851:abc123",
        target_record_ref: "openproject://work_packages/901",
      },
      record_version: "version-21",
      route,
      status: "accepted",
    }),
  };
  const [appliedSurface] = projectProposalLiveRecords([appliedRecord]);
  const appliedDraft = projectProposalCanonicalDrafts([appliedRecord])
    .handoffDrafts["idea-851"];
  assert.equal(appliedSurface.status, "done");
  assert.equal(appliedDraft.appliedAt, "2026-08-16T04:00:00Z");
  assert.equal(
    appliedDraft.appliedReceiptId,
    "proposal-target-receipt:idea-851:abc123",
  );
});

function proposalProjection(overrides = {}) {
  return {
    body: "Build the live Proposal integration.",
    decision_notes: null,
    handoff: {
      packet_ref: null,
      state: "not-requested",
      target_receipt_ref: null,
      target_record_ref: null,
    },
    last_event_ref: null,
    projection_state: "current",
    proposal_id: "idea-851",
    record_project: "workspace-proposals",
    record_ref: "openproject://work_packages/851",
    record_system: "openproject",
    record_version: "version-17",
    route: null,
    schema_version: 1,
    source: {
      context_ref: { request_id: "request-851" },
      ingress: "console",
      native_ref: { request_id: "request-851" },
      surface: "governance-operations-console",
    },
    status: "captured",
    title: "Live Proposal integration",
    triage_summary: null,
    updated_at: "2026-08-16T00:00:00Z",
    ...overrides,
  };
}

function proposalHistory({ disposition = false, triage = false } = {}) {
  const events = [];
  if (triage) {
    events.push(proposalEvent({
      event_id: "proposal-event:851:triage",
      event_type: "triaged",
      occurred_at: "2026-08-16T01:00:00Z",
      receipt_refs: ["proposal-receipt:851:triage"],
      status_after: "triaged",
      status_before: "captured",
      summary: "The proposal is bounded enough for disposition.",
    }));
  }
  if (disposition) {
    events.push(proposalEvent({
      event_id: "proposal-event:851:disposition",
      event_type: "disposition-recorded",
      occurred_at: "2026-08-16T02:00:00Z",
      receipt_refs: ["proposal-receipt:851:disposition"],
      status_after: "accepted",
      status_before: "triaged",
      summary: "Accepted into Prototype.",
    }));
  }
  return {
    events,
    next_cursor: null,
    proposal_id: "idea-851",
    record_version: "version-17",
    schema_version: 1,
  };
}

function proposalEvent(overrides) {
  return {
    actor: { id: "operator:console-owner", kind: "operator" },
    command_id: "proposal-command:851:test",
    proposal_id: "idea-851",
    record_version: "version-17",
    schema_version: 1,
    ...overrides,
  };
}

function proposalCommandResult() {
  const projection = proposalProjection({
    last_event_ref: "proposal-event:851:triage",
    record_version: "version-18",
    status: "triaged",
    triage_summary: "Ready for disposition.",
    updated_at: "2026-08-16T01:00:00Z",
  });
  const event = proposalEvent({
    event_id: "proposal-event:851:triage",
    event_type: "triaged",
    occurred_at: "2026-08-16T01:00:00Z",
    receipt_refs: ["proposal-receipt:851:triage"],
    status_after: "triaged",
    status_before: "captured",
    summary: "Ready for disposition.",
  });
  return {
    command_id: "proposal-command:idea-851:triage:test",
    event,
    history: {
      events: [event],
      next_cursor: null,
      proposal_id: "idea-851",
      record_version: "version-18",
      schema_version: 1,
    },
    projection,
    receipt: {
      owner: "operator-orchestration-service",
      receipt_ref: "proposal-receipt:851:triage",
      recorded_at: "2026-08-16T01:00:00Z",
      record_ref: "openproject://work_packages/851",
      record_version: "version-18",
    },
    replayed: false,
    schema_version: 1,
  };
}

function proposalHandoffApplicationResult() {
  const projection = proposalProjection({
    decision_notes: "Accepted for governed Delivery.",
    handoff: {
      packet_ref: "proposal-packet:851",
      state: "applied",
      target_receipt_ref: "proposal-target-receipt:idea-851:abc123",
      target_record_ref: "openproject://work_packages/901",
    },
    last_event_ref: "proposal-event:851:handoff-applied",
    record_version: "version-21",
    route: {
      rationale: "The accepted proposal is ready for Delivery.",
      source_custody: {
        classification: "existing-repo",
        owner: "governance-operations-console",
        rationale: "Existing source custody is resolved.",
        repository_gate_state: "resolved",
        repository_mode: "existing",
        source_ref: "repo://governance-operations-console",
      },
      target: "delivery",
    },
    status: "accepted",
    updated_at: "2026-08-16T04:00:00Z",
  });
  const event = proposalEvent({
    event_id: "proposal-event:851:handoff-applied",
    event_type: "handoff-applied",
    occurred_at: "2026-08-16T04:00:00Z",
    receipt_refs: ["proposal-target-receipt:idea-851:abc123"],
    status_after: "accepted",
    status_before: "accepted",
    summary: "Applied the prepared Proposal handoff to Delivery.",
  });
  return {
    application_id: "proposal-application:851:delivery-1",
    event,
    history: {
      events: [event],
      next_cursor: null,
      proposal_id: "idea-851",
      record_version: "version-21",
      schema_version: 1,
    },
    projection,
    receipt: {
      owner: "operator-orchestration-service",
      receipt_ref: "proposal-target-receipt:idea-851:abc123",
      recorded_at: "2026-08-16T04:00:00Z",
      source_record_ref: "openproject://work_packages/851",
      source_record_version: "version-21",
      target_record_ref: "openproject://work_packages/901",
      target_record_system: "openproject",
    },
    replayed: false,
    schema_version: 1,
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
