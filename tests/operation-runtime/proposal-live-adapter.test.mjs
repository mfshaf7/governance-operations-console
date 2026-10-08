import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  projectProposalCanonicalDrafts,
  projectProposalLiveRecords,
} from "../../src/domain-workspaces/proposal/live-runtime/proposal-live-projection.ts";
import {
  assertProposalTargetApplicationResult,
} from "../../src/domain-workspaces/proposal/live-runtime/proposal-live-contract.ts";
import {
  applyProposalCommand,
  applyProposalDeliveryHandoff,
  listProposalLiveRecords,
  proposalTargetApplicationId,
  ProposalOosError,
  startProposalTargetApplication,
} from "../../src/domain-workspaces/proposal/server/proposal-oos-client.ts";
import {
  assertCanonicalSourceRequest,
  canonicalSourceResponse,
} from "../support/console-source-projection.mjs";

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
    if (String(url).endsWith("/projection")) {
      assertCanonicalSourceRequest(init);
      return canonicalSourceResponse(proposalProjection(), {
        recordRef: "openproject://work_packages/851",
        sourceOwner: "workspace-proposals",
      });
    }
    if (String(url).endsWith("/history")) {
      assertCanonicalSourceRequest(init);
      return canonicalSourceResponse(proposalHistory(), {
        recordRef: "openproject://work_packages/851",
        sourceOwner: "workspace-proposals",
      });
    }
    if (String(url).endsWith("/commands")) {
      const command = JSON.parse(String(init.body));
      assert.equal(command.authority.mutation_adapter, "operator-orchestration-service");
      assert.equal(command.operator.id, "governance-operations-console");
      assert.equal(command.operator.handle, undefined);
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
  assert.equal(application.operator.id, "governance-operations-console");
  assert.equal(application.operator.handle, undefined);
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

test("case:proposal-target-console-protocol-positive prepares, submits, and projects the exact target review", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).endsWith("/projection")) {
      assertCanonicalSourceRequest(init);
      return canonicalSourceResponse(proposalProjection({
        body: "Explore the accepted Proposal in Prototype Studio.",
        handoff: {
          packet_ref: "proposal-packet:851",
          state: "ready",
          target_receipt_ref: null,
          target_record_ref: null,
        },
        record_version: "version-21",
        route: prototypeRoute(),
        status: "accepted",
        title: "Sample Tool",
      }), {
        recordRef: "openproject://work_packages/851",
        sourceOwner: "workspace-proposals",
      });
    }
    if (String(url).endsWith("/preparations")) {
      assert.deepEqual(JSON.parse(String(init.body)), {
        proposal_id: "idea-851",
      });
      return jsonResponse(proposalTargetPreparation());
    }
    if (String(url).endsWith("/v1/proposal-target-applications")) {
      const command = JSON.parse(String(init.body));
      assert.equal(command.application_id, "proposal-prototype-application:proposal-851:851");
      assert.deepEqual(command.prototype, {
        id: "prototype:proposal-851",
      });
      assert.equal(command.proposal.record_version, "version-21");
      assert.deepEqual(Object.keys(command.proposal).sort(), [
        "handoff_packet_digest",
        "handoff_packet_ref",
        "proposal_id",
        "record_ref",
        "record_version",
      ]);
      assert.equal(command.target.authority_revision, "1".repeat(40));
      return jsonResponse(proposalTargetResult({ status: "accepted" }), 202);
    }
    if (String(url).endsWith("/continue")) {
      assert.equal(String(init.body), "{}");
      return jsonResponse(proposalTargetResult({ status: "review-required" }));
    }
    throw new Error(`Unexpected request ${url}`);
  };

  const result = await startProposalTargetApplication({
    proposalId: "idea-851",
    source: {
      handoffPacketRef: "proposal-packet:851",
      recordRef: "openproject://work_packages/851",
      recordVersion: "version-21",
      status: "accepted",
    },
  }, { env, fetchImpl });

  assert.equal(result.status, "review-required");
  assert.equal(result.next_action, "review-and-merge");
  assert.equal(result.review.repository, "workspace-prototype-studio");
  assert.equal(result.review.number, 7);
  assert.equal(result.canonical_target_mutation, false);
  assert.equal(calls.length, 4);
});

