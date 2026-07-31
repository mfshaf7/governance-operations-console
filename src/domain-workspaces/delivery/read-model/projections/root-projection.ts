import type { DeliveryReadModel } from "../delivery-read-model.ts";

import { deliveryApplyIntentFixtures } from "../fixtures/apply-intents/apply-intents.fixture.ts";
import { deliveryAuditEventFixtures } from "../fixtures/audit-events/audit-events.fixture.ts";
import {
  deliveryArtTreeFixture,
  deliveryBoardSummaryFixture,
  deliveryFamilyMapFixture,
} from "../fixtures/board/board.fixture.ts";
import { deliveryCatalogReadModel } from "../fixtures/catalog/catalog.fixture.ts";
import { deliveryIntakeSourceFixtures } from "../fixtures/intake-sources/intake-sources.fixture.ts";
import { deliveryPackageFixtures } from "../fixtures/packages/packages.fixture.ts";
import { deliverySelectedPackageFixtures } from "../fixtures/selected-package/selected-package.fixture.ts";

export const deliveryReadModel: DeliveryReadModel = {
  schema_version: 1,
  generated_at: "2026-05-27T06:54:00.000Z",
  source_truth: "mock",
  selected_delivery_package_id: "pkg-698",
  projection_state: {
    checked_at: "2026-05-27T06:54:00.000Z",
    detail:
      "Prototype read model mirrors the locked Delivery architecture discussion. It is not live ART truth.",
    source_revision: "mock-delivery-v1",
    status: "fresh",
  },
  catalog: deliveryCatalogReadModel,
  board_summary: deliveryBoardSummaryFixture,
  intake_sources: deliveryIntakeSourceFixtures,
  packages: deliveryPackageFixtures,
  family_map: deliveryFamilyMapFixture,
  art_tree: deliveryArtTreeFixture,
  selected_packages: deliverySelectedPackageFixtures,
  apply_intents: deliveryApplyIntentFixtures,
  audit_events: deliveryAuditEventFixtures,
};
