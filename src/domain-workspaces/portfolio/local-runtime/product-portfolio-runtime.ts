import { createLocalOperationRuntimeAdapter } from "../../operation-runtime/local-operation-runtime-adapter.ts";
import {
  createOperationCommandPreconditions,
  createPrototypeLocalOperationCommand,
  operationRunCanReportSuccess,
} from "../../operation-runtime/operation-runtime-invariants.ts";
import type {
  OperationCommandRunEnvelope,
  OperationReceiptEnvelope,
} from "../../operation-runtime/operation-runtime-types.ts";

import { productPortfolioReadModel } from "../read-model/product-portfolio-read-model.ts";
import type { ProductPortfolioReadModel } from "../read-model/types/product-portfolio-fixture-types.ts";
import { applyProductPublicationDecision } from "../work-model/publication/product-publication-decision-model.ts";
import type { ProductPublicationDecisionApplyResult } from "../work-model/publication/product-publication-decision-types.ts";
import { applyProductListingCommand } from "../work-model/listing/product-listing-model.ts";
import type {
  ProductListingApplyResult,
  ProductListingCommand,
} from "../work-model/listing/product-listing-types.ts";
import {
  projectProductPortfolioEffectiveProjection,
  projectProductPortfolioEffectiveReadModel,
} from "./product-portfolio-effective-projection.ts";
import {
  productPortfolioPublicationCaptureIdempotencyKey,
  productPortfolioRuntimeSource,
  type ProductPortfolioPublicationCaptureResult,
  type ProductPortfolioPublicationCaptureSubmission,
  type ProductPortfolioPublicationSubmission,
  type ProductPortfolioRuntimeCommand,
  type ProductPortfolioRuntimeReceipt,
  type ProductPortfolioRuntimeRun,
} from "./product-portfolio-runtime-model.ts";
import {
  getProductPortfolioRuntimeProjectionSnapshot,
  recordProductPortfolioPublicationCaptureReceipt,
  recordProductPortfolioPublicationReceipt,
  recordProductPortfolioListingApplication,
  subscribeProductPortfolioRuntimeProjection,
} from "./product-portfolio-runtime-store.ts";

export {
  getProductPortfolioRuntimeProjectionSnapshot,
  subscribeProductPortfolioRuntimeProjection,
};

const productPortfolioCommandRuntime = createLocalOperationRuntimeAdapter<
  ProductPortfolioReadModel,
  never,
  ProductPortfolioRuntimeCommand,
  ProductPortfolioRuntimeRun,
  ProductPortfolioRuntimeReceipt
