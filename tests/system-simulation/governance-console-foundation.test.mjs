import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getProposalRuntimeProjectionSnapshot,
  submitProposalCaptureCommand,
} from "../../src/domain-workspaces/proposal/local-runtime/proposal-runtime.ts";
import { projectProposalEffectiveRecord } from "../../src/domain-workspaces/proposal/local-runtime/proposal-effective-projection.ts";
import {
  proposalRouteSelectionComplete,
  proposalRouteSelectionTargetValid,
} from "../../src/domain-workspaces/proposal/work-model/proposal-disposition-model.ts";
import { submitProposalWorkflowIntegrationCommand } from "../../src/domain-workspaces/operation-integrations/proposal-workflow-integration-runtime.ts";
import {
  getProposalPrototypeEntryPacketProjections,
} from "../../src/domain-workspaces/operation-integrations/proposal-prototype-entry-projection.ts";
import {
  getProposalDeliveryEntryPacketProjections,
} from "../../src/domain-workspaces/operation-integrations/proposal-delivery-entry-projection.ts";
import {
  getProposalRepositoryGateResolutions,
  recordProposalRepositoryGateResolution,
} from "../../src/domain-workspaces/operation-integrations/proposal-repository-request-projection.ts";
import {
  getProposalRepositoryRequestRecords,
  reconcileRepositoryIngress,
} from "../../src/domain-workspaces/repository/local-runtime/ingress/repository-ingress-runtime.ts";
import { recordRepositoryProposalGateResolutionCommand } from "../../src/domain-workspaces/repository/local-runtime/repository-runtime.ts";

import { getPrototypeEntryPacketProjections } from "../../src/domain-workspaces/prototype/local-runtime/prototype-entry-runtime.ts";
import {
  submitPrototypeProjectionCommand,
  submitPrototypeRequestCommand,
} from "../../src/domain-workspaces/prototype/local-runtime/prototype-runtime.ts";
import { runPrototypeLandingSimulation } from "../../src/domain-workspaces/prototype/local-runtime/prototype-landing-runtime.ts";
import { prototypeRecordFromEntryPacket } from "../../src/domain-workspaces/prototype/work-model/entry/prototype-entry-packet-record.ts";
import { prototypeSupportRowsFromInputs } from "../../src/domain-workspaces/prototype/domain/support/prototype-support-profile-model.ts";
import {
  prototypeLandingDraftFromRecord,
  prototypeLandingDraftKey,
} from "../../src/domain-workspaces/prototype/work-model/workflows/landing/prototype-landing-model.ts";
import { prototypeMovementIntentValid } from "../../src/domain-workspaces/prototype/work-model/workflows/movement-request/prototype-movement-request-model.ts";
import { prototypeBaselineApprovedRecords } from "../../src/domain-workspaces/prototype/read-model/fixtures/records/prototype-baseline-approved-records.fixture.ts";
import {
  recordPrototypeMovementRequestPacket,
} from "../../src/domain-workspaces/operation-integrations/prototype-movement-request-projection.ts";

import {
  createLocalRefinementApplyReceipt,
  createLocalWorkDesignApplyReceipt,
  getDeliveryWorkspaceProjectionSnapshot,
  projectDeliveryEffectiveReadModel,
  reconcileDeliveryIngress,
  recordLocalDeliveryCloseout,
  recordLocalDeliveryIntakeConsume,
  recordLocalDeliveryRefinementApply,
  recordLocalDeliveryWorkDesignApply,
  submitDeliveryCloseoutCommand,
} from "../../src/domain-workspaces/delivery/local-runtime/index.ts";
import { deliveryReadModel } from "../../src/domain-workspaces/delivery/read-model/index.ts";

import {
  productPacketFixture,
  projectionContextFixture,
} from "../../src/domain-workspaces/portfolio/read-model/fixtures/product-portfolio/product-portfolio-fixture-builders.ts";
import { publicationUpdateScenarios } from "../../src/domain-workspaces/portfolio/read-model/fixtures/product-portfolio/publication-updates.fixture.ts";
import {
  applyProductPublicationDecision,
  validateProductPublicationDecision,
} from "../../src/domain-workspaces/portfolio/work-model/publication/product-publication-decision-model.ts";
import { projectProductPublication } from "../../src/domain-workspaces/portfolio/work-model/publication/product-publication-projection.ts";

import {
  activeRecordDigest,
  WorkspaceGovernanceSimulator,
} from "./support/workspace-governance-simulator.ts";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = join(testDirectory, "fixtures", "focus-timer-app");
const routeCatalog = JSON.parse(
  await readFile(
    join(testDirectory, "foundation-route-catalog.json"),
    "utf8",
  ),
);
const productManifest = JSON.parse(
  await readFile(join(fixtureDirectory, "product-manifest.json"), "utf8"),
);
const routeIds = new Set(routeCatalog.scenarios.map((scenario) => scenario.id));
const provenRouteIds = new Set();
let eventSequence = 0;