test("case:proposal-target-console-protocol-negative blocks unresolved custody and false success", async () => {
  let calls = 0;
  const fetchImpl = async (_url, init) => {
    calls += 1;
    assertCanonicalSourceRequest(init);
    return canonicalSourceResponse(proposalProjection({
      handoff: {
        packet_ref: "proposal-packet:851",
        state: "ready",
        target_receipt_ref: null,
        target_record_ref: null,
      },
      record_version: "version-21",
      route: {
        ...prototypeRoute(),
        source_custody: {
          ...prototypeRoute().source_custody,
          owner: null,
          repository_gate_state: "pending",
          source_ref: null,
        },
      },
      status: "accepted",
    }), {
      recordRef: "openproject://work_packages/851",
      sourceOwner: "workspace-proposals",
    });
  };
  await assert.rejects(
    startProposalTargetApplication({
      proposalId: "idea-851",
      source: {
        handoffPacketRef: "proposal-packet:851",
        recordRef: "openproject://work_packages/851",
        recordVersion: "version-21",
        status: "accepted",
      },
    }, { env, fetchImpl }),
    (error) => error instanceof ProposalOosError &&
      error.code === "proposal_target_source_stale" && error.status === 409,
  );
  assert.equal(calls, 1);

  const falseSuccess = proposalTargetResult({ status: "succeeded" });
  falseSuccess.target_result = null;
  falseSuccess.proposal_acknowledgement = null;
  await assert.rejects(
    async () => assertProposalTargetApplicationResult(falseSuccess),
    /success evidence is incomplete/i,
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

test("Prototype handoff stays actionable until OOS records the target acknowledgement", () => {
  const preparedEvent = proposalEvent({
    event_id: "proposal-event:851:handoff-prepared",
    event_type: "handoff-prepared",
    occurred_at: "2026-08-16T03:00:00Z",
    receipt_refs: ["proposal-receipt:851:handoff-prepared"],
    status_after: "accepted",
    status_before: "accepted",
    summary: "Prepared the Prototype handoff.",
  });
  const preparedRecord = {
    createdAt: "2026-08-16T00:00:00Z",
    history: {
      events: [preparedEvent],
      next_cursor: null,
      proposal_id: "idea-851",
      record_version: "version-21",
      schema_version: 1,
    },
    projection: proposalProjection({
      handoff: {
        packet_ref: "proposal-packet:851",
        state: "ready",
        target_receipt_ref: null,
        target_record_ref: null,
      },
      record_version: "version-21",
      route: prototypeRoute(),
      status: "accepted",
    }),
  };
  const preparedDraft = projectProposalCanonicalDrafts([preparedRecord])
    .handoffDrafts["idea-851"];
  assert.equal(preparedDraft.appliedAt, undefined);

  const receiptRef = `proposal-prototype-target-receipt:proposal-851:${"8".repeat(64)}`;
  const appliedEvent = proposalEvent({
    event_id: "proposal-event:851:handoff-applied",
    event_type: "handoff-applied",
    occurred_at: "2026-08-16T04:00:00Z",
    receipt_refs: [receiptRef],
    status_after: "accepted",
    status_before: "accepted",
    summary: "Applied the prepared Proposal handoff to Prototype Studio.",
  });
  const appliedRecord = {
    ...preparedRecord,
    history: {
      ...preparedRecord.history,
      events: [preparedEvent, appliedEvent],
      record_version: "version-22",
    },
    projection: proposalProjection({
      handoff: {
        packet_ref: "proposal-packet:851",
        state: "applied",
        target_receipt_ref: receiptRef,
        target_record_ref: "record://prototype-captures/proposal-851",
      },
      record_version: "version-22",
      route: prototypeRoute(),
      status: "accepted",
    }),
  };
  const appliedDraft = projectProposalCanonicalDrafts([appliedRecord])
    .handoffDrafts["idea-851"];
  assert.equal(appliedDraft.appliedAt, "2026-08-16T04:00:00Z");
  assert.equal(appliedDraft.appliedReceiptId, receiptRef);
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

function prototypeRoute() {
  return {
    rationale: "Explore the accepted Proposal before Delivery commitment.",
    source_custody: {
      classification: "existing-repo",
      owner: "workspace-prototype-studio",
      rationale: "Prototype Studio owns the exploring capture.",
      repository_gate_state: "resolved",
      repository_mode: "existing",
      source_ref: "repo://workspace-prototype-studio",
    },
    target: "prototype",
  };
}

function proposalTargetPreparation() {
  return {
    schema_version: 1,
    workflow_id: "proposal-target-application",
    proposal: {
      proposal_id: "idea-851",
      record_ref: "openproject://work_packages/851",
      record_version: "version-21",
      handoff_packet_ref: "proposal-packet:851",
      handoff_packet_digest: `sha256:${"3".repeat(64)}`,
      route: prototypeRoute(),
    },
    prototype_id: "prototype:proposal-851",
    authority_revision: "1".repeat(40),
    expected_state: {
      source_revision: "1".repeat(40),
      registry_digest: `sha256:${"2".repeat(64)}`,
      record_present: false,
      record_digest: null,
    },
    canonical_authority: {
      repo: "workspace-prototype-studio",
      branch: "main",
      record_root: "records/prototype-captures",
    },
    canonical_mutation: false,
  };
}

function proposalTargetResult({ status }) {
  const succeeded = status === "succeeded";
  const reviewRequired = status === "review-required";
  const receipt = {
    owner: "workspace-prototype-studio",
    prototype_id: "prototype:proposal-851",
    receipt_ref: `proposal-prototype-target-receipt:proposal-851:${"8".repeat(64)}`,
    recorded_at: "2026-10-04T18:00:00Z",
    target_record_ref: "record://prototype-captures/proposal-851",
  };
  return {
    schema_version: 1,
    workflow_id: "proposal-target-application",
    application_id: proposalTargetApplicationId("idea-851"),
    proposal_id: "idea-851",
    prototype_id: "prototype:proposal-851",
    session_ref: "console-session:idea-851:version-21",
    execution_ref: "console:proposal-target:idea-851:version-21",
    status,
    next_action: succeeded
      ? "prototype-landing"
      : reviewRequired
        ? "review-and-merge"
        : "continue",
    revision: reviewRequired ? 3 : 1,
    proposal: proposalTargetPreparation().proposal,
    target: {
      authority_revision: "1".repeat(40),
      expected_state: proposalTargetPreparation().expected_state,
    },
    preparation: reviewRequired
      ? {
          branch: `proposal-target/${"4".repeat(64)}`,
          base_commit: "1".repeat(40),
          file_count: 2,
          changed_paths: ["record.json", "history.json"],
          content_digest: `sha256:${"5".repeat(64)}`,
        }
      : null,
    review: reviewRequired
      ? {
          repository: "workspace-prototype-studio",
          number: 7,
          state: "open",
          branch: `proposal-target/${"4".repeat(64)}`,
          base_branch: "main",
          base_commit: "1".repeat(40),
          head_commit: "6".repeat(40),
          merged: false,
          merge_commit: null,
          human_reviewed: false,
        }
      : null,
    target_result: succeeded
      ? { receipt, result_digest: `sha256:${"9".repeat(64)}` }
      : null,
    proposal_acknowledgement: succeeded
      ? {
          replayed: false,
          projection: proposalProjection({
            handoff: {
              packet_ref: "proposal-packet:851",
              state: "applied",
              target_receipt_ref: receipt.receipt_ref,
              target_record_ref: receipt.target_record_ref,
            },
            record_version: "version-22",
            route: prototypeRoute(),
            status: "accepted",
          }),
        }
      : null,
    failure: null,
    history: [{
      sequence: 1,
      at: "2026-10-04T18:00:00Z",
      status,
      details: null,
    }],
    canonical_target_mutation: succeeded,
    proposal_mutation: succeeded,
    runtime_activation: false,
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
