import type { DeliveryCatalogReadModel } from "../../../domain/delivery-types.ts";

import { deliveryCatalogGroupFixtures } from "./groups.fixture.ts";
import { deliveryCatalogItemFixtures } from "./items.fixture.ts";
import {
  deliveryCatalogGeneratedAt,
  deliveryCatalogProjectionStatus,
  deliveryCatalogSummary,
} from "./summary.fixture.ts";
import { deliveryCatalogValueFixtures } from "./values.fixture.ts";

export const deliveryCatalogReadModel: DeliveryCatalogReadModel = {
  generated_at: deliveryCatalogGeneratedAt,
  projection_status: deliveryCatalogProjectionStatus,
  summary: deliveryCatalogSummary,
  groups: deliveryCatalogGroupFixtures,
  items: deliveryCatalogItemFixtures,
  values: deliveryCatalogValueFixtures,
};
