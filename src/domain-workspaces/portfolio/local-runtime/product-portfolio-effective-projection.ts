import type { ProductPortfolioEntry } from "../domain/product-portfolio-entry-types.ts";
import type { ProductSourceVersion } from "../domain/product-portfolio-vocabulary.ts";
import type {
  ProductPortfolioReadModel,
  ProductPortfolioScenarioProjection,
} from "../read-model/types/product-portfolio-fixture-types.ts";
import { productPortfolioReadModelFromProjections } from "../read-model/selectors/product-portfolio-selectors.ts";
import { projectProductPublication } from "../work-model/publication/product-publication-projection.ts";
import type { ProductPublicationDecisionReceipt } from "../work-model/publication/product-publication-decision-types.ts";
import {
  productCommandsForEntry,
  productRequiredActionForEntry,
  withForbiddenProductCommands,
} from "../work-model/publication/product-portfolio-command-policy.ts";
import { applyProductListingCommand } from "../work-model/listing/product-listing-model.ts";
import type {
  ProductListingApplyResult,
  ProductListingReceipt,
} from "../work-model/listing/product-listing-types.ts";
import {
  productPortfolioPublicationCaptureIdempotencyKey,
  type ProductPublicationCaptureLocalReceipt,
} from "./product-portfolio-runtime-model.ts";
import { productPortfolioRuntimeHistoryEvents } from "./product-portfolio-history-projection.ts";
import type { ProductPortfolioRuntimeProjectionSnapshot } from "./product-portfolio-runtime-store.ts";

export type ProductPortfolioEffectiveProjection = Readonly<{
  publicationReceipts: ProductPublicationDecisionReceipt[];
  captureReceipts: ProductPublicationCaptureLocalReceipt[];
  listingReceipts: ProductListingReceipt[];
  readModel: ProductPortfolioReadModel;
  reconciliationIssues: ProductPortfolioReconciliationIssue[];
}>;

export type ProductPortfolioReconciliationIssue = Readonly<{
  issueId: string;
  kind:
    | "publication-receipt-rejected"
    | "capture-receipt-rejected"
    | "listing-receipt-rejected";
  occurredAt: string;
  receiptRef: string;
  subjectRef: string;
  summary: string;
}>;

type ProductPortfolioEffectiveProjectionInput = {
  runtimeProjection: ProductPortfolioRuntimeProjectionSnapshot;
  sourceReadModel: ProductPortfolioReadModel;
};

export function projectProductPortfolioEffectiveProjection({
  runtimeProjection,
  sourceReadModel,
}: ProductPortfolioEffectiveProjectionInput): ProductPortfolioEffectiveProjection {
  const captureProjection = projectProductPortfolioPublicationCaptures({
    receipts: runtimeProjection.captureReceipts,
    sourceReadModel,
  });
  const publicationReceiptsByPacket = productPublicationReceiptsByPacket(
    runtimeProjection.publicationReceipts,
  );
  const appliedPublicationReceipts: ProductPublicationDecisionReceipt[] = [];
  const publicationIssues: ProductPortfolioReconciliationIssue[] = [];
  const sourceScenarios = [
    ...sourceReadModel.scenarioProjections,
    ...captureProjection.scenarios,
  ];
  const sourcePacketIds = new Set(
    sourceScenarios.map((scenario) => scenario.publicationPacket.packetId),
  );
  const scenarioProjections = sourceScenarios.map((scenario) => {
    const projection = projectProductPortfolioPublicationReceipts({
      receipts:
        publicationReceiptsByPacket.get(scenario.publicationPacket.packetId) ??
        [],
      scenario,
    });

    if (projection.receipt) {
      appliedPublicationReceipts.push(projection.receipt);
    }
    publicationIssues.push(...projection.issues);

    return projection.scenario;
  });
  const unmatchedPublicationIssues = unmatchedProductPublicationReceiptIssues(
    runtimeProjection.publicationReceipts,
    sourcePacketIds,
  );
  const projectedReadModel = productPortfolioReadModelFromProjections(
    scenarioProjections,
    sourceReadModel.publicationSources,
  );
  const listingProjection = projectProductPortfolioListings(
    projectedReadModel.entries,
    runtimeProjection.listingApplications,
  );
  const readModel = productPortfolioReadModelFromProjections(
    projectProductPortfolioListingScenarios(
      scenarioProjections,
      listingProjection.entries,
    ),
    sourceReadModel.publicationSources,
    productPortfolioRuntimeHistoryEvents({
      publicationReceipts: appliedPublicationReceipts,
      captureReceipts: captureProjection.receipts,
      listingReceipts: listingProjection.receipts,
    }),
  );

  return {
    publicationReceipts: appliedPublicationReceipts.sort(comparePortfolioReceipts),
    captureReceipts: captureProjection.receipts,
    listingReceipts: listingProjection.receipts,
    readModel,
    reconciliationIssues: [
      ...captureProjection.issues,
      ...publicationIssues,
      ...unmatchedPublicationIssues,
      ...listingProjection.issues,
    ].sort(comparePortfolioReconciliationIssues),
  };
}

