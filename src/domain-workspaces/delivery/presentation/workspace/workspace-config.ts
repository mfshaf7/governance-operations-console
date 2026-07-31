import type {
  DeliverySurfaceConfig,
  DeliveryWorkspaceSurfaceConfig,
} from "./workspace-types.ts";

export const deliverySurfaces: DeliverySurfaceConfig[] = [
  {
    description:
      "Accepted proposals become ART-backed Delivery Package shells.",
    id: "intake",
    kicker: "01",
    workflowPhase: "intake",
    title: "Intake",
    tone: "warn",
  },
  {
    description:
      "AI and operator shape the Epic, Feature, User story, and Risk tree.",
    id: "work-design",
    kicker: "02",
    workflowPhase: "work_design",
    title: "Work Design",
    tone: "info",
  },
  {
    description: "Complete whole-package metadata before execution control.",
    id: "refinement",
    kicker: "03",
    workflowPhase: "refinement",
    title: "Refinement",
    tone: "warn",
  },
  {
    description:
      "Control ready and active packages without flooding child work items into the workspace.",
    id: "execution-board",
    kicker: "04",
    title: "Execution Board",
    tone: "info",
  },
];

export const deliveryCatalogSurface: DeliveryWorkspaceSurfaceConfig = {
  description:
    "Add, edit, and retire backend-owned Delivery metadata catalogs.",
  id: "catalog",
  kicker: "06",
  title: "Delivery Catalog",
  tone: "muted",
};

export const deliveryWorkspaceHomeSurface: DeliveryWorkspaceSurfaceConfig = {
  description:
    "Review the highest-priority Delivery move and route into the correct workflow surface.",
  id: "home",
  kicker: "01",
  title: "Home",
  tone: "warn",
};

export const deliveryWorkspaceSurfaces: DeliveryWorkspaceSurfaceConfig[] = [
  deliveryWorkspaceHomeSurface,
  ...deliverySurfaces.map((surface, index) => ({
    ...surface,
    kicker: String(index + 2).padStart(2, "0"),
  })),
  deliveryCatalogSurface,
];
