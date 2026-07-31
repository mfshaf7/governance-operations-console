import { createLocalOperationRuntimeAdapter } from "../../operation-runtime/local-operation-runtime-adapter.ts";
import {
  createOperationCommandPreconditions,
  createPrototypeLocalOperationCommand,
} from "../../operation-runtime/operation-runtime-invariants.ts";
import type {
  OperationCommandRunEnvelope,
  OperationReceiptEnvelope,
  OperationRuntimeSource,
} from "../../operation-runtime/operation-runtime-types.ts";

import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import {
  type PrototypeLandingDraft,
  prototypeLandingPlanFromDraft,
} from "../work-model/workflows/landing/prototype-landing-model.ts";
import {
  evaluatePrototypeLandingSimulation,
  type PrototypeLandingSimulationPlan,
} from "../work-model/workflows/landing/prototype-landing-simulation-model.ts";
import {
  prototypeRecordSourceVersion,
  prototypeRuntimeSource,
} from "./prototype-runtime-model.ts";

export type PrototypeLandingSimulationInput = {
  draft: PrototypeLandingDraft;
  draftKey: string;
  record: PrototypeRecord;
};

type PrototypeLandingRuntimeCommand = PrototypeLandingSimulationPlan;

type PrototypeLandingRuntimeRun = {
  blockers: string[];
  draftKey: string;
  summary: string;
};

export type PrototypeLandingSimulationReceipt = {
  appliedPlan: PrototypeLandingSimulationPlan;
  authority: "prototype-local";
  blockerCount: number;
  commandName: "prototype.landing.run";
  draftKey: string;
  outcome: "blocked" | "ready";
  receiptId: string;
  recordedAt: string;
  recordId: string;
  routeOwner: "prototype-landing";
  schemaVersion: 1;
  sourceVersion: string;
  summary: string;
};

export type PrototypeLandingSimulationResult = {
  draftKey: string;
  receipt: OperationReceiptEnvelope<PrototypeLandingSimulationReceipt>;
  run: OperationCommandRunEnvelope<PrototypeLandingRuntimeRun>;
};

const prototypeLandingRuntimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "prototype-landing",
} satisfies OperationRuntimeSource & { mode: "local" };

const prototypeLandingRuntime = createLocalOperationRuntimeAdapter<
  never,
  never,
  PrototypeLandingRuntimeCommand,
  PrototypeLandingRuntimeRun,
  PrototypeLandingSimulationReceipt
>({
  commandRunner(command) {
    const outcome = evaluatePrototypeLandingSimulation(command.command);

    return {
      progress: outcome.progress,
      run: {
        blockers: outcome.blockers,
        draftKey: command.command.draftKey,
        summary: outcome.summary,
      },
      state: outcome.state,
      summary: outcome.summary,
    };
  },
  receiptFactory({ command, run }) {
    const receiptId = `prototype-landing-${run.runId}`;
    const receipt: PrototypeLandingSimulationReceipt = {
      appliedPlan: command.command,
      authority: "prototype-local",
      blockerCount: run.run.blockers.length,
      commandName: "prototype.landing.run",
      draftKey: run.run.draftKey,
      outcome: run.state === "completed" ? "ready" : "blocked",
      receiptId,
      recordedAt: run.updatedAt,
      recordId: command.recordId,
      routeOwner: "prototype-landing",
      schemaVersion: 1,
      sourceVersion: command.preconditions.primary.version,
      summary: run.run.summary,
    };

    return {
      durability: "prototype-local",
      receipt,
      receiptId,
      recordedAt: run.updatedAt,
    };
  },
  runtimeSource: prototypeLandingRuntimeSource,
});

export async function runPrototypeLandingSimulation({
  draft,
  draftKey,
  record,
}: PrototypeLandingSimulationInput): Promise<PrototypeLandingSimulationResult> {
  const submittedAt = new Date().toISOString();
  const landingPlan = prototypeLandingPlanFromDraft(record, draft);
  const command = createPrototypeLocalOperationCommand({
    command: {
      basePlatform: draft.basePlatform,
      blockedItems: landingPlan.requiredFieldBlockers,
      draftKey,
      evidenceCount: landingPlan.requiredEvidence.length,
      launchAdapter: landingPlan.previewLaunchAdapter,
      setupItems: landingPlan.setupItems,
      sourceRef: record.sourceRef,
      supportRows: draft.supportRows.map(({ id, label, state }) => ({
        id,
        label,
        state,
      })),
      validationCheckCount: landingPlan.validationPlan.length,
    },
    commandName: "prototype.landing.run",
    preconditions: createOperationCommandPreconditions({
      primary: {
        recordId: record.id,
        sourceOwner: prototypeRuntimeSource.sourceOwner,
        version: prototypeRecordSourceVersion(record),
      },
    }),
    recordId: record.id,
    runtimeSource: prototypeLandingRuntimeSource,
    submittedAt,
  });
  const run = await prototypeLandingRuntime.submitCommand(command);
  const receipt = (await prototypeLandingRuntime.listReceipts(record.id)).find(
    (candidate) => candidate.runId === run.runId,
  );

  if (!receipt) {
    throw new Error(
      "Landing simulation finished without prototype-local evidence.",
    );
  }

  return { draftKey, receipt, run };
}

export function getPrototypeLandingRuntimeCapabilities() {
  return prototypeLandingRuntime.getCapabilities();
}

export async function findPrototypeLandingSimulationReceipt({
  draftKey,
  receiptId,
  recordId,
}: {
  draftKey: string;
  receiptId: string;
  recordId: string;
}) {
  const receipts = await prototypeLandingRuntime.listReceipts(recordId);

  return (
    receipts.find(
      (receipt) =>
        receipt.receipt.receiptId === receiptId &&
        receipt.receipt.draftKey === draftKey,
    ) ?? null
  );
}
