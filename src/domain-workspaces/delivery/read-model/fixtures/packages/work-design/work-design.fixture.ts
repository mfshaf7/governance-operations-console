import type { DeliveryPackageFixture } from "../../../../domain/delivery-types.ts";

import { deliveryWorkDesignBlockerPackageFixtures } from "./blocker.fixture.ts";
import { deliveryWorkDesignContextPackageFixtures } from "./context.fixture.ts";
import { deliveryWorkDesignDecisionPackageFixtures } from "./decision.fixture.ts";
import { deliveryWorkDesignEntryPackageFixtures } from "./entry.fixture.ts";
import { deliveryWorkDesignEvidencePackageFixtures } from "./evidence.fixture.ts";
import { deliveryWorkDesignReviewPackageFixtures } from "./review.fixture.ts";

export const deliveryWorkDesignPackageFixtures: DeliveryPackageFixture[] = [
  ...deliveryWorkDesignEntryPackageFixtures,
  ...deliveryWorkDesignContextPackageFixtures,
  ...deliveryWorkDesignBlockerPackageFixtures,
  ...deliveryWorkDesignReviewPackageFixtures,
  ...deliveryWorkDesignEvidencePackageFixtures,
  ...deliveryWorkDesignDecisionPackageFixtures,
];
