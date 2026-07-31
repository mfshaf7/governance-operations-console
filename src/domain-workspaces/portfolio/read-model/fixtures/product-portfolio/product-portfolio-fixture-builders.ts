import type {
  PortfolioSegment,
  ProductAccessClass,
  ProductAvailability,
  ProductExperienceKind,
  ProductForm,
  ProductListingScope,
  ProductListingState,
  ProductRegistryLifecycle,
  ProductSecurityPosture,
  ProductTag,
} from "../../../domain/product-portfolio-vocabulary.ts";
import type { ProductPortfolioEntry } from "../../../domain/product-portfolio-entry-types.ts";
import type {
  ProductPortfolioFixtureScenario,
  ProductPortfolioStatusAxes,
} from "../../types/product-portfolio-fixture-types.ts";
import type {
  ProductPublicationDecision,
  ProductPortfolioCommand,
  ProductPortfolioProjectionContext,
  ProductPortfolioRequiredAction,
  ProductPublicationReceipt,
} from "../../../work-model/publication/product-publication-review-types.ts";
import type {
  ProductPublicationKind,
  ProductPublicationPacket,
} from "../../../work-model/publication/product-publication-types.ts";
import { projectProductPublication } from "../../../work-model/publication/product-publication-projection.ts";
import { productPortfolioCommands } from "../../../work-model/publication/product-portfolio-command-policy.ts";

export const fixtureEvaluatedAt = "2026-07-23T08:00:00.000Z";
export const fixtureObservedAt = "2026-07-23T07:30:00.000Z";
export const fixtureExpiresAt = "2026-07-23T09:30:00.000Z";

type ProductPacketFixtureInput = {
  accessClass: ProductAccessClass;
  availability: ProductAvailability;
  clientRef?: string | null;
  displayName: string;
  expiresAt?: string | null;
  featured?: boolean;
  form: ProductForm;
  governedProdPromotion?: boolean;
  highestRealEndpoint: string;
  href?: string | null;
  id: string;
  lifecycle: ProductRegistryLifecycle;
  listingScope: ProductListingScope;
  listingState?: ProductListingState;
  manifestPresent?: boolean;
  owners?: {
    platformOwnerRef: string;
    productOwnerRef: string;
    runtimeOwnerRef: string;
    securityOwnerRef: string;
    sourceOwnerRefs: string[];
  };
  packetId?: string;
  permittedListingScopes?: ProductListingScope[];
  primaryExperienceKind: ProductExperienceKind;
  publicationKind?: ProductPublicationKind;
  purpose: string;
  releaseVersion?: string | null;
  securityPosture?: ProductSecurityPosture;
  segment: PortfolioSegment;
  stageSupported?: boolean;
  summary: string;
  tags: ProductTag[];
};

