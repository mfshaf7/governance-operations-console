import type { TerasMetadataItem } from "@/teras";

import type {
  ProductPortfolioPublicationCaptureResult,
  ProductPortfolioPublicationCaptureSubmission,
} from "../../../../local-runtime/product-portfolio-runtime-model.ts";
import type { ProductPortfolioScenarioProjection } from "../../../../read-model/types/product-portfolio-fixture-types.ts";
import {
  productFormValueLabel,
  productListingScopeLabel,
} from "../../products/products-view-model.ts";
import {
  productPublicationRecordDescription,
  productPublicationRecordName,
} from "../publication-view-model.ts";

export type ProductPublicationCaptureSubmitHandler = (
  submission: ProductPortfolioPublicationCaptureSubmission,
) => Promise<ProductPortfolioPublicationCaptureResult>;

export function productPublicationAvailableSources(
  sources: ProductPortfolioScenarioProjection[],
  records: ProductPortfolioScenarioProjection[],
) {
  const capturedSourceIds = new Set(
    records.map((record) => record.scenarioId),
  );
  const capturedPacketIds = new Set(
    records.map((record) => record.publicationPacket.packetId),
  );

  return sources.filter(
    (source) =>
      !capturedSourceIds.has(source.scenarioId) &&
      !capturedPacketIds.has(source.publicationPacket.packetId),
  );
}

export function productPublicationCaptureSourceFacts(
  source: ProductPortfolioScenarioProjection,
): TerasMetadataItem[] {
  const packet = source.publicationPacket;

  return [
    { label: "Product ID", value: packet.product.productId },
    {
      label: "Product Form",
      value: productFormValueLabel(packet.classification.productForm),
    },
    { label: "Product Owner", value: packet.owners.productOwnerRef },
    {
      label: "Requested Scope",
      value: productListingScopeLabel(packet.listing.requestedScope),
    },
    { label: "Publication Packet", value: packet.packetId },
    { label: "Registry Version", value: packet.product.registryVersion },
  ];
}

export {
  productPublicationRecordDescription as productPublicationCaptureSourceDescription,
  productPublicationRecordName as productPublicationCaptureSourceName,
};
