import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  architecturePacketDraftIssues,
  assertArchitecturePacketArtifact,
  assertArchitecturePacketDraftInput,
} from "../../src/domain-workspaces/delivery/live-runtime/architecture-packet-live-contract.ts";
import {
  draftArchitecturePacket,
  persistArchitecturePacket,
  readCurrentArchitecturePacket,
} from "../../src/domain-workspaces/delivery/server/architecture-packet-oos-client.ts";
import {
  architecturePacketEditorFromArtifact,
  architecturePacketInputFromEditor,
} from "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/architecture-packet/architecture-packet-editor-model.ts";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-console-secret",
};

test("case:1284-positive authors, approves, and persists the exact OOS candidate", async () => {
  const calls = [];
  const input = completeInput("architecture-ready");
  const local = packet({ custodyState: "local-draft", decisionStatus: "architecture-ready" });
  const durable = packet({ custodyState: "durable", decisionStatus: "architecture-ready" });
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(String(init.body));
    calls.push({ body, headers: init.headers, url: String(url) });
    if (String(url).endsWith("/draft")) {
      return jsonResponse({
        architecture_packet: local,
        source_snapshot: {
          art_digest: digest("a"),
          covered_record_count: 1,
          dependency_record_count: 0,
          relation_count: 0,
        },
        workflow_id: "delivery-art-architecture-packet-draft",
      });
    }
    return jsonResponse({
      artifact: durable,
      custody_receipt: { receipt_id: "custody-1" },
      owner_receipt: { projected: true },
      workflow_id: "delivery-art-architecture-packet-persist",
    });
  };

  const drafted = await draftArchitecturePacket(input, { env, fetchImpl });
  const persisted = await persistArchitecturePacket(
    drafted.architecture_packet,
    { env, fetchImpl },
  );

  assert.deepEqual(calls[0].body, { input });
  assert.equal(calls[0].headers["x-oos-operator-id"], "operator:console-owner");
  assert.deepEqual(calls[1].body, { artifact: local });
  assert.equal(persisted.artifact.custody.state, "durable");
  assert.equal(persisted.artifact.integrity.content_digest, local.integrity.content_digest);
});

test("case:1284-negative incomplete ownership, topology, evidence, gates, and operator decision block persistence", async () => {
  const incomplete = completeInput("draft");
  incomplete.architecture.descendant_owner_map = [];
  incomplete.architecture.landing_units = [];
  delete incomplete.architecture.source_landing_graph;
  delete incomplete.architecture.required_human_gates;
  incomplete.conformance_plan.cases = [];
  incomplete.decision.rationale = "short";

  const issues = architecturePacketDraftIssues(incomplete, {
    requireApproval: true,
  });

  assert.ok(issues.some((issue) => issue.includes("ownership map")));
  assert.ok(issues.some((issue) => issue.includes("Landing Units")));
  assert.ok(issues.some((issue) => issue.includes("source landing graph")));
  assert.ok(issues.some((issue) => issue.includes("human gates")));
  assert.ok(issues.some((issue) => issue.includes("conformance cases")));
  assert.ok(issues.some((issue) => issue.includes("Operator rationale")));
  assert.ok(issues.some((issue) => issue.includes("Operator approval")));

  let called = false;
  await assert.rejects(
    () => persistArchitecturePacket(
      packet({ custodyState: "local-draft", decisionStatus: "draft" }),
      {
        env,
        fetchImpl: async () => {
          called = true;
          return jsonResponse({});
        },
      },
    ),
    /decision must be architecture-ready/,
  );
  assert.equal(called, false);
});

test("current packet readback stays OOS-owned and can seed editable design without authority fields", async () => {
  const durable = packet({ custodyState: "durable", decisionStatus: "architecture-ready" });
  const calls = [];
  const current = await readCurrentArchitecturePacket("delivery-1275", {
    env,
    fetchImpl: async (url, init) => {
      calls.push({ body: JSON.parse(String(init.body)), url: String(url) });
      return jsonResponse({
        artifact: durable,
        contract_posture: "current",
        custody_receipt: { receipt_id: "custody-1" },
        projected_reference: { reference: { digest: durable.integrity.content_digest } },
        workflow_id: "delivery-art-architecture-packet-current",
      });
    },
  });
  const editor = architecturePacketEditorFromArtifact(current.artifact);
  const nextInput = architecturePacketInputFromEditor(editor, "draft");

  assert.deepEqual(calls[0].body, { delivery_id: "delivery-1275" });
  assert.equal(nextInput.delivery_id, "delivery-1275");
  assert.equal(Object.hasOwn(nextInput, "operator"), false);
  assert.equal(Object.hasOwn(nextInput, "custody"), false);
  assert.equal(Object.hasOwn(nextInput, "integrity"), false);
});