export function projectProductPortfolioEffectiveReadModel(
  input: ProductPortfolioEffectiveProjectionInput,
): ProductPortfolioReadModel {
  return projectProductPortfolioEffectiveProjection(input).readModel;
}

function projectProductPortfolioPublicationCaptures({
  receipts,
  sourceReadModel,
}: {
  receipts: ProductPublicationCaptureLocalReceipt[];
  sourceReadModel: ProductPortfolioReadModel;
}) {
  const sourcesById = new Map(
    sourceReadModel.publicationSources.map((source) => [
      source.scenarioId,
      source,
    ]),
  );
  const projectedScenarioIds = new Set(
    sourceReadModel.scenarioProjections.map((scenario) => scenario.scenarioId),
  );
  const seenReceiptIds = new Set<string>();
  const issues: ProductPortfolioReconciliationIssue[] = [];
  const projectedReceipts: ProductPublicationCaptureLocalReceipt[] = [];
  const scenarios: ProductPortfolioScenarioProjection[] = [];

  for (const receipt of [...receipts].sort(comparePortfolioReceipts)) {
    if (seenReceiptIds.has(receipt.receiptId)) {
      continue;
    }
    seenReceiptIds.add(receipt.receiptId);

    const source = sourcesById.get(receipt.sourceId);
    if (!source) {
      issues.push(
        productPortfolioReconciliationIssue({
          kind: "capture-receipt-rejected",
          receipt,
          subjectRef: receipt.sourceId,
          summary:
            "Capture receipt references a publication source that is not available.",
        }),
      );
      continue;
    }
    if (projectedScenarioIds.has(receipt.sourceId)) {
      issues.push(
        productPortfolioReconciliationIssue({
          kind: "capture-receipt-rejected",
          receipt,
          subjectRef: receipt.sourceId,
          summary:
            "Capture receipt cannot add a publication source that is already in Publication.",
        }),
      );
      continue;
    }
    if (!productPublicationCaptureReceiptMatchesSource(receipt, source)) {
      issues.push(
        productPortfolioReconciliationIssue({
          kind: "capture-receipt-rejected",
          receipt,
          subjectRef: receipt.sourceId,
          summary:
            "Capture receipt does not match the catalogued publication source version.",
        }),
      );
      continue;
    }

    projectedScenarioIds.add(receipt.sourceId);
    projectedReceipts.push(receipt);
    scenarios.push(source);
  }

  return {
    issues,
    receipts: projectedReceipts,
    scenarios,
  };
}

