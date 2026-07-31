import type { DeliveryPackageFixture } from "../../../../domain/delivery-types.ts";

import { readOnlyActions } from "../actions.fixture.ts";

export const deliveryWorkDesignEntryPackageFixtures: DeliveryPackageFixture[] =
  [
    {
      available_actions: readOnlyActions,
      backend_status: "new",
      delivery_package_id: "pkg-design-712",
      display_name: "Context Admission Work Design",
      legacy_epic_id: 712,
      open_child_count: 0,
      package_posture: "Ready",
      source_ref: "OpenProject Epic #712",
      summary:
        "AI/operator design session is shaping the Epic, Feature, User story, and Risk tree before Work Design apply.",
      target_pi: null,
      tone: "info",
      tree_root_id: "node-design-712",
      workflow_phase: "work_design",
    },
  ];
