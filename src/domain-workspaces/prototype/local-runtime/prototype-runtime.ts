import { createLocalOperationRuntimeAdapter } from "../../operation-runtime/local-operation-runtime-adapter.ts";
import {
  createLocalOperationProjectionVersion,
  createOperationCommandPreconditions,
  createPrototypeLocalOperationCommand,
  operationRunCanReportSuccess,
} from "../../operation-runtime/operation-runtime-invariants.ts";
import type {
  OperationCommandRunEnvelope,
  OperationReceiptEnvelope,
} from "../../operation-runtime/operation-runtime-types.ts";

import type { PrototypeCommandId } from "../work-model/commands/prototype-command-model.ts";
import { prototypeRecordFromRequestDraft } from "../work-model/entry/prototype-request-record.ts";
import { prototypeRequestDraftComplete } from "../work-model/entry/prototype-request-readiness.ts";
import type { PrototypeRequestDraft } from "../work-model/entry/prototype-request-types.ts";
import { prototypeLandingDraftKey } from "../work-model/workflows/landing/prototype-landing-model.ts";
import { findPrototypeLandingSimulationReceipt } from "./prototype-landing-runtime.ts";
import {
  prototypeRecordFromRuntimeRun,
  prototypeRuntimeReceiptFromRun,
  prototypeRuntimeRunFromCommand,
} from "./prototype-runtime-command-handler.ts";
import {
  prototypeRecordSourceVersion,
  prototypeRuntimeSource,
  type PrototypeCommandInputById,
  type PrototypeLocalReceipt,
  type PrototypeRuntimeCommand,
  type PrototypeRuntimeRun,
} from "./prototype-runtime-model.ts";
import type { PrototypeLandingCommandInput } from "../work-model/workflows/landing/prototype-landing-model.ts";
import {
  getPrototypeLocalRequestRecordCount,
  getPrototypeRuntimeProjectionSnapshot,
  recordPrototypeLocalReceipt,
  recordPrototypeLocalRequestRecord,
  subscribePrototypeRuntimeProjection,
} from "./prototype-runtime-store.ts";

export type {
  PrototypeCommandInputById,
  PrototypeLocalReceipt,
  PrototypeRuntimeProjectionSnapshot,
} from "./prototype-runtime-model.ts";
export type { PrototypeLandingCommandInput } from "../work-model/workflows/landing/prototype-landing-model.ts";
export {
  getPrototypeRuntimeProjectionSnapshot,
  subscribePrototypeRuntimeProjection,
};

export type PrototypeRuntimeProjectionResult = {
  nextRecord: ReturnType<typeof prototypeRecordFromRuntimeRun>;
  projected: boolean;
  receipt: PrototypeLocalReceipt;
};

export type PrototypeRequestLocalRecordResult = {
  receipt: PrototypeLocalReceipt;
  record: ReturnType<typeof prototypeRecordFromRuntimeRun>;
  recordedAt: string;
};

type MutablePrototypeCommandId = Exclude<
  PrototypeCommandId,
  "capture-prototype-request"
>;

const prototypeCommandRuntime = createLocalOperationRuntimeAdapter<
  ReturnType<typeof prototypeRecordFromRuntimeRun>,
  never,
  PrototypeRuntimeCommand,
  PrototypeRuntimeRun,
  PrototypeLocalReceipt
>({
  commandRunner: prototypeRuntimeRunFromCommand,
  receiptFactory({ command, run }) {
    const receipt = prototypeRuntimeReceiptFromRun({ command, run });

    return {
      durability: "prototype-local",
      receipt,
      receiptId: receipt.receiptId,
      recordedAt: run.updatedAt,
    };
  },
  runtimeSource: prototypeRuntimeSource,
});

const prototypeRequestIdentityByRequestId = new Map<
  string,
  { recordId: string; recordIndex: number; sourceVersion: string }
>();
let prototypeRequestSequence = 0;

export function createPrototypeRequestId() {
  prototypeRequestSequence += 1;
  return `prototype-request-${prototypeRequestSequence}`;
}