function productPublicationCaptureReceiptMatchesSource(
  receipt: ProductPublicationCaptureLocalReceipt,
  source: ProductPortfolioScenarioProjection,
) {
  return (
    receipt.commandName === "portfolio.publication.capture" &&
    receipt.kind === "capture" &&
    receipt.schemaVersion === 1 &&
    receipt.resultState === "captured" &&
    receipt.sourceId === source.scenarioId &&
    receipt.packetId === source.publicationPacket.packetId &&
    receipt.productId === source.publicationPacket.product.productId &&
    receipt.publicationReceiptRef === source.projection.receipt.receiptRef &&
    receipt.idempotencyKey ===
      productPortfolioPublicationCaptureIdempotencyKey(
        source.scenarioId,
        source.projection.receipt.receiptRef,
      ) &&
    receipt.capturedByRef.trim().length > 0 &&
    sameSourceVersions(
      receipt.sourceVersions,
      source.publicationPacket.sourceVersions,
    ) &&
    source.projection.publicationState === "captured" &&
    source.projection.entry === null
  );
}

function projectProductPortfolioPublicationReceipts({
  receipts,
  scenario,
}: {
  receipts: ProductPublicationDecisionReceipt[];
  scenario: ProductPortfolioScenarioProjection;
}): {
  issues: ProductPortfolioReconciliationIssue[];
  receipt: ProductPublicationDecisionReceipt | null;
  scenario: ProductPortfolioScenarioProjection;
} {
  const issues: ProductPortfolioReconciliationIssue[] = [];
  const seenReceiptIds = new Set<string>();
  let appliedReceipt: ProductPublicationDecisionReceipt | null = null;
  let projectedScenario = scenario;

  if (
    scenario.projection.publicationState === "published" ||
    scenario.projection.publicationState === "rejected"
  ) {
    for (const receipt of receipts) {
      if (seenReceiptIds.has(receipt.receiptId)) continue;
      seenReceiptIds.add(receipt.receiptId);
      issues.push(
        productPortfolioReconciliationIssue({
          kind: "publication-receipt-rejected",
          receipt,
          subjectRef: scenario.scenarioId,
          summary:
            "Publication receipt cannot apply because the source projection is already resolved.",
        }),
      );
    }
    return { issues, receipt: null, scenario };
  }

  for (const receipt of receipts) {
    if (seenReceiptIds.has(receipt.receiptId)) {
      continue;
    }
    seenReceiptIds.add(receipt.receiptId);

    if (appliedReceipt) {
      issues.push(
        productPortfolioReconciliationIssue({
          kind: "publication-receipt-rejected",
          receipt,
          subjectRef: scenario.scenarioId,
          summary:
            "Publication receipt cannot apply after an earlier terminal decision.",
        }),
      );
      continue;
    }

    const projectionContext = {
      ...scenario.projectionContext,
      publicationDecision: receipt.decision,
      evaluatedAt: receipt.recordedAt,
    };

    try {
      const projection = projectProductPublication(
        scenario.publicationPacket,
        projectionContext,
      );

      if (
        !productPublicationReceiptMatchesProjection({
          projection,
          receipt,
          scenario,
        })
      ) {
        issues.push(
          productPortfolioReconciliationIssue({
            kind: "publication-receipt-rejected",
            receipt,
            subjectRef: scenario.scenarioId,
            summary:
              "Publication receipt does not match the source packet and projected decision.",
          }),
        );
        continue;
      }

      appliedReceipt = receipt;
      projectedScenario = {
        ...scenario,
        projection,
        projectionContext,
      };
    } catch {
      issues.push(
        productPortfolioReconciliationIssue({
          kind: "publication-receipt-rejected",
          receipt,
          subjectRef: scenario.scenarioId,
          summary:
            "Publication receipt could not be replayed against its source packet.",
        }),
      );
    }
  }

  return {
    issues,
    receipt: appliedReceipt,
    scenario: projectedScenario,
  };
}

function productPublicationReceiptsByPacket(
  receipts: ProductPublicationDecisionReceipt[],
) {
  const receiptsByPacket = new Map<string, ProductPublicationDecisionReceipt[]>();

  for (const receipt of [...receipts].sort(comparePortfolioReceipts)) {
    const currentReceipts = receiptsByPacket.get(receipt.packetId) ?? [];
    receiptsByPacket.set(receipt.packetId, [...currentReceipts, receipt]);
  }

  return receiptsByPacket;
}