test("Architecture Packet route and surface preserve same-origin identity, no-fixture, and exact candidate review controls", () => {
  const root = new URL("../../", import.meta.url);
  const draftRoute = readFileSync(
    new URL("src/app/api/delivery/architecture-packets/draft/route.ts", root),
    "utf8",
  );
  const persistRoute = readFileSync(
    new URL("src/app/api/delivery/architecture-packets/persist/route.ts", root),
    "utf8",
  );
  const modal = readFileSync(
    new URL(
      "src/domain-workspaces/delivery/presentation/surfaces/execution-board/architecture-packet/architecture-packet-authoring-modal.tsx",
      root,
    ),
    "utf8",
  );

  assert.match(draftRoute, /authorizeConsoleMutation/);
  assert.match(persistRoute, /authorizeConsoleMutation/);
  assert.match(modal, /Validate Draft/);
  assert.match(modal, /Approve Candidate/);
  assert.match(modal, /Persist Approved Packet/);
  assert.match(modal, /No fixture packet will be persisted/);
  assert.doesNotMatch(modal, /NEXT_PUBLIC_|OOS_CALLER_SECRET/);
});

test("draft input rejects client authority fields before OOS", () => {
  assert.throws(
    () => assertArchitecturePacketDraftInput({
      ...completeInput("draft"),
      operator: { id: "operator:forged" },
    }),
    /unexpected or missing fields/,
  );
});

function completeInput(status) {
  return {
    architecture: {
      authorization_session_execution_model: { summary: "Server-bound execution." },
      contradictions_open_decisions: [],
      descendant_owner_map: [
        {
          owner_repo: "governance-operations-console",
          work_item_id: "work-item-1284",
          work_item_type: "User story",
        },
      ],
      evidence_receipt_handoffs: [],
      landing_units: [
        {
          covered_work_item_ids: ["work-item-1284"],
          id: "delivery-1275-packet-authoring",
          owner_repo: "governance-operations-console",
          source_backed: true,
        },
      ],
      lifecycle_state_model: { states: ["architecture-ready"] },
      required_human_gates: [],
      rollback_cleanup_terminal_conditions: { terminal_conditions: ["Evidence is durable."] },
      runtime_activation_chains: [],
      runtime_boundaries: [
        {
          allowed_capability_ids: ["console.submit-operator-intent"],
          owner_repo: "governance-operations-console",
          prohibited_capability_ids: ["console.own-lifecycle-truth"],
        },
      ],
      source_landing_graph: {
        edges: [],
        nodes: ["delivery-1275-packet-authoring"],
      },
      work_item_execution_plan: [
        {
          close_after_work_item_ids: [],
          emits_human_gate_ids: [],
          start_after_work_item_ids: [],
          work_item_id: "work-item-1284",
        },
      ],
    },
    conformance_plan: {
      cases: [
        {
          applies_to_work_item_ids: ["work-item-1284"],
          evidence_owner_landing_unit_id: "delivery-1275-packet-authoring",
          fidelity: "real-git",
          id: "case:1284-positive",
          target_readiness: "merge-ready",
        },
      ],
      dimensions: [{ id: "dimension:workflow", summary: "Workflow behavior" }],
      git_causality: { required: true },
      protocol_applicability: { applicable: false },
      required: true,
      work_item_dimension_applicability: [
        {
          dimension_ids: ["dimension:workflow"],
          work_item_id: "work-item-1284",
        },
      ],
    },
    covered_work_item_ids: ["work-item-1284"],
    decision: {
      rationale: "Use the existing OOS and WGCF authority boundary for architecture authoring.",
      status,
    },
    delivery_id: "delivery-1275",
    repo_revisions: [
      {
        base_ref: "origin/main",
        commit: "b".repeat(40),
        repo: "governance-operations-console",
      },
    ],
    schema_version: 1,
  };
}

function packet({ custodyState, decisionStatus }) {
  const input = completeInput(decisionStatus);
  const uri = custodyState === "durable"
    ? `wgcf://artifacts/delivery-art/sha256/${"a".repeat(64)}`
    : "local://delivery-art/architecture-packet:delivery-1275-v1.json";
  return assertArchitecturePacketArtifact({
    architecture: input.architecture,
    artifact_id: "architecture-packet:delivery-1275-v1",
    artifact_type: "delivery_art_architecture_packet",
    conformance_plan: input.conformance_plan,
    covered_work_item_ids: input.covered_work_item_ids,
    created_at: "2026-10-14T00:00:00.000Z",
    custody: { backend: custodyState === "durable" ? "wgcf-artifact-registry" : "local-filesystem", state: custodyState, uri },
    decision: {
      decided_at: decisionStatus === "draft" ? null : "2026-10-14T00:00:00.000Z",
      decided_by: decisionStatus === "draft" ? null : "operator:console-owner",
      rationale: input.decision.rationale,
      status: decisionStatus,
    },
    delivery_id: input.delivery_id,
    integrity: { content_digest: digest("a") },
    operator: { decision_source: "operator", id: "operator:console-owner" },
    schema_version: 6,
    source_snapshot: {
      art_digest: digest("b"),
      art_ref: "openproject://work_packages/1275",
      captured_at: "2026-10-14T00:00:00.000Z",
      repo_revisions: input.repo_revisions,
    },
  });
}

function digest(character) {
  return `sha256:${character.repeat(64)}`;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