export async function submitPrototypeRequestCommand(
  draft: PrototypeRequestDraft,
  options: { requestId?: string; submittedAt?: string } = {},
): Promise<PrototypeRequestLocalRecordResult> {
  if (!prototypeRequestDraftComplete(draft)) {
    throw new Error(
      "Prototype request input is incomplete or outside the local boundary.",
    );
  }

  const requestId = options.requestId ?? createPrototypeRequestId();
  const submittedAt = options.submittedAt ?? new Date().toISOString();
  const existingIdentity = prototypeRequestIdentityByRequestId.get(requestId);
  const recordIndex =
    existingIdentity?.recordIndex ?? getPrototypeLocalRequestRecordCount();
  const record = prototypeRecordFromRequestDraft(
    draft,
    recordIndex,
    existingIdentity?.recordId,
  );
  const sourceVersion = createLocalOperationProjectionVersion({
    projection: { draft, recordId: record.id, requestId },
    sourceOwner: prototypeRuntimeSource.sourceOwner,
  });

  if (existingIdentity && existingIdentity.sourceVersion !== sourceVersion) {
    throw new Error(
      "Prototype request id cannot be reused with different input.",
    );
  }

  prototypeRequestIdentityByRequestId.set(requestId, {
    recordId: record.id,
    recordIndex,
    sourceVersion,
  });
  const { receipt, run } = await submitPrototypeRuntimeCommand({
    command: {
      commandId: "capture-prototype-request",
      input: { draft, requestId },
      record,
    },
    sourceVersion,
    submittedAt,
  });
  const finalRecord = prototypeRecordFromRuntimeRun(run);

  recordPrototypeLocalRequestRecord(finalRecord, receipt.receipt);

  return {
    receipt: receipt.receipt,
    record: finalRecord,
    recordedAt: receipt.recordedAt,
  };
}

export async function submitPrototypeProjectionCommand<
  CommandId extends MutablePrototypeCommandId,
>({
  commandId,
  input,
  record,
  submittedAt = new Date().toISOString(),
}: {
  commandId: CommandId;
  input: PrototypeCommandInputById[CommandId];
  record: ReturnType<typeof prototypeRecordFromRuntimeRun>;
  submittedAt?: string;
}): Promise<PrototypeRuntimeProjectionResult> {
  if (commandId === "land-prototype-request") {
    await assertPrototypeLandingSimulation(
      record,
      input as PrototypeLandingCommandInput,
    );
  }

  const { receipt, run } = await submitPrototypeRuntimeCommand({
    command: {
      commandId,
      input,
      record,
    } as PrototypeRuntimeCommand,
    sourceVersion: prototypeRecordSourceVersion(record),
    submittedAt,
  });
  const nextRecord = prototypeRecordFromRuntimeRun(run);

  recordPrototypeLocalReceipt(receipt.receipt);

  return {
    nextRecord,
    projected: nextRecord !== record,
    receipt: receipt.receipt,
  };
}

export function getPrototypeRuntimeCapabilities() {
  return prototypeCommandRuntime.getCapabilities();
}

export function listPrototypeRuntimeReceipts(recordId: string) {
  return prototypeCommandRuntime.listReceipts(recordId);
}

async function submitPrototypeRuntimeCommand({
  command,
  sourceVersion,
  submittedAt,
}: {
  command: PrototypeRuntimeCommand;
  sourceVersion: string;
  submittedAt: string;
}): Promise<{
  receipt: OperationReceiptEnvelope<PrototypeLocalReceipt>;
  run: OperationCommandRunEnvelope<PrototypeRuntimeRun>;
}> {
  const run = await prototypeCommandRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command,
      commandName: `prototype.${command.commandId}`,
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId: command.record.id,
          sourceOwner: prototypeRuntimeSource.sourceOwner,
          version: sourceVersion,
        },
      }),
      recordId: command.record.id,
      runtimeSource: prototypeRuntimeSource,
      submittedAt,
    }),
  );
  const receipts = await prototypeCommandRuntime.listReceipts(
    command.record.id,
  );
  const receipt = receipts.find((candidate) => candidate.runId === run.runId);

  if (
    !receipt ||
    (run.state === "completed" && !operationRunCanReportSuccess(run, receipt))
  ) {
    throw new Error(
      "Prototype command finished without matching prototype-local evidence.",
    );
  }

  return { receipt, run };
}

async function assertPrototypeLandingSimulation(
  record: ReturnType<typeof prototypeRecordFromRuntimeRun>,
  input: PrototypeLandingCommandInput,
) {
  const receipt = await findPrototypeLandingSimulationReceipt({
    draftKey: input.simulationDraftKey,
    receiptId: input.simulationReceiptId,
    recordId: record.id,
  });

  if (
    input.simulationDraftKey !== prototypeLandingDraftKey(input.draft) ||
    !receipt ||
    receipt.receipt.sourceVersion !== prototypeRecordSourceVersion(record)
  ) {
    throw new Error(
      "Prototype landing must reference the current Landing Run receipt.",
    );
  }
}