function unmatchedProductPublicationReceiptIssues(
  receipts: ProductPublicationDecisionReceipt[],
  sourcePacketIds: Set<string>,
) {
  const seenReceiptIds = new Set<string>();
  const issues: ProductPortfolioReconciliationIssue[] = [];

  for (const receipt of [...receipts].sort(comparePortfolioReceipts)) {
    if (
      seenReceiptIds.has(receipt.receiptId) ||
      sourcePacketIds.has(receipt.packetId)
    ) {
      continue;
    }
    seenReceiptIds.add(receipt.receiptId);
    issues.push(
      productPortfolioReconciliationIssue({
        kind: "publication-receipt-rejected",
        receipt,
        subjectRef: receipt.packetId,
        summary:
          "Publication receipt references a publication packet that is not available.",
      }),
    );
  }

  return issues;
}

function productPublicationReceiptMatchesProjection({
  projection,
  receipt,
  scenario,
}: {
  projection: ProductPortfolioScenarioProjection["projection"];
  receipt: ProductPublicationDecisionReceipt;
  scenario: ProductPortfolioScenarioProjection;
}) {
  const packet = scenario.publicationPacket;
  const published = projection.publicationState === "published";

  return (
    receipt.commandName === "portfolio.publication.apply" &&
    receipt.schemaVersion === 1 &&
    receipt.packetId === packet.packetId &&
    receipt.productId === packet.product.productId &&
    receipt.decision.decidedAt === receipt.recordedAt &&
    receipt.decision.receiptRef ===
      `portfolio-local://publication/${receipt.receiptId}` &&
    receipt.publicationReceiptRef === projection.receipt.receiptRef &&
    receipt.resultState === (published ? "published" : "rejected") &&
    receipt.resultingProductRef ===
      (published ? `portfolio://products/${packet.product.productId}` : null) &&
    sameProductListing(receipt.listing, projection.entry?.listing ?? null) &&
    sameSourceVersions(receipt.sourceVersions, packet.sourceVersions) &&
    samePublicationRequirements(
      receipt.requirementSnapshot,
      projection.requirements,
    )
  );
}

function projectProductPortfolioListings(
  sourceEntries: ProductPortfolioEntry[],
  applications: ProductPortfolioRuntimeProjectionSnapshot["listingApplications"],
) {
  const seenReceiptIds = new Set<string>();
  const issues: ProductPortfolioReconciliationIssue[] = [];
  const receipts: ProductListingReceipt[] = [];
  let entries = sourceEntries;

  for (const application of [...applications].sort((left, right) =>
    comparePortfolioReceipts(left.receipt, right.receipt),
  )) {
    if (seenReceiptIds.has(application.receipt.receiptId)) {
      continue;
    }
    seenReceiptIds.add(application.receipt.receiptId);

    try {
      const result = applyProductListingCommand(entries, application.command);

      if (!productListingApplicationMatchesResult(application, result)) {
        issues.push(
          productPortfolioReconciliationIssue({
            kind: "listing-receipt-rejected",
            receipt: application.receipt,
            subjectRef: application.command.productId,
            summary:
              "Listing receipt does not match the submitted command and projected result.",
          }),
        );
        continue;
      }

      entries = result.entries;
      receipts.push(application.receipt);
    } catch {
      issues.push(
        productPortfolioReconciliationIssue({
          kind: "listing-receipt-rejected",
          receipt: application.receipt,
          subjectRef: application.command.productId,
          summary:
            "Listing receipt could not be replayed against the current product projection.",
        }),
      );
    }
  }

  return { entries, issues, receipts };
}