>({
  commandRunner(command) {
    const effectiveReadModel = getProductPortfolioEffectiveReadModel();

    if (command.command.kind === "capture-publication") {
      const runtimeCommand = command.command;
      const source = productPortfolioReadModel.publicationSources.find(
        (candidate) => candidate.scenarioId === runtimeCommand.sourceId,
      );

      if (!source) {
        throw new Error(
          "The selected product publication source is no longer available.",
        );
      }
      if (
        source.projection.receipt.receiptRef !==
        runtimeCommand.expectedPublicationReceiptRef
      ) {
        throw new Error(
          "The product publication source changed after capture opened.",
        );
      }
      if (runtimeCommand.capturedByRef.trim().length === 0) {
        throw new Error("A capture owner is required.");
      }
      if (
        effectiveReadModel.scenarioProjections.some(
          (candidate) => candidate.scenarioId === source.scenarioId,
        )
      ) {
        throw new Error(
          "The product publication source is already in the Publication register.",
        );
      }

      const summary = `${source.publicationPacket.manifest.displayName} captured for Portfolio publication review.`;
      return {
        run: {
          kind: "capture",
          source,
          summary,
        },
        state: "completed",
        summary,
      };
    }

    if (command.command.kind === "apply-publication") {
      const runtimeCommand = command.command;
      const record = effectiveReadModel.scenarioProjections.find(
        (candidate) => candidate.scenarioId === runtimeCommand.scenarioId,
      );

      if (
        !record ||
        record.publicationPacket.packetId !== runtimeCommand.packetId
      ) {
        throw new Error(
          "The selected product publication is no longer available.",
        );
      }
      if (
        record.projection.receipt.receiptRef !==
        runtimeCommand.expectedPublicationReceiptRef
      ) {
        throw new Error(
          "The product publication changed after this publication draft opened.",
        );
      }
      if (
        record.projection.publicationState === "published" ||
        record.projection.publicationState === "rejected"
      ) {
        throw new Error("The product publication decision is already resolved.");
      }

      const result = applyProductPublicationDecision({
        context: record.projectionContext,
        decidedAt: runtimeCommand.decidedAt,
        decidedByRef: runtimeCommand.decidedByRef,
        draft: runtimeCommand.draft,
        idempotencyKey: runtimeCommand.domainIdempotencyKey,
        packet: record.publicationPacket,
      });

      return {
        run: {
          kind: "publication",
          result,
          summary: result.receipt.summary,
        },
        state: "completed",
        summary: result.receipt.summary,
      };
    }

    const result = applyProductListingCommand(
      effectiveReadModel.entries,
      {
        ...command.command.command,
        submittedAt: command.submittedAt,
      },
    );

    return {
      run: {
        kind: "listing",
        result,
        summary: result.receipt.summary,
      },
      state: "completed",
      summary: result.receipt.summary,
    };
  },
  receiptFactory({ command, run }) {
    if (command.command.kind === "capture-publication") {
      if (run.run.kind !== "capture") {
        throw new Error(
          "Product publication capture completed without a matching source.",
        );
      }

      const source = run.run.source;
      const receiptId = `portfolio-publication-capture-${run.runId}`;
      return {
        durability: "prototype-local",
        receipt: {
          capturedByRef: command.command.capturedByRef,
          commandName: "portfolio.publication.capture",
          idempotencyKey: productPortfolioPublicationCaptureIdempotencyKey(
            source.scenarioId,
            source.projection.receipt.receiptRef,
          ),
          kind: "capture",
          packetId: source.publicationPacket.packetId,
          productId: source.publicationPacket.product.productId,
          publicationReceiptRef: source.projection.receipt.receiptRef,
          receiptId,
          recordedAt: run.updatedAt,
          resultState: "captured",
          schemaVersion: 1,
          sourceId: source.scenarioId,
          sourceVersions: source.publicationPacket.sourceVersions.map(
            (version) => ({ ...version }),
          ),
          summary: run.run.summary,
        },
        receiptId,
        recordedAt: run.updatedAt,
      };
    }

    if (run.run.kind === "capture") {
      throw new Error(
        "Product publication capture receipt did not match its command.",
      );
    }

    const receipt = run.run.result.receipt;

    return {
      durability: "prototype-local",
      receipt,
      receiptId: receipt.receiptId,
      recordedAt: receipt.recordedAt,
    };
  },
  runtimeSource: productPortfolioRuntimeSource,
});

export function getProductPortfolioEffectiveReadModel() {
  return projectProductPortfolioEffectiveReadModel({
    runtimeProjection: getProductPortfolioRuntimeProjectionSnapshot(),
    sourceReadModel: productPortfolioReadModel,
  });
}

export function getProductPortfolioEffectiveProjection() {
  return projectProductPortfolioEffectiveProjection({
    runtimeProjection: getProductPortfolioRuntimeProjectionSnapshot(),
    sourceReadModel: productPortfolioReadModel,
  });
}

