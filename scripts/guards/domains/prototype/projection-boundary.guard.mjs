import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
} from "../../guard-lib.mjs";

const prototypeRoot = "src/domain-workspaces/prototype";
const receiptProjection =
  `${prototypeRoot}/local-runtime/prototype-receipt-projection.ts`;
const effectiveProjection =
  `${prototypeRoot}/local-runtime/prototype-effective-projection.ts`;
const runtimeModel =
  `${prototypeRoot}/local-runtime/prototype-runtime-model.ts`;
const runtimeStore =
  `${prototypeRoot}/local-runtime/prototype-runtime-store.ts`;
const movementRequestProjection =
  "src/domain-workspaces/operation-integrations/prototype-movement-request-projection.ts";
const liveContract =
  `${prototypeRoot}/live-runtime/prototype-delivery-live-contract.ts`;
const liveProjection =
  `${prototypeRoot}/live-runtime/prototype-delivery-live-projection.ts`;
const liveRuntime =
  `${prototypeRoot}/live-runtime/use-prototype-delivery-live-runtime.ts`;
const serverRoutes =
  `${prototypeRoot}/server/prototype-delivery-api-routes.ts`;
const oosClient =
  `${prototypeRoot}/server/prototype-delivery-oos-client.ts`;

export const guard = {
  id: "prototype/projection-boundary",
  run() {
    const failures = [];

    assertRepoIncludes(
      failures,
      "docs/product/domain-contracts/prototype.md",
      [
        "one normalized",
        "receipt projection",
        "it appears once",
        "preferred copy",
        "must not append the same receipt id twice",
      ],
    );

    for (const requiredPath of [
      receiptProjection,
      effectiveProjection,
      `${prototypeRoot}/local-runtime/prototype-runtime.ts`,
      `${prototypeRoot}/local-runtime/prototype-runtime-command-handler.ts`,
      runtimeModel,
      runtimeStore,
      movementRequestProjection,
      liveContract,
      liveProjection,
      liveRuntime,
      serverRoutes,
      oosClient,
      `${prototypeRoot}/presentation/dialogs/history/prototype-history-view-model.ts`,
      `${prototypeRoot}/presentation/dashboards/prototype-dashboard/prototype-dashboard-view-model.ts`,
      `${prototypeRoot}/presentation/dashboards/prototype-dashboard/prototype-dashboard-status-area-dialog.tsx`,
    ]) {
      assertAppFile(failures, requiredPath);
    }

    assertIncludes(failures, receiptProjection, [
      "prototypeProjectedReceipts",
      "new Map<string, PrototypeProjectedReceipt>()",
      "projectedReceipts.set(receipt.id",
      "projectedReceipts.set(receipt.receiptId",
      'sourceLabel: "prototype-local"',
      'sourceLabel: "source record"',
    ]);
    assertIncludes(failures, effectiveProjection, [
      "projectPrototypeEffectiveReadModel",
      "projectPrototypeEffectiveRecord",
      "prototypeProjectedReceipts",
      "runtimeProjection.localRequestRecords",
      "receiptsByRecord: Object.fromEntries",
      "receipt.sourceVersion !==",
      "prototypeRecordSourceVersion(projectedRecord)",
      "receipt.appliedRecord.id !== projectedRecord.id",
      "left.recordedAt.localeCompare(right.recordedAt)",
      "left.receiptId.localeCompare(right.receiptId)",
      "uniquePrototypeRecords",
      "projectPrototypeDeliveryApplication",
      "deliveryApplicationsByPrototypeId",
    ]);
    assertOmits(failures, effectiveProjection, [
      "runtimeProjection.localRecords",
      "runtimeProjection.localReceipts",
    ]);
    assertIncludes(
      failures,
      `${prototypeRoot}/presentation/surface/use-prototype-control-controller.ts`,
      [
        "projectPrototypeEffectiveReadModel",
        "effectiveProjection.readModel",
        "effectiveProjection.receiptsByRecord",
      ],
    );
    assertOmits(
      failures,
      `${prototypeRoot}/presentation/surface/use-prototype-control-controller.ts`,
      ["prototypeRecordAfter", "projectRecord"],
    );
    assertIncludes(
      failures,
      `${prototypeRoot}/presentation/surface/use-prototype-control-controller.ts`,
      ["recordPrototypeMovementRequestPacket(result.receipt)"],
    );
    assertIncludes(
      failures,
      `${prototypeRoot}/presentation/surface/use-prototype-control-controller.ts`,
      [
        "usePrototypeDeliveryLiveRuntime",
        "sourceReadModel.deliveryPacketsByPrototypeId",
        'sourcePacket?.authority === "workspace-prototype-studio"',
        "await deliveryRuntime.apply",
      ],
    );
    assertOmits(
      failures,
      `${prototypeRoot}/presentation/surface/use-prototype-control-controller.ts`,
      ["recordPrototypeMovementRequestPacket({"],
    );
    assertIncludes(failures, movementRequestProjection, [
      'receipt.commandId === "prepare-movement-request"',
      'receipt.resultState === "recorded"',
      "receipt.recordId === receipt.appliedRecord.id",
      "const movementRequest = receipt.appliedRecord.movementRequest",
      'movementRequest.state === "request-recorded"',
      "movementRequest.requestReason === receipt.appliedInput.requestReason",
      "movementRequest.targetLane === receipt.appliedInput.targetLane",
      "movementRequest.targetOwner === receipt.appliedInput.targetOwner",
      "const draft = receipt.appliedInput",
      "const record = receipt.appliedRecord",
    ]);
    assertIncludes(
      failures,
      `${prototypeRoot}/presentation/workflows/landing/prototype-landing-modal.tsx`,
      ["prototypeLandingPlanFromDraft"],
    );
    assertOmits(
      failures,
      `${prototypeRoot}/presentation/workflows/landing/prototype-landing-modal.tsx`,
      ["prototypeRecordAfterLanding", "nextRecord"],
    );
    assertIncludes(
      failures,
      `${prototypeRoot}/local-runtime/prototype-landing-runtime.ts`,
      ["prototypeLandingPlanFromDraft(record, draft)"],
    );
    assertOmits(
      failures,
      `${prototypeRoot}/local-runtime/prototype-landing-runtime.ts`,
      ["nextRecord: PrototypeRecord", "landingBlocked: boolean"],
    );
    assertIncludes(
      failures,
      `${prototypeRoot}/local-runtime/prototype-runtime-command-handler.ts`,
      [
        "prototypeRecordAfterLanding",
        "prototypeRecordAfterCandidatePromotion",
        "prototypeRecordAfterBaselinePromotion",
        "prototypeRecordAfterMovementRequest",
        "prototypeRecordAfterCloseoutRetirement",
        "prototypeRecordAfterPreviewProfileCommand",
        "prototypeRecordAfterPreviewRuntimeCommand",
        "prototypeRecordAfterPreviewCheckCommand",
      ],
    );
    assertIncludes(
      failures,
      runtimeStore,
      [
        "currentReceipt.receiptId === receipt.receiptId",
        "[...currentReceipts, receipt]",
      ],
    );
    assertIncludes(failures, runtimeModel, [
      "PrototypeCommandInputById",
      "appliedInput",
      "appliedRecord",
      "prototypeRecordSourceVersion",
      'authority: "prototype-local"',
      "schemaVersion: 1",
    ]);
    assertOmits(
      failures,
      `${prototypeRoot}/local-runtime/prototype-runtime.ts`,
      ["projectRecord", "localRecords", "upsertPrototypeLocalRecordProjection"],
    );

    assertIncludes(failures, liveContract, [
      "assertPrototypeDeliveryPacket",
      "assertPrototypeDeliveryApplicationResult",
      "assertPrototypeDeliveryResultMatchesPacket",
      "sameCustody",
    ]);
    assertIncludes(failures, liveProjection, [
      "assertPrototypeDeliveryResultMatchesPacket",
      'lifecycle: "graduated"',
      'authority: "source-projected"',
      "result.receipt.receipt_ref",
      "result.target.record_ref",
    ]);
    assertIncludes(failures, liveRuntime, [
      'fetch("/api/prototypes/delivery-applications"',
      "assertPrototypeDeliveryResultMatchesPacket",
      "projectionsByPrototypeId",
    ]);
    assertOmits(failures, liveRuntime, [
      "fixtures/",
      "OOS_CALLER_SECRET",
      "openproject",
    ]);
    assertIncludes(failures, serverRoutes, [
      "applyPrototypeDeliveryApplication",
      "readPrototypeDeliveryApplication",
      'mode: "live"',
      'status: "offline"',
    ]);
    assertIncludes(failures, oosClient, [
      '"/v1/delivery-ingress/prototype/applications"',
      '"x-oos-caller-id"',
      '"x-oos-caller-secret"',
      'cache: "no-store"',
      "AbortSignal.timeout",
      "config.callerId",
    ]);
    assertOmits(failures, oosClient, [
      "NEXT_PUBLIC_",
      "openproject",
    ]);

    assertIncludes(
      failures,
      `${prototypeRoot}/presentation/dialogs/history/prototype-history-view-model.ts`,
      [
        "prototypeReceiptsOldestFirst",
        "return prototypeReceiptsOldestFirst(receipts).map(",
        "prototypeHistoryReceiptTimelineRow",
      ],
    );
    assertOmits(
      failures,
      `${prototypeRoot}/presentation/dialogs/history/prototype-history-view-model.ts`,
      ["terminal record", 'label: "Entry"', "prototypeHistoryTakeReceipt"],
    );

    for (const consumer of [
      `${prototypeRoot}/presentation/dialogs/history/prototype-history-view-model.ts`,
      `${prototypeRoot}/presentation/dashboards/prototype-dashboard/prototype-dashboard-view-model.ts`,
      `${prototypeRoot}/presentation/dashboards/prototype-dashboard/prototype-dashboard-status-area-dialog.tsx`,
    ]) {
      assertIncludes(failures, consumer, ["PrototypeProjectedReceipt"]);
      assertOmits(failures, consumer, [
        "PrototypeLocalReceipt",
        "prototypeProjectedReceipts",
        "...localReceipts, ...record.receipts",
      ]);
    }

    return failures;
  },
};

export default guard;