function projectProductPortfolioListingScenarios(
  scenarios: ProductPortfolioScenarioProjection[],
  entries: ProductPortfolioEntry[],
) {
  const entriesByProductId = new Map(
    entries.map((entry) => [entry.identity.productId, entry] as const),
  );

  return scenarios.map((scenario) => {
    if (!scenario.projection.entry) {
      return scenario;
    }

    const entry = entriesByProductId.get(
      scenario.projection.entry.identity.productId,
    );
    if (!entry) {
      return scenario;
    }

    const { forbiddenCommands: _forbiddenCommands, ...sourceProjection } =
      scenario.projection;

    return {
      ...scenario,
      projection: withForbiddenProductCommands({
        ...sourceProjection,
        allowedCommands: productCommandsForEntry(entry),
        entry,
        requiredAction: productRequiredActionForEntry(entry),
      }),
    };
  });
}

function productListingApplicationMatchesResult(
  application: ProductPortfolioRuntimeProjectionSnapshot["listingApplications"][number],
  result: ProductListingApplyResult,
) {
  const { command, receipt } = application;
  const projectedReceipt = result.receipt;

  return (
    receipt.commandName === "portfolio.listing.apply" &&
    receipt.schemaVersion === 1 &&
    receipt.resultState === "updated" &&
    receipt.productId === command.productId &&
    receipt.idempotencyKey === command.idempotencyKey &&
    receipt.recordedAt === command.submittedAt &&
    receipt.submittedByRef === command.submittedByRef &&
    receipt.receiptId === projectedReceipt.receiptId &&
    receipt.summary === projectedReceipt.summary &&
    sameProductListing(receipt.before, projectedReceipt.before) &&
    sameProductListing(receipt.after, projectedReceipt.after) &&
    sameStrings(
      receipt.reorderedProductIds,
      projectedReceipt.reorderedProductIds,
    )
  );
}

function comparePortfolioReceipts(
  left: { receiptId: string; recordedAt: string },
  right: { receiptId: string; recordedAt: string },
) {
  return (
    left.recordedAt.localeCompare(right.recordedAt) ||
    left.receiptId.localeCompare(right.receiptId)
  );
}

function comparePortfolioReconciliationIssues(
  left: ProductPortfolioReconciliationIssue,
  right: ProductPortfolioReconciliationIssue,
) {
  return (
    left.occurredAt.localeCompare(right.occurredAt) ||
    left.issueId.localeCompare(right.issueId)
  );
}

function productPortfolioReconciliationIssue({
  kind,
  receipt,
  subjectRef,
  summary,
}: {
  kind: ProductPortfolioReconciliationIssue["kind"];
  receipt: { receiptId: string; recordedAt: string };
  subjectRef: string;
  summary: string;
}): ProductPortfolioReconciliationIssue {
  return {
    issueId: `portfolio-reconciliation:${kind}:${receipt.receiptId}`,
    kind,
    occurredAt: receipt.recordedAt,
    receiptRef: receipt.receiptId,
    subjectRef,
    summary,
  };
}

function sameProductListing(
  left: ProductPortfolioEntry["listing"] | null,
  right: ProductPortfolioEntry["listing"] | null,
) {
  if (left === null || right === null) {
    return left === right;
  }

  return (
    left.featured === right.featured &&
    left.scope === right.scope &&
    left.sortOrder === right.sortOrder &&
    left.state === right.state
  );
}

function sameSourceVersions(
  left: readonly ProductSourceVersion[],
  right: readonly ProductSourceVersion[],
) {
  return (
    left.length === right.length &&
    left.every(
      (version, index) =>
        version.authority === right[index]?.authority &&
        version.ref === right[index]?.ref &&
        version.version === right[index]?.version,
    )
  );
}

function samePublicationRequirements(
  left: ProductPublicationDecisionReceipt["requirementSnapshot"],
  right: ProductPublicationDecisionReceipt["requirementSnapshot"],
) {
  return (
    left.length === right.length &&
    left.every((requirement, index) => {
      const candidate = right[index];

      return (
        requirement.code === candidate?.code &&
        requirement.ownerRef === candidate.ownerRef &&
        requirement.routeRef === candidate.routeRef &&
        requirement.state === candidate.state &&
        sameStrings(requirement.evidenceRefs, candidate.evidenceRefs)
      );
    })
  );
}

function sameStrings(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
