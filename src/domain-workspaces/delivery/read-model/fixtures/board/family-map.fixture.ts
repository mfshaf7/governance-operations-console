import type { DeliveryReadModel } from "../../delivery-read-model.ts";

export const deliveryFamilyMapFixture: DeliveryReadModel["family_map"] = {
  groups: [
    {
      id: "delivery-art-governance-foundations",
      label: "Governance Foundations",
      summary: "2 ready",
      packages: [
        {
          delivery_package_id: "pkg-698",
          display_name: "Governed AI Control Plane",
          legacy_epic_id: 698,
          package_posture: "Ready",
          selected: true,
          tone: "info",
        },
        {
          delivery_package_id: "pkg-900",
          display_name: "Large Tree Migration Probe",
          legacy_epic_id: 900,
          package_posture: "Ready",
          selected: false,
          tone: "stale",
        },
      ],
    },
    {
      id: "delivery-art-operator-surfaces",
      label: "Operator Surfaces",
      summary: "1 active, 1 closeout, 1 catalog gap",
      packages: [
        {
          delivery_package_id: "pkg-714",
          display_name: "Broker Draft Validation",
          legacy_epic_id: 714,
          package_posture: "In Progress",
          selected: false,
          tone: "ok",
        },
        {
          delivery_package_id: "pkg-681",
          display_name: "Broker Apply Controls",
          legacy_epic_id: 681,
          package_posture: "Closeout Pending",
          selected: false,
          tone: "warn",
        },
        {
          delivery_package_id: "pkg-812",
          display_name: "Client Insight Delivery",
          legacy_epic_id: 812,
          package_posture: "Blocked",
          selected: false,
          tone: "warn",
        },
      ],
    },
    {
      id: "governed-ai-control-plane",
      label: "Governed AI Control Plane",
      summary: "1 blocked, 1 retired",
      packages: [
        {
          delivery_package_id: "pkg-753",
          display_name: "Readiness Gate Repair",
          legacy_epic_id: 753,
          package_posture: "Blocked",
          selected: false,
          tone: "danger",
        },
        {
          delivery_package_id: "pkg-251",
          display_name: "Superseded AI Assist Slice",
          legacy_epic_id: 251,
          package_posture: "Retired",
          selected: false,
          tone: "muted",
        },
      ],
    },
    {
      id: "enterprise-cybersecurity-baseline",
      label: "Cybersecurity Baseline",
      summary: "1 parked, 0 committed",
      packages: [
        {
          delivery_package_id: "pkg-087",
          display_name: "Security Baseline Review",
          legacy_epic_id: 87,
          package_posture: "Deferred",
          selected: false,
          tone: "warn",
        },
      ],
    },
    {
      id: "product-prototype-delivery",
      label: "Prototype Delivery",
      summary: "1 done",
      packages: [
        {
          delivery_package_id: "pkg-540",
          display_name: "Stale Open Closeout",
          legacy_epic_id: 540,
          package_posture: "Done",
          selected: false,
          tone: "ok",
        },
      ],
    },
  ],
};
