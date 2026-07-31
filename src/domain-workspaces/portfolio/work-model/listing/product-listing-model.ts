import type { ProductPortfolioEntry } from "../../domain/product-portfolio-entry-types.ts";
import type {
  ProductListingApplyResult,
  ProductListingCommand,
  ProductListingDraft,
  ProductListingReceipt,
  ProductListingValidation,
} from "./product-listing-types.ts";

export function validateProductListingCommand(
  entries: ProductPortfolioEntry[],
  command: ProductListingCommand,
): ProductListingValidation {
  const findings: string[] = [];
  const entry = entries.find(
    (candidate) => candidate.identity.productId === command.productId,
  );

  if (!entry) {
    findings.push(`Product ${command.productId} is not in Product Portfolio.`);
    return { allowed: false, findings };
  }
  if (entry.listing.state === "retired") {
    findings.push("Retired products cannot be curated by Portfolio.");
  }
  if (
    entry.provenance.publicationReceiptRef !==
    command.expectedPublicationReceiptRef
  ) {
    findings.push(
      "The product projection changed after this listing draft opened.",
    );
  }
  if (!entry.security.permittedListingScopes.includes(command.draft.scope)) {
    findings.push(
      `Listing scope ${command.draft.scope} is not permitted by the product access contract.`,
    );
  }
  if (
    command.draft.state === "listed" &&
    command.draft.position.kind === "after"
  ) {
    const position = command.draft.position;
    const anchor = entries.find(
      (candidate) => candidate.identity.productId === position.productId,
    );

    if (!anchor) {
      findings.push("The selected listing position no longer exists.");
    } else {
      if (anchor.identity.productId === entry.identity.productId) {
        findings.push("A product cannot be positioned after itself.");
      }
      if (anchor.listing.state !== "listed") {
        findings.push(
          "The selected listing position is not an active listing.",
        );
      }
      if (anchor.listing.featured !== command.draft.featured) {
        findings.push(
          "The selected listing position must use the same placement group.",
        );
      }
    }
  }
  for (const [value, finding] of [
    [command.idempotencyKey, "An idempotency key is required."],
    [command.submittedAt, "A command timestamp is required."],
    [command.submittedByRef, "A command owner is required."],
  ] as const) {
    if (value.trim().length === 0) findings.push(finding);
  }

  return { allowed: findings.length === 0, findings };
}

export function applyProductListingCommand(
  entries: ProductPortfolioEntry[],
  command: ProductListingCommand,
): ProductListingApplyResult {
  const validation = validateProductListingCommand(entries, command);
  if (!validation.allowed) {
    throw new Error(validation.findings.join(" "));
  }

  const currentEntry = entries.find(
    (entry) => entry.identity.productId === command.productId,
  );
  if (!currentEntry) {
    throw new Error(
      `Product ${command.productId} is not in Product Portfolio.`,
    );
  }

  const draftListing = listingFromDraft(currentEntry, command.draft);
  const nextEntries = entries.map((entry) =>
    entry.identity.productId === currentEntry.identity.productId
      ? { ...entry, listing: draftListing }
      : entry,
  );
  const orderedEntries = normalizeListingOrder(
    nextEntries,
    currentEntry.identity.productId,
    command.draft,
  );
  const nextEntry = orderedEntries.find(
    (entry) => entry.identity.productId === currentEntry.identity.productId,
  );
  if (!nextEntry) {
    throw new Error(
      `Product ${command.productId} disappeared during curation.`,
    );
  }

  const reorderedProductIds = orderedEntries
    .filter((entry) => {
      const previous = entries.find(
        (candidate) =>
          candidate.identity.productId === entry.identity.productId,
      );
      return previous?.listing.sortOrder !== entry.listing.sortOrder;
    })
    .map((entry) => entry.identity.productId);
  const receipt: ProductListingReceipt = {
    after: { ...nextEntry.listing },
    before: { ...currentEntry.listing },
    commandName: "portfolio.listing.apply",
    idempotencyKey: command.idempotencyKey,
    productId: command.productId,
    receiptId: `portfolio-listing-${commandSlug(command.idempotencyKey)}`,
    recordedAt: command.submittedAt,
    reorderedProductIds,
    resultState: "updated",
    schemaVersion: 1,
    submittedByRef: command.submittedByRef,
    summary: `${currentEntry.identity.displayName} listing updated.`,
  };

  return { entries: orderedEntries, entry: nextEntry, receipt };
}

function listingFromDraft(
  entry: ProductPortfolioEntry,
  draft: ProductListingDraft,
): ProductPortfolioEntry["listing"] {
  return {
    ...entry.listing,
    featured: draft.featured,
    scope: draft.scope,
    state: draft.state,
  };
}

function normalizeListingOrder(
  entries: ProductPortfolioEntry[],
  selectedProductId: string,
  draft: ProductListingDraft,
) {
  const nextById = new Map(
    entries.map((entry) => [entry.identity.productId, entry] as const),
  );

  for (const featured of [true, false]) {
    const cohort = entries
      .filter(
        (entry) =>
          entry.listing.state === "listed" &&
          entry.listing.featured === featured &&
          entry.identity.productId !== selectedProductId,
      )
      .sort(compareListingOrder);
    const selected = nextById.get(selectedProductId);

    if (
      selected &&
      selected.listing.state === "listed" &&
      selected.listing.featured === featured
    ) {
      cohort.splice(listingInsertionIndex(cohort, draft), 0, selected);
    }

    cohort.forEach((entry, index) => {
      nextById.set(entry.identity.productId, {
        ...entry,
        listing: {
          ...entry.listing,
          sortOrder: (index + 1) * 100,
        },
      });
    });
  }

  return entries.map(
    (entry) => nextById.get(entry.identity.productId) ?? entry,
  );
}

function listingInsertionIndex(
  cohort: ProductPortfolioEntry[],
  draft: ProductListingDraft,
) {
  if (draft.state !== "listed" || draft.position.kind === "last") {
    return cohort.length;
  }
  if (draft.position.kind === "first") {
    return 0;
  }

  const position = draft.position;
  const anchorIndex = cohort.findIndex(
    (entry) => entry.identity.productId === position.productId,
  );
  return anchorIndex < 0 ? cohort.length : anchorIndex + 1;
}

function compareListingOrder(
  left: ProductPortfolioEntry,
  right: ProductPortfolioEntry,
) {
  return (
    left.listing.sortOrder - right.listing.sortOrder ||
    left.identity.displayName.localeCompare(right.identity.displayName)
  );
}

function commandSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length === 0) {
    throw new Error("The command idempotency key cannot be empty.");
  }

  return slug;
}