export async function submitProductPortfolioPublicationCapture(
  submission: ProductPortfolioPublicationCaptureSubmission,
): Promise<ProductPortfolioPublicationCaptureResult> {
  const source = productPortfolioReadModel.publicationSources.find(
    (candidate) => candidate.scenarioId === submission.sourceId,
  );
  if (!source) {
    throw new Error(
      "The selected product publication source is no longer available.",
    );
  }
  if (
    source.projection.receipt.receiptRef !==
    submission.expectedPublicationReceiptRef
  ) {
    throw new Error(
      "The product publication source changed after capture opened.",
    );
  }

  const effectiveProjection = getProductPortfolioEffectiveProjection();
  const existingReceipt = effectiveProjection.captureReceipts.find(
    (receipt) =>
      receipt.sourceId === source.scenarioId &&
      receipt.publicationReceiptRef ===
        source.projection.receipt.receiptRef,
  );
  if (existingReceipt) {
    return { receipt: existingReceipt, source };
  }
  if (
    effectiveProjection.readModel.scenarioProjections.some(
      (candidate) => candidate.scenarioId === source.scenarioId,
    )
  ) {
    throw new Error(
      "The product publication source is already in the Publication register.",
    );
  }

  const run = await productPortfolioCommandRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command: {
        capturedByRef: submission.capturedByRef,
        expectedPublicationReceiptRef:
          source.projection.receipt.receiptRef,
        kind: "capture-publication",
        sourceId: source.scenarioId,
      },
      commandName: "portfolio.publication.capture",
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId: source.scenarioId,
          sourceOwner: productPortfolioRuntimeSource.sourceOwner,
          version: source.projection.receipt.receiptRef,
        },
      }),
      recordId: source.scenarioId,
      runtimeSource: productPortfolioRuntimeSource,
      submittedAt: submission.capturedAt,
    }),
  );
  const receipt = await productPortfolioReceiptForRun(run);

  if (
    run.run.kind !== "capture" ||
    receipt.receipt.commandName !== "portfolio.publication.capture" ||
    !operationRunCanReportSuccess(run, receipt)
  ) {
    throw new Error(
      "Product publication capture completed without matching prototype-local evidence.",
    );
  }

  recordProductPortfolioPublicationCaptureReceipt(receipt.receipt);
  return {
    receipt: receipt.receipt,
    source: run.run.source,
  };
}

export async function submitProductPortfolioPublicationDecision(
  submission: ProductPortfolioPublicationSubmission,
): Promise<ProductPublicationDecisionApplyResult> {
  const effectiveProjection = getProductPortfolioEffectiveProjection();
  const existingReceipt = effectiveProjection.publicationReceipts.find(
    (receipt) => receipt.idempotencyKey === submission.idempotencyKey,
  );
  const sourceRecord = effectiveProjection.readModel.scenarioProjections.find(
    (candidate) => candidate.scenarioId === submission.record.scenarioId,
  );
  if (!sourceRecord) {
    throw new Error("The selected product publication is no longer available.");
  }
  if (existingReceipt) {
    return {
      projection: sourceRecord.projection,
      receipt: existingReceipt,
    };
  }
  if (
    sourceRecord.projection.publicationState === "published" ||
    sourceRecord.projection.publicationState === "rejected"
  ) {
    throw new Error("The product publication decision is already resolved.");
  }

  const run = await productPortfolioCommandRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command: {
        decidedAt: submission.decidedAt,
        decidedByRef: submission.decidedByRef,
        domainIdempotencyKey: submission.idempotencyKey,
        draft: submission.draft,
        expectedPublicationReceiptRef:
          submission.record.projection.receipt.receiptRef,
        kind: "apply-publication",
        packetId: submission.record.publicationPacket.packetId,
        scenarioId: submission.record.scenarioId,
      },
      commandName: "portfolio.publication.apply",
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId: sourceRecord.scenarioId,
          sourceOwner: productPortfolioRuntimeSource.sourceOwner,
          version: sourceRecord.projection.receipt.receiptRef,
        },
      }),
      recordId: sourceRecord.scenarioId,
      runtimeSource: productPortfolioRuntimeSource,
      submittedAt: submission.decidedAt,
    }),
  );
  const receipt = await productPortfolioReceiptForRun(run);

  if (
    run.run.kind !== "publication" ||
    receipt.receipt.commandName !== "portfolio.publication.apply" ||
    !operationRunCanReportSuccess(run, receipt)
  ) {
    throw new Error(
      "Product publication completed without matching prototype-local evidence.",
    );
  }

  recordProductPortfolioPublicationReceipt(run.run.result.receipt);
  return run.run.result;
}

