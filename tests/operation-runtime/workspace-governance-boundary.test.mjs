import assert from "node:assert/strict";
import test from "node:test";

import {
  workspaceActiveRecordBlockers,
  workspaceActiveRecordRef,
  workspaceClassificationCommandBlockers,
  workspaceIntakeEntryRef,
  workspaceIntakeRecordForClassification,
} from "../../src/domain-workspaces/operation-contracts/workspace-governance/contract-model.ts";

test("out-of-scope classification removes in-scope product ownership fields", () => {
  const command = classificationCommand({
    candidate: productCandidate("focus-timer"),
    decision: "out-of-scope",
  });

  const record = workspaceIntakeRecordForClassification(command);

  assert.deepEqual(record, {
    id: "focus-timer",
    kind: "product",
    value: {
      decisionSource: "operator",
      intendedEndpoint: null,
      notes: "Exercise the Workspace Intake contract.",
      platformOwner: null,
      runtimeOwner: null,
      securityOwner: null,
      sourceOwners: [],
      status: "out-of-scope",
    },
  });
});

test("in-scope entrant validation rejects incomplete ownership and validation truth", () => {
  const candidate = productCandidate("incomplete-product");
  candidate.intakeMetadata.runtimeOwner = "";
  candidate.intakeMetadata.validationBehavior.catalogRefs = [];

  const blockers = workspaceClassificationCommandBlockers(
    classificationCommand({ candidate, decision: "admitted" }),
  );

  assert.ok(
    blockers.includes(
      "Product entrant requires platform, runtime, security, source-owner, and intended-endpoint truth.",
    ),
  );
  assert.ok(
    blockers.includes(
      "Workspace validation behavior requires posture, graph role, catalog refs, and notes.",
    ),
  );
});

test("active product owner references must resolve through active repository inventory", () => {
  const activeProduct = {
    id: "focus-timer",
    kind: "product",
    value: {
      governedProdPromotion: false,
      highestRealEndpoint: "prototype-local-preview",
      lifecycle: "platform-integrated",
      platformOwner: "platform-engineering",
      runtimeOwner: "workspace-prototype-studio",
      securityOwner: "security-architecture",
      sourceOwners: ["focus-timer-repository"],
      stageSupported: false,
      validationBehavior: validationBehavior("product-readiness-aggregate"),
    },
  };

  assert.deepEqual(
    workspaceActiveRecordBlockers(activeProduct, {
      activeComponentIds: [],
      activeProductIds: [],
      activeRepositoryIds: [
        "platform-engineering",
        "security-architecture",
        "workspace-prototype-studio",
      ],
    }),
    [
      "Active product requires endpoint and owner references from active repository inventory.",
    ],
  );

  assert.deepEqual(
    workspaceActiveRecordBlockers(activeProduct, {
      activeComponentIds: [],
      activeProductIds: [],
      activeRepositoryIds: [
        "focus-timer-repository",
        "platform-engineering",
        "security-architecture",
        "workspace-prototype-studio",
      ],
    }),
    [],
  );
});

test("Workspace Governance references use canonical intake and inventory collections", () => {
  const product = productCandidate("Focus Timer");

  assert.equal(
    workspaceIntakeEntryRef(product),
    "workspace-governance://intake/products/focus-timer",
  );
  assert.equal(
    workspaceActiveRecordRef({
      id: "Focus Timer",
      kind: "product",
      value: {
        governedProdPromotion: false,
        highestRealEndpoint: "prototype-local-preview",
        lifecycle: "platform-integrated",
        platformOwner: "platform-engineering",
        runtimeOwner: "workspace-prototype-studio",
        securityOwner: "security-architecture",
        sourceOwners: ["workspace-prototype-studio"],
        stageSupported: false,
        validationBehavior: validationBehavior("product-readiness-aggregate"),
      },
    }),
    "workspace-governance://products/focus-timer",
  );
  assert.equal(
    workspaceActiveRecordRef({
      id: "Focus Timer Repository",
      kind: "repository",
      value: {
        allowedAuthoritativeRefs: ["workspace-governance"],
        lifecycle: "active",
        mustNotOwn: ["Workspace governance authority"],
        owns: ["Focus Timer source"],
        repoClass: "product-source",
        requiresSecurityBindings: false,
        validationBehavior: validationBehavior("product-runtime-source"),
      },
    }),
    "workspace-governance://repos/focus-timer-repository",
  );
  assert.equal(
    workspaceActiveRecordRef({
      id: "Focus Timer Interface",
      kind: "component",
      value: {
        componentClass: "product-runtime",
        lifecycle: "active",
        ownerRepo: "focus-timer-repository",
        product: "focus-timer",
        securityOwner: "security-architecture",
        validationBehavior: validationBehavior("product-runtime-component"),
      },
    }),
    "workspace-governance://components/focus-timer-interface",
  );
});

test("AI-suggested classification requires explicit matching operator acceptance", () => {
  const command = {
    ...classificationCommand({
      candidate: productCandidate("focus-timer"),
      decision: "admitted",
    }),
    aiSuggestion: {
      acceptanceState: "accepted",
      acceptedAt: "2026-07-30T10:00:00.000Z",
      acceptedBy: "operator://workspace-governance",
      auditRef: "workspace-governance://audit/focus-timer",
      callerId: "governance-console",
      confidence: "high",
      decisionId: "decision-focus-timer",
      generatedAt: "2026-07-30T09:59:00.000Z",
      invocationPath: "workspace-intake",
      operatorDecision: "admitted",
      policyStatus: "approved-profile",
      profileId: "governed-intake-advisor",
      suggestedDecision: "proposed",
    },
    decisionSource: "ai-suggested",
  };

  assert.ok(
    workspaceClassificationCommandBlockers(command).includes(
      "AI-suggested classification requires accepted governed-profile evidence and an explicit matching operator decision.",
    ),
  );

  command.aiSuggestion.suggestedDecision = "admitted";
  assert.deepEqual(workspaceClassificationCommandBlockers(command), []);
});

function classificationCommand({ candidate, decision }) {
  return {
    candidate,
    decidedAt: "2026-07-30T10:00:00.000Z",
    decision,
    decisionSource: "operator",
    expectedIntakeRegisterVersion: "intake-register-v1",
    idempotencyKey: `workspace-intake:${candidate.canonicalKey}:${decision}`,
    operatorRef: "operator://workspace-governance",
    rationale: "Exercise the Workspace Intake contract.",
    requestId: `classify-${candidate.canonicalKey}`,
  };
}

function productCandidate(id) {
  return {
    candidateRef: `prototype-local://delivery/product-candidates/${id}`,
    candidateVersion: "prototype-local-v1",
    canonicalKey: id,
    correlationRef: `delivery-closeout:${id}`,
    entrantKind: "product",
    evidenceRefs: [`prototype-local://delivery/evidence/${id}`],
    intakeMetadata: {
      intendedEndpoint: "prototype-local-preview",
      platformOwner: "platform-engineering",
      runtimeOwner: "workspace-prototype-studio",
      securityOwner: "security-architecture",
      sourceOwners: ["workspace-prototype-studio"],
      validationBehavior: validationBehavior("product-readiness-aggregate"),
    },
    name: id,
    sourceOwnerRef: "workspace-prototype-studio",
  };
}

function validationBehavior(wgcfGraphRole) {
  return {
    catalogRefs: ["component-contracts", "review-coverage"],
    notes: "Focused contract proof remains owner-repo validated.",
    posture: "covered-by-owner-repo",
    wgcfGraphRole,
  };
}