test("the Console foundation carries a synthetic product through every catalogued route", async (t) => {
  assert.equal(
    routeIds.size,
    routeCatalog.scenarios.length,
    "Foundation route ids must be unique.",
  );
  assert.equal(
    routeCatalog.scenarios.every((scenario) =>
      ["console-local", "contract", "contract-simulated"].includes(
        scenario.boundary,
      ),
    ),
    true,
    "Every route must declare its actual proof boundary.",
  );

  const previewServer = await startFixtureServer(fixtureDirectory);
  t.after(() => previewServer.close());

  let focusPrototypeRecord = null;
  let focusRefinedPackage = null;
  let focusDeliveryOutcome = null;
  let focusActiveProduct = null;
  let focusActiveProductVersion = null;
  let focusPortfolioEntry = null;

  await t.test("Proposal covers terminal, recovery, repository, and destination routes", async () => {
    const parked = await captureAndTriageProposal("Parked proposal");
    await applyProposalDisposition(parked, {
      outcome: "parked",
      route: null,
    });
    assert.equal(effectiveProposal(parked).status, "parked");
    prove("proposal-parked-terminal");

    const resumedPacket = await routeAcceptedProposal({
      proposal: parked,
      repoMode: "not-required",
      routeTarget: "Prototype",
    });
    assert.equal(resumedPacket.packet.targetDomain, "prototype");
    prove("proposal-parked-resume");

    const rejected = await captureAndTriageProposal("Rejected proposal");
    await applyProposalDisposition(rejected, {
      outcome: "rejected",
      route: null,
    });
    assert.equal(effectiveProposal(rejected).status, "done");
    assert.equal(
      proposalPacketsFor(rejected).length,
      0,
      "A rejected proposal must not create a downstream packet.",
    );
    prove("proposal-rejected-terminal");

    const routeCases = [
      {
        id: "proposal-prototype-no-repository",
        repoMode: "not-required",
        routeTarget: "Prototype",
      },
      {
        id: "proposal-prototype-existing-repository",
        repoMode: "existing",
        routeTarget: "Prototype",
      },
      {
        id: "proposal-prototype-repository-resolution",
        repoMode: "new",
        routeTarget: "Prototype",
      },
      {
        id: "proposal-delivery-no-repository",
        repoMode: "not-required",
        routeTarget: "Delivery",
      },
      {
        id: "proposal-delivery-existing-repository",
        repoMode: "existing",
        routeTarget: "Delivery",
      },
      {
        id: "proposal-delivery-repository-resolution",
        repoMode: "new",
        routeTarget: "Delivery",
      },
    ];

    for (const routeCase of routeCases) {
      const proposal = await captureAndTriageProposal(
        routeCase.id === "proposal-prototype-existing-repository"
          ? productManifest.product.display_name
          : routeCase.id,
      );
      const packet = await routeAcceptedProposal({
        proposal,
        repoMode: routeCase.repoMode,
        routeTarget: routeCase.routeTarget,
      });

      assert.equal(packet.packet.targetDomain, routeCase.routeTarget.toLowerCase());
      assert.equal(packet.custody.state, "admitted");
      prove(routeCase.id);

      if (routeCase.id === "proposal-prototype-existing-repository") {
        const projection = getPrototypeEntryPacketProjections().find(
          (candidate) => candidate.packet.packetId === packet.packet.packetId,
        );
        assert.ok(projection);
        focusPrototypeRecord = prototypeRecordFromEntryPacket(projection, 0);
      }
    }

    const gatedProposal = await captureAndTriageProposal(
      "Repository gate remains unresolved",
    );
    await applyProposalDisposition(gatedProposal, {
      outcome: "accepted",
      route: proposalRoute({
        proposal: gatedProposal,
        repoMode: "new",
        routeTarget: "Prototype",
      }),
    });
    await assert.rejects(
      () =>
        submitProposalWorkflowIntegrationCommand({
          payload: {
            notes: "Attempt handoff before Repository resolves source custody.",
            result: "ready",
            step: "handoff",
          },
          proposal: gatedProposal,
          proposalId: gatedProposal.id,
          source: proposalSource(gatedProposal),
          submittedAt: nextTimestamp(),
        }),
      /resolved source custody/i,
    );
    assert.equal(proposalPacketsFor(gatedProposal).length, 0);
    reconcileRepositoryIngress();
    assert.ok(
      getProposalRepositoryRequestRecords().find(
        (record) => record.proposalGate?.proposalId === gatedProposal.id,
      ),
    );
    prove("proposal-new-repository-gate-blocked");

    const invalidRoute = {
      proposalId: "invalid-direct-portfolio",
      rationale: "A proposal cannot publish directly.",
      repoMode: "not-required",
      repoOwner: "",
      repoRef: "",
      routeTarget: "Portfolio",
    };
    assert.equal(proposalRouteSelectionTargetValid("Portfolio"), false);
    assert.equal(proposalRouteSelectionComplete(invalidRoute), false);
    const invalidRouteProposal = await captureAndTriageProposal(
      "Invalid direct Portfolio route",
    );
    await assert.rejects(
      () =>
        applyProposalDisposition(invalidRouteProposal, {
          outcome: "accepted",
          route: {
            ...invalidRoute,
            proposalId: invalidRouteProposal.id,
          },
        }),
      /complete supported route/i,
    );
    prove("proposal-direct-portfolio-forbidden");
  });

  await t.test("Prototype enforces lifecycle order, runs the product, and prepares Delivery movement", async () => {
    assert.ok(focusPrototypeRecord);

    const candidateInput = {
      audience: {
        kind: "self",
        label: "Focus Timer operator",
      },
      decision: "promote-candidate",
      objective: productManifest.product.purpose,
      proof: {
        criterion: "The timer loads and exposes start, pause, and reset controls.",
        method: "technical-validation",
      },
      scope: {
        excluded: ["Live user accounts", "Production deployment"],
        included: ["Static timer interface", "Local preview proof"],
      },
    };
    const prematureCandidate = await submitPrototypeProjectionCommand({
      commandId: "record-candidate-promotion",
      input: candidateInput,
      record: focusPrototypeRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(prematureCandidate.projected, false);
    assert.equal(prematureCandidate.receipt.resultState, "blocked");
    prove("prototype-candidate-order-guard");

    const blockedDraft = prototypeLandingDraftFromRecord(focusPrototypeRecord);
    const blockedSimulation = await runPrototypeLandingSimulation({
      draft: blockedDraft,
      draftKey: prototypeLandingDraftKey(blockedDraft),
      record: focusPrototypeRecord,
    });
    const blockedLanding = await submitPrototypeProjectionCommand({
      commandId: "land-prototype-request",
      input: {
        draft: blockedDraft,
        simulationDraftKey: blockedSimulation.draftKey,
        simulationReceiptId:
          blockedSimulation.receipt.receipt.receiptId,
      },
      record: focusPrototypeRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(blockedLanding.nextRecord.landing.state, "blocked");
    assert.equal(
      blockedLanding.nextRecord.landing.blockedItems.includes("base platform"),
      true,
    );
    prove("prototype-landing-blocked");

    const landingDraft = focusTimerLandingDraft(blockedLanding.nextRecord);
    const landingSimulation = await runPrototypeLandingSimulation({
      draft: landingDraft,
      draftKey: prototypeLandingDraftKey(landingDraft),
      record: blockedLanding.nextRecord,
    });
    const landed = await submitPrototypeProjectionCommand({
      commandId: "land-prototype-request",
      input: {
        draft: landingDraft,
        simulationDraftKey: landingSimulation.draftKey,
        simulationReceiptId: landingSimulation.receipt.receipt.receiptId,
      },
      record: blockedLanding.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(landed.nextRecord.landing.state, "landed");
    assert.equal(landed.nextRecord.name, productManifest.product.display_name);
    prove("prototype-landing-recovery");

    const blockedCandidateRecord = {
      ...structuredClone(landed.nextRecord),
      openIssues: [
        ...landed.nextRecord.openIssues,
        {
          id: "focus-timer-candidate-blocker",
          owner: productManifest.ownership.product_owner_ref,
          requiredFix: "Clarify the intended audience before promotion.",
          status: "blocked",
          title: "Candidate audience is unresolved",
          tone: "danger",
        },
      ],
    };
    const blockedCandidate = await submitPrototypeProjectionCommand({
      commandId: "record-candidate-promotion",
      input: {
        ...candidateInput,
        decision: "block-promotion",
      },
      record: blockedCandidateRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(blockedCandidate.nextRecord.candidate.state, "blocked");
    assert.equal(blockedCandidate.nextRecord.lifecycle, "exploring");
    prove("prototype-candidate-blocked");

    const candidateCloseout = await submitPrototypeProjectionCommand({
      commandId: "record-candidate-promotion",
      input: {
        ...candidateInput,
        decision: "route-closeout",
      },
      record: landed.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(
      candidateCloseout.nextRecord.candidate.state,
      "closeout-routed",
    );
    assert.equal(
      candidateCloseout.nextRecord.currentMove.id,
      "closeout-retirement",
    );
    prove("prototype-candidate-closeout-routed");

    const prematureBaseline = await submitPrototypeProjectionCommand({
      commandId: "record-baseline-promotion",
      input: focusTimerBaselineInput(),
      record: landed.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(prematureBaseline.projected, false);
    assert.equal(prematureBaseline.receipt.resultState, "blocked");
    prove("prototype-baseline-order-guard");

    const candidate = await submitPrototypeProjectionCommand({
      commandId: "record-candidate-promotion",
      input: candidateInput,
      record: landed.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(candidate.nextRecord.lifecycle, "candidate");

    const blockedBaseline = await submitPrototypeProjectionCommand({
      commandId: "record-baseline-promotion",
      input: {
        ...focusTimerBaselineInput(),
        decision: "block-baseline",
        issueDisposition:
          "The baseline statement needs a bounded correction before movement.",
      },
      record: candidate.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(blockedBaseline.nextRecord.baseline.state, "blocked");
    assert.ok(
      blockedBaseline.nextRecord.openIssues.some(
        (issue) => issue.status === "blocked",
      ),
    );
    prove("prototype-baseline-blocked");

    const baselineCloseout = await submitPrototypeProjectionCommand({
      commandId: "record-baseline-promotion",
      input: {
        ...focusTimerBaselineInput(),
        decision: "route-closeout",
      },
      record: candidate.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(
      baselineCloseout.nextRecord.currentMove.id,
      "closeout-retirement",
    );
    prove("prototype-baseline-closeout-routed");

    const previewProfile = {
      command: "node tests/system-simulation/support/static-fixture-server.mjs",
      healthcheckPath: "/",
      host: "127.0.0.1",
      launchAdapter: "static-server",
      port: String(previewServer.port),
      profileRef: "focus-timer-local-preview",
      profileSource: "system-simulation fixture",
      workingDirectory: fixtureDirectory,
    };
    const savedProfile = await submitPrototypeProjectionCommand({
      commandId: "save-preview-profile",
      input: previewProfile,
      record: candidate.nextRecord,
      submittedAt: nextTimestamp(),
    });
    const confirmedProfile = await submitPrototypeProjectionCommand({
      commandId: "confirm-preview-profile",
      input: previewProfile,
      record: savedProfile.nextRecord,
      submittedAt: nextTimestamp(),
    });
    const startedPreview = await submitPrototypeProjectionCommand({
      commandId: "start-preview",
      input: {},
      record: confirmedProfile.nextRecord,
      submittedAt: nextTimestamp(),
    });

    const previewResponse = await fetch(previewServer.url);
    const previewHtml = await previewResponse.text();
    const previewScript = await (
      await fetch(new URL("app.js", previewServer.url))
    ).text();
    const previewStyles = await (
      await fetch(new URL("styles.css", previewServer.url))
    ).text();
    assert.equal(previewResponse.status, 200);
    assert.match(previewHtml, /Focus Timer/);
    assert.match(previewScript, /startTimer/);
    assert.match(previewScript, /reset\.addEventListener/);
    assert.match(previewStyles, /\.timer-shell/);
    Function(previewScript);

    const checkedPreview = await submitPrototypeProjectionCommand({
      commandId: "refresh-preview-proof",
      input: {},
      record: startedPreview.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(checkedPreview.nextRecord.preview.runtimeState, "running");
    assert.equal(checkedPreview.nextRecord.preview.proofState, "proof-ready");
    assert.ok(checkedPreview.nextRecord.preview.lastCheckLogRef);
    prove("prototype-preview-proof");

    const baseline = await submitPrototypeProjectionCommand({
      commandId: "record-baseline-promotion",
      input: focusTimerBaselineInput(),
      record: checkedPreview.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(baseline.nextRecord.lifecycle, "baseline-approved");
    assert.equal(baseline.nextRecord.baseline.state, "ready-for-movement");

    const impactedCloseout = await submitPrototypeProjectionCommand({
      commandId: "record-closeout-retirement",
      input: {
        decision: "prepare-impacted-request",
        explanation:
          "Close the baseline-approved prototype while preserving governed impact.",
        reason: "no-longer-valuable",
        retention: "keep-docs-only",
        supersededBy: "",
      },
      record: baseline.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(impactedCloseout.nextRecord.currentMove.id, "movement-request");
    assert.equal(impactedCloseout.nextRecord.movementRequest.movementType, "retire");
    const impactedMovement = await submitPrototypeProjectionCommand({
      commandId: "prepare-movement-request",
      input: {
        movementIntent: "impacted-closeout",
        requestReason:
          "Preserve linked baseline evidence while closing the Prototype source.",
        targetLane: "impacted-closeout",
        targetOwner: "Movement reviewer",
      },
      record: impactedCloseout.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(
      impactedMovement.nextRecord.movementRequest.state,
      "request-recorded",
    );
    prove("prototype-impacted-closeout-request");

    const returnedMovementRecord = prototypeBaselineApprovedRecords.find(
      (record) => record.id === "prototype-returned-movement-fixture",
    );
    assert.ok(returnedMovementRecord);
    const unchangedReturn = await submitPrototypeProjectionCommand({
      commandId: "prepare-movement-request",
      input: {
        movementIntent: "returned-correction",
        requestReason: returnedMovementRecord.movementRequest.requestReason,
        targetLane: returnedMovementRecord.movementRequest.targetLane,
        targetOwner: returnedMovementRecord.movementRequest.targetOwner,
      },
      record: returnedMovementRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(unchangedReturn.projected, false);
    assert.equal(unchangedReturn.receipt.resultState, "blocked");
    prove("prototype-returned-movement-unchanged-blocked");

    const correctedReturn = await submitPrototypeProjectionCommand({
      commandId: "prepare-movement-request",
      input: {
        movementIntent: "returned-correction",
        requestReason:
          "Move the approved prototype into Delivery so durable source ownership and release work can continue.",
        targetLane: returnedMovementRecord.movementRequest.targetLane,
        targetOwner: returnedMovementRecord.movementRequest.targetOwner,
      },
      record: returnedMovementRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(
      correctedReturn.nextRecord.movementRequest.state,
      "request-recorded",
    );
    prove("prototype-returned-movement-corrected");

    assert.equal(prototypeMovementIntentValid("portfolio"), false);
    const invalidMovement = await submitPrototypeProjectionCommand({
      commandId: "prepare-movement-request",
      input: {
        movementIntent: "portfolio",
        requestReason: "Direct Portfolio publication is forbidden.",
        targetLane: "portfolio",
        targetOwner: "Portfolio",
      },
      record: baseline.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(invalidMovement.projected, false);
    assert.equal(invalidMovement.receipt.resultState, "blocked");
    prove("prototype-direct-portfolio-forbidden");

    const movement = await submitPrototypeProjectionCommand({
      commandId: "prepare-movement-request",
      input: {
        movementIntent: "governed-delivery",
        requestReason:
          "Continue the approved Focus Timer baseline through governed Delivery.",
        targetLane: "delivery-intake",
        targetOwner: "Delivery ingress",
      },
      record: baseline.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(movement.nextRecord.movementRequest.state, "request-recorded");
    const movementPacket = recordPrototypeMovementRequestPacket(
      movement.receipt,
    );
    assert.ok(movementPacket);
    reconcileDeliveryIngress();
    const admittedMovementPacket =
      getPrototypeEntryOrMovementProjection(movementPacket.packet.packetId);
    assert.equal(admittedMovementPacket.custody.state, "admitted");
    focusPrototypeRecord = movement.nextRecord;
    prove("prototype-baseline-to-delivery");

    const retirementRequest = await submitPrototypeRequestCommand(
      {
        basePlatform: "static-site",
        dataMode: "synthetic",
        mutationBoundary: "prototype-local",
        name: "Disposable Timer Experiment",
        owner: "Prototype Studio",
        previewNeed: "none",
        prototypeObjective:
          "Prove that an unlinked local prototype can retire without Movement Control.",
        sourceContext: "Synthetic closeout route fixture.",
        sourceHome: "new-prototype-folder",
        supportProfile: "simple-prototype",
        visibilityTier: "private-internal",
      },
      {
        requestId: "prototype-local-retirement",
        submittedAt: nextTimestamp(),
      },
    );
    const retirementDraft =
      prototypeLandingDraftFromRecord(retirementRequest.record);
    const retirementSimulation = await runPrototypeLandingSimulation({
      draft: retirementDraft,
      draftKey: prototypeLandingDraftKey(retirementDraft),
      record: retirementRequest.record,
    });
    const retirementLanding = await submitPrototypeProjectionCommand({
      commandId: "land-prototype-request",
      input: {
        draft: retirementDraft,
        simulationDraftKey: retirementSimulation.draftKey,
        simulationReceiptId:
          retirementSimulation.receipt.receipt.receiptId,
      },
      record: retirementRequest.record,
      submittedAt: nextTimestamp(),
    });
    const retirement = await submitPrototypeProjectionCommand({
      commandId: "record-closeout-retirement",
      input: {
        decision: "retire-locally",
        explanation: "The local experiment has served its purpose.",
        reason: "no-longer-valuable",
        retention: "keep-docs-only",
        supersededBy: "",
      },
      record: retirementLanding.nextRecord,
      submittedAt: nextTimestamp(),
    });
    assert.equal(retirement.nextRecord.lifecycle, "retired");
    prove("prototype-local-retirement");
  });

  await t.test("Delivery consumes, designs, refines, executes, and closes the Prototype packet", async () => {
    assert.ok(focusPrototypeRecord);
    reconcileDeliveryIngress();
    let effectiveDelivery = currentDeliveryProjection();
    const failedIntake = effectiveDelivery.intake_sources.find(
      (source) => source.intake_status === "consume_failed",
    );
    assert.ok(failedIntake);
    recordLocalDeliveryIntakeConsume(failedIntake);
    effectiveDelivery = currentDeliveryProjection();
    assert.equal(
      effectiveDelivery.intake_sources.find(
        (source) =>
          source.accepted_source_id === failedIntake.accepted_source_id,
      )?.intake_status,
      "consumed",
    );
    prove("delivery-consume-failed-recovered");

    const intakeSource = effectiveDelivery.intake_sources.find(
      (source) =>
        source.source_kind === "prototype" &&
        source.title === productManifest.product.display_name,
    );
    assert.ok(intakeSource);
    assert.equal(intakeSource.intake_status, "needs_consume");

    recordLocalDeliveryIntakeConsume(intakeSource);
    effectiveDelivery = currentDeliveryProjection();
    const consumedSource = effectiveDelivery.intake_sources.find(
      (source) => source.accepted_source_id === intakeSource.accepted_source_id,
    );
    assert.equal(consumedSource?.intake_status, "consumed");
    const workDesignPackage = effectiveDelivery.packages.find(
      (deliveryPackage) =>
        deliveryPackage.delivery_package_id ===
        consumedSource?.delivery_package_id,
    );
    assert.ok(workDesignPackage);
    assert.equal(workDesignPackage.workflow_phase, "work_design");

    const workDesignReceipt = createLocalWorkDesignApplyReceipt({
      appliedAt: nextTimestamp(),
      deliveryPackage: workDesignPackage,
      targetTree: focusTimerWorkTree(),
    });
    recordLocalDeliveryWorkDesignApply({
      deliveryPackage: {
        ...workDesignPackage,
        summary: "Stale source revision used only to prove the version guard.",
      },
      record: workDesignReceipt,
    });
    effectiveDelivery = currentDeliveryProjection();
    assert.equal(
      effectiveDelivery.packages.some(
        (deliveryPackage) =>
          deliveryPackage.refinement_packet?.handoff
            .source_work_design_receipt_id === workDesignReceipt.receiptId,
      ),
      false,
    );
    prove("delivery-work-design-stale-blocked");

    recordLocalDeliveryWorkDesignApply({
      deliveryPackage: workDesignPackage,
      record: workDesignReceipt,
    });
    effectiveDelivery = currentDeliveryProjection();
    const refinementPackage = effectiveDelivery.packages.find(
      (deliveryPackage) =>
        deliveryPackage.workflow_phase === "refinement" &&
        deliveryPackage.refinement_packet?.handoff
          .source_work_design_receipt_id === workDesignReceipt.receiptId,
    );
    assert.ok(refinementPackage);
    assert.ok(refinementPackage.refinement_packet);

    const metadataValues = Object.fromEntries(
      refinementPackage.refinement_packet.draft_groups.flatMap((group) =>
        group.fields.map((field) => [
          field.backend_field,
          refinementValue(field.backend_field, field.value),
        ]),
      ),
    );
    const metadataResolutions = Object.fromEntries(
      Object.keys(metadataValues).map((field) => [field, "accepted"]),
    );
    const refinementReceipt = createLocalRefinementApplyReceipt({
      applyPlan: refinementPackage.refinement_packet.apply_plan,
      appliedAt: nextTimestamp(),
      metadataDraftValues: metadataValues,
      metadataFieldResolutions: metadataResolutions,
      packetId: refinementPackage.refinement_packet.packet_id,
      sourceWorkDesignReceiptId: workDesignReceipt.receiptId,
    });
    const failedRefinementReceipt = {
      ...structuredClone(refinementReceipt),
      lines: ["Synthetic Refinement apply failed before a durable result."],
      outcome: "failed",
      receipt_id: `${refinementReceipt.receipt_id}-failed`,
      result_state: "blocked",
      tone: "danger",
    };
    recordLocalDeliveryRefinementApply({
      deliveryPackage: refinementPackage,
      receipt: failedRefinementReceipt,
    });
    effectiveDelivery = currentDeliveryProjection();
    assert.equal(
      effectiveDelivery.packages.find(
        (deliveryPackage) =>
          deliveryPackage.delivery_package_id ===
          refinementPackage.delivery_package_id,
      )?.local_workflow_projection?.status_label,
      "Blocked",
    );
    prove("delivery-refinement-failed");

    recordLocalDeliveryRefinementApply({
      deliveryPackage: refinementPackage,
      receipt: refinementReceipt,
    });
    effectiveDelivery = currentDeliveryProjection();
    focusRefinedPackage = effectiveDelivery.packages.find(
      (deliveryPackage) =>
        deliveryPackage.delivery_package_id ===
        refinementPackage.delivery_package_id,
    );
    assert.equal(
      focusRefinedPackage?.local_workflow_projection?.status_label,
      "Done",
    );
    const executionPackage = effectiveDelivery.packages.find(
      (deliveryPackage) =>
        deliveryPackage.workflow_phase === "execution" &&
        deliveryPackage.execution_handoff?.source_refinement_receipt_id ===
          refinementReceipt.receipt_id,
    );
    assert.ok(executionPackage);
    prove("delivery-refinement-retry");
    prove("delivery-consume-design-refine");

    const ordinaryExecutionPackage = {
      ...structuredClone(executionPackage),
      delivery_package_id: `${executionPackage.delivery_package_id}-ordinary-proof`,
      display_name: `${executionPackage.display_name} ordinary closeout proof`,
    };
    const ordinaryCloseout = await submitDeliveryCloseoutCommand({
      closeout: deliveryCloseoutCommand({
        deliveryPackage: ordinaryExecutionPackage,
        impact: { kind: "none" },
      }),
      deliveryPackage: ordinaryExecutionPackage,
      submittedAt: nextTimestamp(),
    });
    assert.equal(ordinaryCloseout.run.state, "completed");
    assert.ok(ordinaryCloseout.receipt);
    assert.equal(ordinaryCloseout.receipt.receipt.outcome.impact.kind, "none");
    assert.match(
      ordinaryCloseout.receipt.receipt.outcome.historyRef,
      /delivery\/history/,
    );
    prove("delivery-ordinary-outcome-history");

    const correlationId =
      `delivery-closeout:${executionPackage.delivery_package_id}`;
    const productCloseout = await submitDeliveryCloseoutCommand({
      closeout: deliveryCloseoutCommand({
        correlationId,
        deliveryPackage: executionPackage,
        impact: {
          candidate: {
            candidateRef:
              `prototype-local://delivery/product-candidates/` +
              productManifest.product.id,
            candidateVersion: "prototype-local-v1",
            canonicalKey: productManifest.product.id,
            correlationRef: correlationId,
            entrantKind: "product",
            evidenceRefs: [
              refinementReceipt.receipt_id,
              `prototype-local://delivery/execution/${productManifest.product.id}`,
            ],
            intakeMetadata: productEntrantIntakeMetadata(),
            name: productManifest.product.display_name,
            sourceOwnerRef: productManifest.ownership.source_owner_ref,
          },
          kind: "workspace-entrant",
        },
      }),
      deliveryPackage: executionPackage,
      submittedAt: nextTimestamp(),
    });
    assert.equal(productCloseout.run.state, "completed");
    assert.ok(productCloseout.receipt);
    recordLocalDeliveryCloseout({
      deliveryPackage: executionPackage,
      receipt: productCloseout.receipt.receipt,
    });
    focusDeliveryOutcome = productCloseout.receipt.receipt.outcome;
    assert.equal(focusDeliveryOutcome.impact.kind, "workspace-entrant");
    assert.equal(
      workspaceEntrantCandidateFromOutcome(
        focusDeliveryOutcome,
      ).evidenceRefs.includes(
        refinementReceipt.receipt_id,
      ),
      true,
    );
    effectiveDelivery = currentDeliveryProjection();
    assert.equal(
      effectiveDelivery.packages.find(
        (deliveryPackage) =>
          deliveryPackage.delivery_package_id ===
          executionPackage.delivery_package_id,
      )?.local_workflow_projection?.status_label,
      "Done",
    );
    prove("delivery-product-outcome");
  });

  await t.test("Workspace Governance classifies entrants and promotes active inventory atomically", () => {
    assert.ok(focusDeliveryOutcome);
    const focusDeliveryCandidate =
      workspaceEntrantCandidateFromOutcome(focusDeliveryOutcome);
    const governance = new WorkspaceGovernanceSimulator({
      activeRepositoryIds: [
        "platform-engineering",
        "security-architecture",
        "workspace-governance",
        "workspace-prototype-studio",
      ],
    });

    const outOfScopeReceipt = governance.classify(
      classificationCommand({
        candidate: entrantCandidate("scratch-repository", "repository"),
        decision: "out-of-scope",
        governance,
        requestId: "classify-scratch-repository",
      }),
    );
    assert.equal(outOfScopeReceipt.decision, "out-of-scope");
    prove("workspace-intake-out-of-scope");

    const proposedReceipt = governance.classify(
      classificationCommand({
        candidate: entrantCandidate("unresolved-component", "component"),
        decision: "proposed",
        governance,
        requestId: "classify-unresolved-component",
      }),
    );
    assert.equal(proposedReceipt.decision, "proposed");
    prove("workspace-intake-proposed");

    const proposedComponent = {
      id: "unresolved-component",
      kind: "component",
      value: {
        componentClass: "product-runtime",
        lifecycle: "active",
        ownerRepo: "workspace-prototype-studio",
        product: null,
        securityOwner: "security-architecture",
        validationBehavior: validationBehavior("product-runtime-component"),
      },
    };
    assert.throws(
      () =>
        governance.promote(
          promotionCommand({
            activeRecord: proposedComponent,
            classification: proposedReceipt,
            governance,
            requestId: "promote-non-admitted-component",
          }),
        ),
      /Only an admitted Workspace Intake entry/i,
    );
    prove("workspace-promotion-non-admitted-forbidden");

    const staleCandidate = entrantCandidate(
      "stale-repository",
      "repository",
    );
    const staleClassification = governance.classify(
      classificationCommand({
        candidate: staleCandidate,
        decision: "admitted",
        governance,
        requestId: "classify-stale-repository",
      }),
    );
    const staleRepository = activeRepositoryRecord(staleCandidate);
    assert.throws(
      () =>
        governance.promote({
          ...promotionCommand({
            activeRecord: staleRepository,
            classification: staleClassification,
            governance,
            requestId: "promote-stale-intake-repository",
          }),
          intakeEntryVersion: `${staleClassification.intakeEntryVersion}-old`,
        }),
      /stale intake version/i,
    );
    prove("workspace-promotion-stale-intake-forbidden");

    assert.throws(
      () =>
        governance.promote({
          ...promotionCommand({
            activeRecord: staleRepository,
            classification: staleClassification,
            governance,
            requestId: "promote-stale-digest-repository",
          }),
          activeRecordDigest: "sha256:stale",
        }),
      /active record digest is stale/i,
    );
    prove("workspace-promotion-stale-digest-forbidden");

    const detachedComponentCandidate = entrantCandidate("detached-component", "component", {
      ownerRepo: "not-active",
    });
    const detachedComponentClassification = governance.classify(
      classificationCommand({
        candidate: detachedComponentCandidate,
        decision: "admitted",
        governance,
        requestId: "classify-detached-component",
      }),
    );
    const detachedComponent = {
      id: detachedComponentCandidate.canonicalKey,
      kind: "component",
      value: {
        componentClass: "product-runtime",
        lifecycle: "active",
        ownerRepo: "not-active",
        product: null,
        securityOwner: "security-architecture",
        validationBehavior: validationBehavior("product-runtime-component"),
      },
    };
    assert.throws(
      () =>
        governance.promote(
          promotionCommand({
            activeRecord: detachedComponent,
            classification: detachedComponentClassification,
            governance,
            requestId: "promote-detached-component",
          }),
        ),
      /requires active owner/i,
    );
    prove("workspace-component-repository-forbidden");

    const productClassificationCommand = classificationCommand({
      candidate: focusDeliveryCandidate,
      decision: "admitted",
      governance,
      requestId: "classify-focus-timer-product",
    });
    const productClassification = governance.classify(
      productClassificationCommand,
    );
    assert.equal(productClassification.decision, "admitted");
    prove("workspace-intake-admitted-product");

    const replay = governance.classify(productClassificationCommand);
    assert.equal(replay.receiptRef, productClassification.receiptRef);
    prove("workspace-intake-idempotent-replay");

    const repositoryCandidate = entrantCandidate(
      "focus-timer-repository",
      "repository",
    );
    const repositoryClassification = governance.classify(
      classificationCommand({
        candidate: repositoryCandidate,
        decision: "admitted",
        governance,
        requestId: "classify-focus-timer-repository",
      }),
    );
    const activeRepository = activeRepositoryRecord(repositoryCandidate);
    const repositoryPromotion = governance.promote(
      promotionCommand({
        activeRecord: activeRepository,
        classification: repositoryClassification,
        governance,
        requestId: "promote-focus-timer-repository",
      }),
    );
    assert.equal(repositoryPromotion.result, "promoted");
    prove("workspace-promote-repository");

    focusActiveProduct = {
      id: productManifest.product.id,
      kind: "product",
      value: {
        governedProdPromotion: false,
        highestRealEndpoint: "prototype-local-preview",
        lifecycle: productManifest.portfolio.lifecycle,
        platformOwner: productManifest.ownership.platform_owner_ref,
        runtimeOwner: productManifest.ownership.runtime_owner_ref,
        securityOwner: productManifest.ownership.security_owner_ref,
        sourceOwners: [
          repositoryCandidate.canonicalKey,
          "workspace-prototype-studio",
        ],
        stageSupported: false,
        validationBehavior: validationBehavior("product-readiness-aggregate"),
      },
    };
    const productPromotion = governance.promote(
      promotionCommand({
        activeRecord: focusActiveProduct,
        classification: productClassification,
        governance,
        requestId: "promote-focus-timer-product",
      }),
    );
    focusActiveProductVersion = productPromotion.activeInventoryVersion;
    assert.equal(productPromotion.result, "promoted");
    assert.equal(
      governance.getIntakeEntry(productClassification.canonicalIntakeEntryRef),
      null,
    );
    assert.ok(
      governance.getActiveRecord("product", productManifest.product.id),
    );
    prove("workspace-promote-product");

    const componentCandidate = entrantCandidate("focus-timer-interface", "component", {
      ownerRepo: repositoryCandidate.canonicalKey,
      product: productManifest.product.id,
    });
    const componentClassification = governance.classify(
      classificationCommand({
        candidate: componentCandidate,
        decision: "admitted",
        governance,
        requestId: "classify-focus-timer-component",
      }),
    );
    const activeComponent = {
      id: componentCandidate.canonicalKey,
      kind: "component",
      value: {
        componentClass: "product-runtime",
        lifecycle: "active",
        ownerRepo: repositoryCandidate.canonicalKey,
        product: productManifest.product.id,
        securityOwner: productManifest.ownership.security_owner_ref,
        validationBehavior: validationBehavior("product-runtime-component"),
      },
    };
    const componentPromotion = governance.promote(
      promotionCommand({
        activeRecord: activeComponent,
        classification: componentClassification,
        governance,
        requestId: "promote-focus-timer-component",
      }),
    );
    assert.equal(componentPromotion.result, "promoted");
    prove("workspace-promote-component");

    assert.throws(
      () =>
        governance.classify(
          classificationCommand({
            candidate: {
              ...focusDeliveryCandidate,
              candidateRef:
                "simulation://delivery/product-candidates/focus-timer-duplicate",
            },
            decision: "admitted",
            governance,
            requestId: "classify-focus-timer-overlap",
          }),
        ),
      /already active/i,
    );
    assert.equal(
      governance.snapshot().intake.some(
        (entry) =>
          entry.candidate.canonicalKey === productManifest.product.id,
      ),
      false,
    );
    prove("workspace-promotion-overlap-forbidden");
  });

  await t.test("Product Portfolio admits only active products and preserves publication outcomes", () => {
    assert.ok(focusActiveProduct);
    assert.ok(focusActiveProductVersion);
    const packet = portfolioPacket({
      activeProduct: focusActiveProduct,
      activeProductVersion: focusActiveProductVersion,
      previewUrl: previewServer.url,
    });
    const invalidPacket = structuredClone(packet);
    invalidPacket.product.registryVersion = "stale-product-version";
    const invalidValidation = validateProductPublicationDecision({
      context: projectionContextFixture(),
      draft: publishDraft(),
      packet: invalidPacket,
    });
    assert.equal(invalidValidation.allowed, false);
    assert.match(invalidValidation.findings.join(" "), /active-product-inventory/);
    prove("portfolio-inactive-product-forbidden");

    const captured = projectProductPublication(
      packet,
      projectionContextFixture(),
    );
    assert.equal(captured.publicationState, "captured");
    assert.equal(captured.entryProjection, "none");
    prove("portfolio-publication-captured");

    const rejected = applyProductPublicationDecision({
      context: projectionContextFixture(),
      decidedAt: nextTimestamp(),
      decidedByRef: "operator://system-simulation",
      draft: {
        outcome: "reject",
        reasonCode: "source-withdrawn",
        reasonNote: "Synthetic rejection route proof.",
      },
      idempotencyKey: "reject-focus-timer-publication",
      packet,
    });
    assert.equal(rejected.projection.publicationState, "rejected");
    assert.equal(rejected.projection.entry, null);
    prove("portfolio-publication-rejected");

    const published = applyProductPublicationDecision({
      context: projectionContextFixture(),
      decidedAt: nextTimestamp(),
      decidedByRef: "operator://system-simulation",
      draft: publishDraft(),
      idempotencyKey: "publish-focus-timer",
      packet,
    });
    assert.equal(published.projection.publicationState, "published");
    assert.equal(
      published.projection.entry?.identity.productId,
      productManifest.product.id,
    );
    assert.equal(
      published.projection.entry?.experience.primaryTarget?.href,
      previewServer.url,
    );
    focusPortfolioEntry = published.projection.entry;
    prove("portfolio-active-product-published");

    const duplicate = projectProductPublication(
      {
        ...structuredClone(packet),
        idempotencyKey: "portfolio-publication:focus-timer:duplicate",
        packetId: "portfolio-simulation://focus-timer/duplicate",
      },
      projectionContextFixture({
        existingEntry: focusPortfolioEntry,
      }),
    );
    assert.equal(duplicate.publicationState, "rejected");
    assert.equal(duplicate.entryProjection, "retain");
    assert.equal(duplicate.receipt.reasonCode, "duplicate-product");
    prove("portfolio-duplicate-product-rejected");

    const updatePacket = {
      ...structuredClone(packet),
      idempotencyKey: "portfolio-publication:focus-timer:v2",
      packetId: "portfolio-simulation://focus-timer/v2",
      publicationKind: "product-update",
      supersedesPublicationRef: packet.packetId,
    };
    updatePacket.manifest.summary =
      "A validated static timer with start, pause, and reset controls.";
    const updated = projectProductPublication(
      updatePacket,
      projectionContextFixture({
        existingEntry: focusPortfolioEntry,
      }),
    );
    assert.equal(updated.publicationState, "published");
    assert.equal(updated.entryProjection, "update");
    assert.equal(updated.entry?.identity.productId, productManifest.product.id);
    prove("portfolio-existing-product-updated");

    const updateScenarioRoutes = {
      "idempotent-publication-replay": "portfolio-idempotent-replay",
      "product-retirement-update": "portfolio-product-retired",
      "release-update-existing-product": "portfolio-release-updated",
    };
    for (const scenario of publicationUpdateScenarios) {
      const projection = projectProductPublication(
        scenario.publicationPacket,
        scenario.projectionContext,
      );
      assert.equal(
        projection.entryProjection,
        scenario.expected.entryProjection,
      );
      prove(updateScenarioRoutes[scenario.scenarioId]);
    }
  });

  assert.ok(focusPortfolioEntry);
  assert.deepEqual(
    [...provenRouteIds].sort(),
    [...routeIds].sort(),
    "Every route in the foundation catalog must be proven exactly once or more.",
  );
});

async function captureAndTriageProposal(title) {
  const captured = await submitProposalCaptureCommand({
    bodyPreview: `${title} should move through a bounded Console lifecycle.`,
    captureRequestId: `simulation-${slug(title)}`,
    submittedAt: nextTimestamp(),
    title,
  });
  const proposal = captured.record;

  await submitProposalWorkflowIntegrationCommand({
    payload: {
      advisorDraft: "",
      advisorPrompt: "",
      step: "triage",
      summary:
        "The problem, intended outcome, and current source context are clear.",
    },
    proposal,
    proposalId: proposal.id,
    source: proposalSource(proposal),
    submittedAt: nextTimestamp(),
  });

  return proposal;
}

async function applyProposalDisposition(proposal, { outcome, route }) {
  return submitProposalWorkflowIntegrationCommand({
    payload: {
      decision: {
        advisorDraft: "",
        advisorPrompt: "",
        notes:
          outcome === "accepted"
            ? "Accept this proposal for a bounded downstream route."
            : `Record the ${outcome} terminal posture.`,
        outcome,
      },
      route,
      step: "disposition",
    },
    proposal,
    proposalId: proposal.id,
    source: proposalSource(proposal),
    submittedAt: nextTimestamp(),
  });
}

async function routeAcceptedProposal({ proposal, repoMode, routeTarget }) {
  const route = proposalRoute({ proposal, repoMode, routeTarget });
  assert.equal(proposalRouteSelectionComplete(route), true);
  await applyProposalDisposition(proposal, {
    outcome: "accepted",
    route,
  });

  if (repoMode === "new") {
    reconcileRepositoryIngress();
    const repositoryRecord = getProposalRepositoryRequestRecords().find(
      (record) => record.proposalGate?.proposalId === proposal.id,
    );
    assert.ok(repositoryRecord);
    const resolution =
      await recordRepositoryProposalGateResolutionCommand({
        notes:
          "Use the admitted Prototype Studio repository for this simulation.",
        record: repositoryRecord,
        resolvedOwner: "Prototype Studio",
        resolvedRepoRef:
          "git@github.com:mfshaf7/workspace-prototype-studio.git",
        submittedAt: nextTimestamp(),
      });
    recordProposalRepositoryGateResolution(resolution);
  }

  await submitProposalWorkflowIntegrationCommand({
    payload: {
      notes: "The selected route and source custody are ready for handoff.",
      result: "ready",
      step: "handoff",
    },
    proposal,
    proposalId: proposal.id,
    source: proposalSource(proposal),
    submittedAt: nextTimestamp(),
  });

  if (routeTarget === "Prototype") {
    const projection = getPrototypeEntryPacketProjections().find(
      (candidate) =>
        candidate.packet.sourceRecordId === proposal.backendRecordId,
    );
    assert.ok(projection);
    return projection;
  }

  reconcileDeliveryIngress();
  const projection = getProposalDeliveryEntryPacketProjections().find(
    (candidate) =>
      candidate.packet.sourceRecordId === proposal.backendRecordId,
  );
  assert.ok(projection);
  return projection;
}

function proposalRoute({ proposal, repoMode, routeTarget }) {
  return {
    rationale:
      routeTarget === "Prototype"
        ? "Explore and prove the proposal before governed Delivery."
        : "The proposal is ready for governed Delivery design.",
    repoMode,
    repoOwner:
      repoMode === "existing"
        ? "Prototype Studio"
        : repoMode === "new"
          ? "Repository Operation"
          : "",
    repoRef:
      repoMode === "existing"
        ? "git@github.com:mfshaf7/workspace-prototype-studio.git"
        : repoMode === "new"
          ? `repo-request://proposal/${slug(proposal.id)}`
          : "",
    routeTarget,
  };
}

function effectiveProposal(proposal) {
  return projectProposalEffectiveRecord({
    handoffPacketProjections: [
      ...getProposalPrototypeEntryPacketProjections(),
      ...getProposalDeliveryEntryPacketProjections(),
    ],
    proposal,
    repositoryGateResolution:
      getProposalRepositoryGateResolutions()[proposal.id] ?? null,
    workflowReceipts:
      getProposalRuntimeProjectionSnapshot().workflowReceipts[proposal.id] ??
      [],
  });
}

function proposalPacketsFor(proposal) {
  return [
    ...getProposalPrototypeEntryPacketProjections(),
    ...getProposalDeliveryEntryPacketProjections(),
  ].filter(
    (projection) =>
      projection.packet.sourceRecordId === proposal.backendRecordId,
  );
}

function proposalSource(proposal) {
  return {
    backendRecordId: proposal.backendRecordId,
    projectionState: proposal.projectionState,
    recordVersion: proposal.recordVersion,
  };
}

function focusTimerLandingDraft(record) {
  const inputs = {
    dataMode: productManifest.prototype.data_mode,
    mutationBoundary: productManifest.prototype.mutation_boundary,
    previewNeed: productManifest.prototype.preview_need,
    sourceContext: record.summary,
    sourceHome: productManifest.prototype.source_home,
    supportProfile: productManifest.prototype.support_profile,
    visibilityTier: productManifest.prototype.visibility_tier,
  };

  return {
    basePlatform: productManifest.prototype.base_platform,
    dataMode: inputs.dataMode,
    mutationBoundary: inputs.mutationBoundary,
    name: productManifest.product.display_name,
    owner: productManifest.ownership.product_owner_ref,
    previewNeed: inputs.previewNeed,
    sourceHome: inputs.sourceHome,
    summary: productManifest.product.purpose,
    supportProfile: inputs.supportProfile,
    supportRows: prototypeSupportRowsFromInputs(inputs),
    visibilityTier: inputs.visibilityTier,
  };
}

function focusTimerBaselineInput() {
  return {
    baselineStatement:
      "Focus Timer is accepted as a bounded static product baseline.",
    baselineTitle: "Focus Timer baseline",
    decision: "approve-baseline",
    evidenceDisposition:
      "Landing, candidate, source, and current preview evidence are retained.",
    issueDisposition:
      "No blocking Prototype issue remains; production release stays excluded.",
  };
}

function getPrototypeEntryOrMovementProjection(packetId) {
  const snapshot = getDeliveryWorkspaceProjectionSnapshot().ingress;
  const receipt = snapshot.receipts.find(
    (candidate) => candidate.packetId === packetId,
  );
  assert.equal(receipt?.outcome, "admitted");

  return {
    custody: {
      state: receipt.outcome,
    },
  };
}

function currentDeliveryProjection() {
  return projectDeliveryEffectiveReadModel({
    model: deliveryReadModel,
    runtimeProjection: getDeliveryWorkspaceProjectionSnapshot(),
  });
}

function focusTimerWorkTree() {
  return {
    children: [
      {
        children: [
          {
            description:
              "The timer can start, pause, and reset without external state.",
            draftBody:
              "Given the timer is loaded, when the operator uses its controls, then time and status update locally.",
            id: "focus-timer-story-controls",
            kind: "User story",
            remark: "Validated by the synthetic preview fixture.",
            title: "Operate a focus interval",
            tone: "info",
          },
        ],
        description:
          "Provide a bounded timer interface and deterministic local behavior.",
        draftBody:
          "Deliver the static interface, timer behavior, and local proof.",
        id: "focus-timer-feature",
        kind: "Feature",
        remark: "No identity, backend, or production release is in scope.",
        title: "Focus Timer interface",
        tone: "info",
      },
    ],
    description:
      "Carry the approved Focus Timer baseline into a governed delivery shape.",
    draftBody:
      "Design, refine, and validate the product outcome without claiming live backend mutation.",
    id: "focus-timer-epic",
    kind: "Epic",
    remark: "Synthetic end-to-end foundation proof.",
    title: "Focus Timer product",
    tone: "info",
  };
}

function deliveryCloseoutCommand({
  correlationId,
  deliveryPackage,
  impact,
}) {
  if (!deliveryPackage.execution_handoff) {
    throw new Error("System simulation closeout requires an Execution handoff.");
  }

  const resolvedCorrelationId =
    correlationId ??
    `delivery-closeout:${deliveryPackage.delivery_package_id}`;
  const readinessRef =
    `prototype-local://delivery/closeout-readiness/` +
    deliveryPackage.delivery_package_id;

  return {
    actorRef: "operator://system-simulation",
    correlationId: resolvedCorrelationId,
    evidence: {
      changedSurfaces:
        "- `focus-timer-app/`: provides the tested product artifact.",
      completionSummary:
        "Completed the synthetic Delivery initiative and retained its evidence.",
      demoEvidence:
        "The local preview served the Focus Timer and exposed all controls.",
      demoOutcome: "reviewed",
      demoSummary:
        "The bounded product behavior matched the approved prototype proof.",
      inspectActionItems:
        "- Keep live backend wiring outside this pre-baseline proof.",
      inspectSummary:
        "The Delivery result preserves authority and downstream handoff boundaries.",
      testResultEvidence:
        "- PASS: static product runtime and behavior checks completed.",
      validationEvidence:
        "- PASS: Delivery closeout readiness and outcome invariants passed.",
    },
    impact,
    readiness: {
      blockedItemRefs: [],
      deliveryPackageId: deliveryPackage.delivery_package_id,
      evidenceRefs: [
        ...deliveryPackage.execution_handoff.evidence_refs,
        `${readinessRef}/execution-complete`,
      ],
      openDescendantCount: 0,
      readinessRef,
      readyForClosing: true,
      readyForCloseout: true,
      reasons: [],
      sourceVersion: "prototype-local-readiness-v1",
    },
  };
}

function workspaceEntrantCandidateFromOutcome(outcome) {
  if (outcome.impact.kind !== "workspace-entrant") {
    throw new Error(
      "System simulation expected a Workspace entrant Delivery outcome.",
    );
  }

  return outcome.impact.candidate;
}

function refinementValue(field, currentValue) {
  switch (field) {
    case "target_pi":
      return "PI-2026-03";
    case "definition_of_ready":
      return "Static fixture loads, controls are present, and local preview proof is retained.";
    default:
      return currentValue === "Missing" ? "Confirmed" : currentValue;
  }
}

function entrantCandidate(id, entrantKind, intakeMetadata = {}) {
  const common = {
    candidateRef: `simulation://candidates/${entrantKind}/${id}`,
    candidateVersion: "simulation-v1",
    canonicalKey: id,
    correlationRef: `simulation://correlation/${id}`,
    evidenceRefs: [`simulation://evidence/${id}`],
    name: id
      .split("-")
      .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
      .join(" "),
    sourceOwnerRef: "workspace-prototype-studio",
  };

  switch (entrantKind) {
    case "repository":
      return {
        ...common,
        entrantKind,
        intakeMetadata: {
          repoClass: "product-source",
          requiresSecurityBindings: false,
          securityOwner: null,
          validationBehavior: validationBehavior("product-runtime-source"),
          ...intakeMetadata,
        },
      };
    case "product":
      return {
        ...common,
        entrantKind,
        intakeMetadata: {
          ...productEntrantIntakeMetadata(),
          ...intakeMetadata,
        },
      };
    case "component":
      return {
        ...common,
        entrantKind,
        intakeMetadata: {
          componentClass: "product-runtime",
          ownerRepo: "workspace-prototype-studio",
          product: null,
          securityOwner: "security-architecture",
          validationBehavior: validationBehavior("product-runtime-component"),
          ...intakeMetadata,
        },
      };
  }
}

function activeRepositoryRecord(candidate) {
  return {
    id: candidate.canonicalKey,
    kind: "repository",
    value: {
      allowedAuthoritativeRefs: [
        "platform-engineering",
        "security-architecture",
        "workspace-governance",
        "workspace-prototype-studio",
      ],
      lifecycle: "active",
      mustNotOwn: [
        "Workspace governance authority",
        "platform deployment authority",
        "security acceptance",
      ],
      owns: [`${candidate.name} product source`],
      repoClass: "product-source",
      requiresSecurityBindings: false,
      validationBehavior: validationBehavior("product-runtime-source"),
    },
  };
}

function classificationCommand({ candidate, decision, governance, requestId }) {
  return {
    candidate,
    decidedAt: nextTimestamp(),
    decision,
    decisionSource: "operator",
    expectedIntakeRegisterVersion: governance.getIntakeRegisterVersion(),
    idempotencyKey: `workspace-intake:${requestId}`,
    operatorRef: "operator://system-simulation",
    rationale: `Exercise the ${decision} Workspace Intake route.`,
    requestId,
  };
}

function promotionCommand({
  activeRecord,
  classification,
  governance,
  requestId,
}) {
  return {
    activeRecord,
    activeRecordDigest: activeRecordDigest(activeRecord),
    approvalRefs: [`simulation://workspace-governance/approvals/${requestId}`],
    correlationRef: classification.correlationRef,
    decidedAt: nextTimestamp(),
    expectedActiveInventoryVersion: governance.getActiveInventoryVersion(
      activeRecord.kind,
    ),
    expectedIntakeRegisterVersion: governance.getIntakeRegisterVersion(),
    idempotencyKey: `workspace-promotion:${requestId}`,
    intakeEntryRef: classification.canonicalIntakeEntryRef,
    intakeEntryVersion: classification.intakeEntryVersion,
    operatorRef: "operator://system-simulation",
    requestId,
  };
}

function portfolioPacket({
  activeProduct,
  activeProductVersion,
  previewUrl,
}) {
  const packet = productPacketFixture({
    accessClass: productManifest.portfolio.access_class,
    availability: "live",
    displayName: productManifest.product.display_name,
    expiresAt: "2099-01-01T00:00:00.000Z",
    form: productManifest.product.form,
    highestRealEndpoint: "prototype-local-preview",
    href: previewUrl,
    id: productManifest.product.id,
    lifecycle: activeProduct.value.lifecycle,
    listingScope: productManifest.portfolio.listing_scope,
    listingState: productManifest.portfolio.listing_state,
    owners: {
      platformOwnerRef: productManifest.ownership.platform_owner_ref,
      productOwnerRef: productManifest.ownership.product_owner_ref,
      runtimeOwnerRef: productManifest.ownership.runtime_owner_ref,
      securityOwnerRef: productManifest.ownership.security_owner_ref,
      sourceOwnerRefs: [...activeProduct.value.sourceOwners],
    },
    permittedListingScopes: [productManifest.portfolio.listing_scope],
    primaryExperienceKind: "web-application",
    purpose: productManifest.product.purpose,
    segment: productManifest.product.portfolio_segment,
    stageSupported: false,
    summary: productManifest.product.summary,
    tags: productManifest.product.tags,
  });
  packet.product.registryVersion = activeProductVersion;
  packet.sourceVersions = packet.sourceVersions.map((sourceVersion) =>
    sourceVersion.authority === "workspace-governance"
      ? {
          ...sourceVersion,
          version: activeProductVersion,
        }
      : sourceVersion,
  );
  return packet;
}

function productEntrantIntakeMetadata() {
  return {
    intendedEndpoint: "prototype-local-preview",
    platformOwner: "platform-engineering",
    runtimeOwner: "workspace-prototype-studio",
    securityOwner: "security-architecture",
    sourceOwners: ["workspace-prototype-studio"],
    validationBehavior: validationBehavior("product-readiness-aggregate"),
  };
}

function validationBehavior(wgcfGraphRole) {
  return {
    catalogRefs: ["component-contracts", "review-coverage"],
    notes:
      "Synthetic proof remains owner-repo validated and bounded to the Console contract simulation.",
    posture: "covered-by-owner-repo",
    wgcfGraphRole,
  };
}

function publishDraft() {
  return {
    listing: {
      featured: false,
      scope: productManifest.portfolio.listing_scope,
      state: productManifest.portfolio.listing_state,
    },
    outcome: "publish",
  };
}

function prove(routeId) {
  assert.equal(routeIds.has(routeId), true, `Unknown route proof ${routeId}`);
  provenRouteIds.add(routeId);
}

function nextTimestamp() {
  eventSequence += 1;
  return new Date(Date.UTC(2026, 6, 30, 10, 0, eventSequence)).toISOString();
}

function slug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function startFixtureServer(rootDirectory) {
  const server = createServer(async (request, response) => {
    const requestPath = request.url === "/" ? "/index.html" : request.url;
    const safePath = normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = join(rootDirectory, safePath);

    try {
      const content = await readFile(filePath);
      response.writeHead(200, {
        "content-type": contentType(filePath),
      });
      response.end(content);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    port: address.port,
    url: `http://127.0.0.1:${address.port}/`,
  };
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