export async function submitProductPortfolioListingCommand(
  command: ProductListingCommand,
): Promise<ProductListingApplyResult> {
  const runtimeProjection = getProductPortfolioRuntimeProjectionSnapshot();
  const effectiveProjection = getProductPortfolioEffectiveProjection();
  const existingApplication = runtimeProjection.listingApplications.find(
    (application) =>
      application.command.idempotencyKey === command.idempotencyKey,
  );

  if (existingApplication) {
    if (!sameProductListingCommandIntent(existingApplication.command, command)) {
      throw new Error(
        "The listing idempotency key is already bound to a different update.",
      );
    }
    if (
      !effectiveProjection.listingReceipts.some(
        (receipt) =>
          receipt.receiptId === existingApplication.receipt.receiptId,
      )
    ) {
      throw new Error(
        "The prior listing update did not pass receipt reconciliation.",
      );
    }

    return existingApplication.result;
  }

  const sourceEntry = effectiveProjection.readModel.entries.find(
    (entry) => entry.identity.productId === command.productId,
  );
  if (!sourceEntry) {
    throw new Error(
      `Product ${command.productId} is not in Product Portfolio.`,
    );
  }

  const run = await productPortfolioCommandRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command: {
        command: {
          draft: command.draft,
          expectedPublicationReceiptRef:
            command.expectedPublicationReceiptRef,
          idempotencyKey: command.idempotencyKey,
          productId: command.productId,
          submittedByRef: command.submittedByRef,
        },
        kind: "apply-listing",
      },
      commandName: "portfolio.listing.apply",
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId: command.productId,
          sourceOwner: productPortfolioRuntimeSource.sourceOwner,
          version: sourceEntry.provenance.publicationReceiptRef,
        },
      }),
      recordId: command.productId,
      runtimeSource: productPortfolioRuntimeSource,
      submittedAt: command.submittedAt,
    }),
  );
  const receipt = await productPortfolioReceiptForRun(run);

  if (
    run.run.kind !== "listing" ||
    receipt.receipt.commandName !== "portfolio.listing.apply" ||
    !operationRunCanReportSuccess(run, receipt)
  ) {
    throw new Error(
      "Product listing update completed without matching prototype-local evidence.",
    );
  }

  recordProductPortfolioListingApplication({
    command,
    receipt: run.run.result.receipt,
    result: run.run.result,
  });
  return run.run.result;
}

export function getProductPortfolioRuntimeCapabilities() {
  return productPortfolioCommandRuntime.getCapabilities();
}

export function listProductPortfolioRuntimeReceipts(recordId: string) {
  return productPortfolioCommandRuntime.listReceipts(recordId);
}

async function productPortfolioReceiptForRun(
  run: OperationCommandRunEnvelope<ProductPortfolioRuntimeRun>,
): Promise<OperationReceiptEnvelope<ProductPortfolioRuntimeReceipt>> {
  const receipts = await productPortfolioCommandRuntime.listReceipts(
    run.recordId,
  );
  const receipt = receipts.find((candidate) => candidate.runId === run.runId);

  if (!receipt) {
    throw new Error(
      "Product Portfolio command completed without a prototype-local receipt.",
    );
  }

  return receipt;
}

function sameProductListingCommandIntent(
  left: ProductListingCommand,
  right: ProductListingCommand,
) {
  return (
    left.expectedPublicationReceiptRef ===
      right.expectedPublicationReceiptRef &&
    left.idempotencyKey === right.idempotencyKey &&
    left.productId === right.productId &&
    left.submittedByRef === right.submittedByRef &&
    sameProductListingDraft(left.draft, right.draft)
  );
}

function sameProductListingDraft(
  left: ProductListingCommand["draft"],
  right: ProductListingCommand["draft"],
) {
  if (
    left.featured !== right.featured ||
    left.scope !== right.scope ||
    left.state !== right.state
  ) {
    return false;
  }
  if (left.state === "unlisted" || right.state === "unlisted") {
    return left.state === right.state;
  }
  if (left.position.kind !== right.position.kind) {
    return false;
  }

  return (
    left.position.kind !== "after" ||
    (right.position.kind === "after" &&
      left.position.productId === right.position.productId)
  );
}
