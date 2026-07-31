import { createLocalOperationRuntimeAdapter } from "../../../operation-runtime/local-operation-runtime-adapter.ts";
import {
  createLocalOperationProjectionVersion,
  createOperationCommandPreconditions,
  createPrototypeLocalOperationCommand,
  operationRunCanReportSuccess,
} from "../../../operation-runtime/operation-runtime-invariants.ts";
import type {
  OperationReceiptEnvelope,
  OperationRuntimeSource,
} from "../../../operation-runtime/operation-runtime-types.ts";

import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../read-model/index.ts";

import { applyCatalogMutationDraft } from "../../work-model/catalog/catalog-mutation-model.ts";
import type {
  CatalogDraftApplyResult,
  CatalogLocalDraftReceipt,
  CatalogMutationDraft,
  CatalogMutationSubmit,
} from "../../work-model/catalog/catalog-mutation-types.ts";

type CatalogMutationRuntimeCommand = {
  activeCatalog: DeliveryCatalogItem | null;
  catalogValues: DeliveryCatalogValue[];
  draft: CatalogMutationSubmit;
  mutationDraft: CatalogMutationDraft | null;
};

type CatalogMutationRuntimeRun = {
  result: CatalogDraftApplyResult | null;
  summary: string;
};

const deliveryCatalogRuntimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "delivery-catalog",
} satisfies OperationRuntimeSource & { mode: "local" };

const deliveryCatalogCommandRuntime = createLocalOperationRuntimeAdapter<
  DeliveryCatalogValue[],
  CatalogMutationDraft,
  CatalogMutationRuntimeCommand,
  CatalogMutationRuntimeRun,
  CatalogLocalDraftReceipt
>({
  commandRunner(command) {
    const result = applyCatalogMutationDraft({
      activeCatalog: command.command.activeCatalog,
      catalogValues: command.command.catalogValues,
      draft: command.command.draft,
      localIdSeed: command.idempotencyKey,
      mutationDraft: command.command.mutationDraft,
      recordedAt: catalogRecordedAt(command.submittedAt),
    });
    const summary = result
      ? `${result.localDraftReceipt.actionLabel} through prototype-local catalog runtime.`
      : "Catalog mutation was not accepted by the prototype-local runtime.";

    return {
      run: { result, summary },
      state: result ? "completed" : "blocked",
      summary,
      updatedAt: command.submittedAt,
    };
  },
  receiptFactory({ run }) {
    const result = run.run.result;
    if (!result) {
      return null;
    }

    return {
      durability: "prototype-local",
      receipt: result.localDraftReceipt,
      receiptId: `delivery-catalog-receipt-${catalogRuntimeSlug(run.idempotencyKey)}`,
      recordedAt: run.updatedAt,
    };
  },
  runtimeSource: deliveryCatalogRuntimeSource,
});

export async function submitCatalogMutationCommand({
  activeCatalog,
  catalogValues,
  draft,
  mutationDraft,
  submittedAt = new Date().toISOString(),
}: {
  activeCatalog: DeliveryCatalogItem | null;
  catalogValues: DeliveryCatalogValue[];
  draft: CatalogMutationSubmit;
  mutationDraft: CatalogMutationDraft | null;
  submittedAt?: string;
}): Promise<CatalogDraftApplyResult | null> {
  const recordId = activeCatalog?.catalog_item_id ?? "delivery-catalog";
  const run = await deliveryCatalogCommandRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command: {
        activeCatalog,
        catalogValues,
        draft,
        mutationDraft,
      },
      commandName: catalogMutationCommandName(mutationDraft),
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId,
          sourceOwner: deliveryCatalogRuntimeSource.sourceOwner,
          version: createLocalOperationProjectionVersion({
            projection: { activeCatalog, catalogValues },
            sourceOwner: deliveryCatalogRuntimeSource.sourceOwner,
          }),
        },
      }),
      recordId,
      runtimeSource: deliveryCatalogRuntimeSource,
      submittedAt,
    }),
  );
  const receipts = await deliveryCatalogCommandRuntime.listReceipts(recordId);
  const receipt =
    receipts.find((candidate) => candidate.runId === run.runId) ?? null;

  if (run.run.result && !operationRunCanReportSuccess(run, receipt)) {
    throw new Error(
      "Catalog mutation completed without matching prototype-local evidence.",
    );
  }

  return run.run.result;
}

export function listDeliveryCatalogRuntimeReceipts(
  recordId: string,
): Promise<Array<OperationReceiptEnvelope<CatalogLocalDraftReceipt>>> {
  return deliveryCatalogCommandRuntime.listReceipts(recordId);
}

export function getDeliveryCatalogRuntimeCapabilities() {
  return deliveryCatalogCommandRuntime.getCapabilities();
}

function catalogMutationCommandName(
  mutationDraft: CatalogMutationDraft | null,
) {
  return `delivery.catalog.${mutationDraft?.mode ?? "unknown"}`;
}

function catalogRecordedAt(submittedAt: string) {
  return new Date(submittedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function catalogRuntimeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
