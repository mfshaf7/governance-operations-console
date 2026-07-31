import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

function importStatements(source) {
  return [...source.matchAll(/import\s+(type\s+)?[\s\S]*?\s+from\s+["']([^"']+)["'];?/g)].map(
    (match) => ({
      specifier: match[2],
      typeOnly: Boolean(match[1]),
    }),
  );
}

export const guard = {
  id: "delivery/local-runtime",
  run() {
    const failures = [];

    assertRepoIncludes(
      failures,
      "docs/product/domain-contracts/delivery.md",
      [
        "Local Runtime Rule",
        "command receipt factories",
        "local projection stores",
        "localStorage-backed session persistence",
        "local receipts",
        "local transition helpers",
        "Local runtime must not be described as backend truth",
        "boolean or timestamp without its receipt id is not apply evidence",
        "reuses the original",
      ],
    );

    assertAppFile(failures, "src/domain-workspaces/delivery/local-runtime/index.ts");
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/local-runtime/commands/workflow-receipts.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/local-runtime/commands/catalog-mutation-runtime.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/local-runtime/commands/execution-action-runtime.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/local-runtime/projections/workspace-projection.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/local-runtime/projections/delivery-effective-projection.ts",
    );
    assertAppFile(
      failures,
      "src/domain-workspaces/delivery/local-runtime/transitions/transition-record.ts",
    );
    for (const requiredPath of [
      "src/domain-workspaces/delivery/local-runtime/persistence/refinement-session-persistence.ts",
      "src/domain-workspaces/delivery/local-runtime/persistence/work-design-session-persistence.ts",
    ]) {
      assertAppFile(failures, requiredPath);
    }
    assertAppPathAbsent(
      failures,
      "src/domain-workspaces/delivery/local-workflow",
      "Prototype-local Delivery transitions belong under delivery/local-runtime",
    );
    assertIncludes(
      failures,
      "src/domain-workspaces/delivery/local-runtime/commands/catalog-mutation-runtime.ts",
      [
        "const deliveryCatalogCommandRuntime = createLocalOperationRuntimeAdapter",
        "createLocalOperationProjectionVersion",
        "getDeliveryCatalogRuntimeCapabilities",
        "listDeliveryCatalogRuntimeReceipts",
        "operationRunCanReportSuccess",
      ],
    );
    assertOmits(
      failures,
      "src/domain-workspaces/delivery/local-runtime/commands/catalog-mutation-runtime.ts",
      ["const runtime = createLocalOperationRuntimeAdapter"],
    );
    assertIncludes(
      failures,
      "src/domain-workspaces/delivery/local-runtime/commands/workflow-receipts.ts",
      [
        "blockerDispositionReceipts",
        "refinementApplyReceipts",
        "receiptId",
        "existingReceipt",
      ],
    );
    assertIncludes(
      failures,
      "src/domain-workspaces/delivery/local-runtime/projections/delivery-effective-projection.ts",
      [
        "projectDeliveryEffectiveReadModel",
        "applyLocalIntakeConsumes",
        "applyLocalWorkDesignApplies",
        "applyLocalRefinementReceipts",
        "applyLocalExecutionActions",
      ],
    );
    assertIncludes(
      failures,
      "src/domain-workspaces/delivery/local-runtime/projections/workspace-projection.ts",
      [
        "executionActionRecords",
        "refinementApplyReceipts",
        "recordLocalDeliveryExecutionAction",
        "recordLocalDeliveryRefinementApply",
      ],
    );
    assertOmits(
      failures,
      "src/domain-workspaces/delivery/local-runtime/commands/workflow-receipts.ts",
      ['appliedAt = "2026-06-12T10:44:00+08:00"'],
    );
    assertIncludes(
      failures,
      "src/domain-workspaces/delivery/local-runtime/persistence/work-design-session-persistence.ts",
      [
        "applyCandidate.applyReceiptRecorded && Boolean(applyReceiptId)",
        "receiptId: applyReceiptId",
        'typeof candidate.receiptId !== "string"',
      ],
    );
    assertIncludes(
      failures,
      "src/domain-workspaces/delivery/presentation/workflows/work-design/view-model/work-design-history-model.ts",
      [
        "applyReceiptId: string | null",
        "applyReceiptRecorded && applyReceiptId",
        "Receipt ID",
      ],
    );

    for (const file of walkFiles("src/domain-workspaces/delivery/local-runtime", [
      ".ts",
      ".tsx",
    ])) {
      const relativePath = relativeAppPath(file);
      const source = readAppFile(relativePath);

      for (const { specifier, typeOnly } of importStatements(source)) {
        if (specifier.includes("@/teras") || specifier.endsWith(".module.css")) {
          failures.push(
            `${relativePath}: local runtime must not import UI or presentation code through "${specifier}"`,
          );
        }

        const isWorkflowModelTypeImport =
          typeOnly &&
          specifier.includes("/presentation/workflows/") &&
          (specifier.endsWith("/model/work-design-model") ||
            specifier.endsWith("/model/refinement-model"));

        if (specifier.includes("/presentation/") && !isWorkflowModelTypeImport) {
          failures.push(
            `${relativePath}: local runtime may only reference workflow model contracts through type-only imports, not presentation implementation "${specifier}"`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
