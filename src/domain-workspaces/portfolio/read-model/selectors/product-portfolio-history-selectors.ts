import type { ProductPortfolioEntry } from "../../domain/product-portfolio-entry-types.ts";
import type { ProductEntryProjection } from "../../work-model/publication/product-publication-review-types.ts";
import type {
  ProductPortfolioHistoryEvent,
  ProductPortfolioHistoryEventState,
} from "../types/product-portfolio-history-types.ts";
import type { ProductPortfolioScenarioProjection } from "../types/product-portfolio-fixture-types.ts";

export function selectProductPortfolioHistoryByProductId(
  scenarios: ProductPortfolioScenarioProjection[],
  additionalEvents: ProductPortfolioHistoryEvent[] = [],
) {
  const events = scenarios.flatMap(productPortfolioScenarioHistoryEvents);
  const eventsByProductId: Record<string, ProductPortfolioHistoryEvent[]> = {};
  const eventIds = new Set<string>();

  for (const event of [...events, ...additionalEvents].sort(
    compareProductPortfolioHistoryEvents,
  )) {
    if (eventIds.has(event.eventId)) {
      continue;
    }

    eventIds.add(event.eventId);
    eventsByProductId[event.productId] = [
      ...(eventsByProductId[event.productId] ?? []),
      event,
    ];
  }

  return eventsByProductId;
}

function productPortfolioScenarioHistoryEvents(
  scenario: ProductPortfolioScenarioProjection,
): ProductPortfolioHistoryEvent[] {
  const currentEntry = scenario.projection.entry;
  if (!currentEntry) {
    return [];
  }

  const existingEntry = scenario.projectionContext.existingEntry;
  const priorEvents =
    existingEntry &&
    existingEntry.provenance.publicationReceiptRef !==
      currentEntry.provenance.publicationReceiptRef
      ? productPortfolioEntryHistoryEvents({
          entry: existingEntry,
          publicationState: "recorded",
          sourceRef: existingEntry.provenance.publicationReceiptRef,
        })
      : [];

  if (
    scenario.projection.entryProjection === "replay" ||
    scenario.projection.entryProjection === "retain"
  ) {
    return existingEntry
      ? productPortfolioEntryHistoryEvents({
          entry: existingEntry,
          publicationState: "recorded",
          sourceRef: existingEntry.provenance.publicationReceiptRef,
        })
      : productPortfolioEntryHistoryEvents({
          entry: currentEntry,
          publicationState: "recorded",
          sourceRef: currentEntry.provenance.publicationReceiptRef,
        });
  }

  return [
    ...priorEvents,
    ...productPortfolioEntryHistoryEvents({
      entry: currentEntry,
      publicationState: scenario.projection.entryProjection,
      sourceRef: scenario.publicationPacket.packetId,
    }),
  ];
}

function productPortfolioEntryHistoryEvents({
  entry,
  publicationState,
  sourceRef,
}: {
  entry: ProductPortfolioEntry;
  publicationState: ProductEntryProjection | "recorded";
  sourceRef: string;
}): ProductPortfolioHistoryEvent[] {
  const events: ProductPortfolioHistoryEvent[] = [
    {
      eventId: `portfolio-publication:${entry.provenance.publicationReceiptRef}`,
      kind: "product-publication",
      occurredAt: entry.provenance.refreshedAt,
      productId: entry.identity.productId,
      receiptRef: entry.provenance.publicationReceiptRef,
      sourceMode: "source-projection",
      sourceRef,
      state: publicationState,
      summary: productPublicationSummary(entry, publicationState),
    },
  ];

  if (entry.release) {
    events.push({
      eventId: `portfolio-release:${entry.release.ref}`,
      kind: "release",
      occurredAt: entry.release.releasedAt,
      productId: entry.identity.productId,
      receiptRef: entry.release.ref,
      sourceMode: "source-projection",
      sourceRef: entry.release.ref,
      state: "released",
      summary: `${entry.identity.displayName} release ${entry.release.version} was recorded.`,
    });
  }

  if (entry.runtime.observedAt) {
    events.push({
      eventId: `portfolio-runtime:${entry.identity.productId}:${entry.runtime.observedAt}`,
      kind: "runtime-observation",
      occurredAt: entry.runtime.observedAt,
      productId: entry.identity.productId,
      receiptRef: entry.runtime.evidenceRefs[0] ?? null,
      sourceMode: "source-projection",
      sourceRef:
        entry.runtime.evidenceRefs[0] ??
        `portfolio-runtime://${entry.identity.productId}`,
      state: entry.runtime.availability,
      summary: `${entry.identity.displayName} runtime evidence reported ${entry.runtime.availability}.`,
    });
  }

  return events;
}

function productPublicationSummary(
  entry: ProductPortfolioEntry,
  state: ProductPortfolioHistoryEventState,
) {
  switch (state) {
    case "create":
      return `${entry.identity.displayName} was created in Product Portfolio.`;
    case "update":
      return `${entry.identity.displayName} received a source-backed product update.`;
    case "retire":
      return `${entry.identity.displayName} was retained as a retired product.`;
    default:
      return `${entry.identity.displayName} publication evidence was recorded.`;
  }
}

function compareProductPortfolioHistoryEvents(
  left: ProductPortfolioHistoryEvent,
  right: ProductPortfolioHistoryEvent,
) {
  return (
    left.occurredAt.localeCompare(right.occurredAt) ||
    left.eventId.localeCompare(right.eventId)
  );
}