export function productPacketFixture(
  input: ProductPacketFixtureInput,
): ProductPublicationPacket {
  const owners = input.owners ?? {
    platformOwnerRef: "platform-engineering",
    productOwnerRef: `owner-repo:${input.id}`,
    runtimeOwnerRef: `runtime-owner:${input.id}`,
    securityOwnerRef: "security-architecture",
    sourceOwnerRefs: [`owner-repo:${input.id}`],
  };
  const packetId = input.packetId ?? `portfolio-fixture://${input.id}/v1`;
  const manifestPresent = input.manifestPresent ?? true;
  const releaseVersion =
    input.releaseVersion === undefined ? "1.0.0" : input.releaseVersion;
  const securityPosture = input.securityPosture ?? "accepted";

  return {
    causationId: `fixture-cause:${packetId}`,
    classification: {
      clientRef: input.clientRef ?? null,
      portfolioSegment: input.segment,
      productForm: input.form,
      tags: [...input.tags],
    },
    correlationId: `fixture-correlation:${input.id}`,
    delivery: {
      graduationRefs: [`prototype-studio://graduation/${input.id}`],
      historyRefs: [`workspace-delivery-art://history/${input.id}`],
      latestOutcomeRef: `workspace-delivery-art://outcomes/${input.id}`,
    },
    experience: {
      accessContract: {
        accessClass: input.accessClass,
        permittedListingScopes: [
          ...(input.permittedListingScopes ?? [input.listingScope]),
        ],
        sourceRef: `security-architecture://product-access/${input.id}`,
        sourceVersion: "fixture-v1",
        verifiedAt: fixtureObservedAt,
      },
      primaryTarget: {
        accessClass: input.accessClass,
        href:
          input.href === undefined
            ? `https://${input.id}.example.test`
            : input.href,
        kind: input.primaryExperienceKind,
        label: `${input.displayName} primary access`,
        sourceRef: `product-owner://experience/${input.id}/primary`,
        verified: true,
      },
      secondaryTargets: [],
    },
    idempotencyKey: `portfolio-publication:${packetId}`,
    listing: {
      featured: input.featured ?? false,
      requestedScope: input.listingScope,
      requestedState: input.listingState ?? "listed",
      sortOrder: 100,
    },
    manifest: {
      artworkRef: manifestPresent
        ? `product-owner://artwork/${input.id}`
        : null,
      digest: manifestPresent ? `sha256:fixture-${input.id}` : "",
      displayName: manifestPresent ? input.displayName : "",
      purpose: manifestPresent ? input.purpose : "",
      ref: manifestPresent
        ? `product-owner://portfolio-manifest/${input.id}`
        : "",
      summary: manifestPresent ? input.summary : "",
    },
    maturity: {
      governedProdPromotion: input.governedProdPromotion ?? false,
      highestRealEndpoint: input.highestRealEndpoint,
      level: input.lifecycle,
      stageSupported: input.stageSupported ?? false,
    },
    owners: {
      ...owners,
      sourceOwnerRefs: [...owners.sourceOwnerRefs],
    },
    packetId,
    product: {
      lifecycle: input.lifecycle,
      productId: input.id,
      registryRef: `workspace-governance://products/${input.id}`,
      registryVersion: "fixture-v1",
    },
    publicationKind: input.publicationKind ?? "new-product",
    release:
      releaseVersion === null
        ? null
        : {
            evidenceRefs: [`product-owner://release-evidence/${input.id}`],
            ref: `product-owner://releases/${input.id}/${releaseVersion}`,
            releasedAt: "2026-07-22T10:00:00.000Z",
            version: releaseVersion,
          },
    runtimeObservations: [
      {
        availability: input.availability,
        environment:
          input.availability === "not-applicable"
            ? "distribution"
            : "managed-runtime",
        evidenceRef: `platform-engineering://runtime-evidence/${input.id}`,
        expiresAt:
          input.expiresAt === undefined
            ? input.availability === "not-applicable"
              ? null
              : fixtureExpiresAt
            : input.expiresAt,
        observedAt: fixtureObservedAt,
        sourceOwnerRef: owners.runtimeOwnerRef,
      },
    ],
    schemaVersion: "1",
    security: {
      evidenceRefs:
        securityPosture === "not-applicable"
          ? []
          : [`security-architecture://evidence/${input.id}`],
      ownerRef: owners.securityOwnerRef,
      posture: securityPosture,
      reviewRefs:
        securityPosture === "not-applicable"
          ? []
          : [`security-architecture://reviews/${input.id}`],
    },
    source: {
      documentationTargets: [
        {
          accessClass: input.accessClass,
          href: `https://docs.example.test/${input.id}`,
          kind: "documentation",
          label: `${input.displayName} documentation`,
          sourceRef: `product-owner://documentation/${input.id}`,
          verified: true,
        },
      ],
      repositories: owners.sourceOwnerRefs.map((ownerRef) => ({
        ownerRef,
        ref: `repo://${ownerRef.replaceAll(":", "/")}`,
      })),
    },
    sourceVersions: [
      {
        authority: "workspace-governance",
        ref: `workspace-governance://products/${input.id}`,
        version: "fixture-v1",
      },
      {
        authority: "product-owner",
        ref: `product-owner://portfolio-manifest/${input.id}`,
        version: manifestPresent ? "fixture-v1" : "missing",
      },
      {
        authority: "platform-engineering",
        ref: `platform-engineering://runtime-evidence/${input.id}`,
        version: "fixture-v1",
      },
      {
        authority: "security-architecture",
        ref: `security-architecture://product-access/${input.id}`,
        version: "fixture-v1",
      },
    ],
    supersedesPublicationRef: null,
  };
}

export function publicationDecisionFixture(
  productId: string,
): ProductPublicationDecision {
  return {
    decidedAt: fixtureEvaluatedAt,
    decidedByRef: "operator://portfolio-fixture",
    listing: null,
    outcome: "publish",
    reasonCode: null,
    reasonNote: null,
    receiptRef: `portfolio-local://publication/${productId}`,
  };
}

export function projectionContextFixture(input?: {
  publicationDecision?: ProductPublicationDecision | null;
  appliedPublications?: ProductPublicationReceipt[];
  evaluatedAt?: string;
  existingEntry?: ProductPortfolioEntry | null;
}): ProductPortfolioProjectionContext {
  return {
    publicationDecision: input?.publicationDecision ?? null,
    appliedPublications: input?.appliedPublications ?? [],
    evaluatedAt: input?.evaluatedAt ?? fixtureEvaluatedAt,
    existingEntry: input?.existingEntry ?? null,
  };
}

export function publishedEntryFixture(
  packet: ProductPublicationPacket,
): ProductPortfolioEntry {
  const projected = projectProductPublication(
    packet,
    projectionContextFixture({
      publicationDecision: publicationDecisionFixture(packet.product.productId),
    }),
  );
  if (projected.entry === null) {
    throw new Error(`Fixture ${packet.packetId} did not produce an entry.`);
  }
  return projected.entry;
}

export function expectedFixture(input: {
  publicationState: ProductPortfolioFixtureScenario["expected"]["publicationState"];
  allowedCommands: ProductPortfolioCommand[];
  entryProjection: ProductPortfolioFixtureScenario["expected"]["entryProjection"];
  requiredAction: ProductPortfolioRequiredAction;
  statusAxes: ProductPortfolioStatusAxes;
}): ProductPortfolioFixtureScenario["expected"] {
  return {
    ...input,
    forbiddenCommands: productPortfolioCommands.filter(
      (command) => !input.allowedCommands.includes(command),
    ),
  };
}
