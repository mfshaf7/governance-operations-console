import type { ProductMaintenanceComposition } from "./product-maintenance-live-types.ts";

export type ProductMaintenanceStep = Readonly<{
  description: string;
  id:
    | "archive-publication"
    | "blocked-contradiction"
    | "restore-inventory"
    | "restore-publication"
    | "retire-inventory"
    | "unpublish";
  label: string;
  surface: "product-publication" | "workspace-registry" | null;
}>;

const listedPostures = new Set(["internal", "client", "public"]);

export function resolveProductMaintenanceStep(
  composition: ProductMaintenanceComposition,
): ProductMaintenanceStep {
  const lifecycle = composition.inventory_lifecycle.posture;
  const publication = composition.maintenance.publication.posture;

  if (listedPostures.has(publication)) {
    if (lifecycle !== "active") {
      return blocked(
        "A listed publication and non-active inventory lifecycle contradict the governed contract. Repair owner evidence before continuing.",
      );
    }
    return {
      description: "Commit a fresh owner manifest for the exact active/listed state, then move publication to unlisted.",
      id: "unpublish",
      label: "Continue in Product Publication",
      surface: "product-publication",
    };
  }

  if (publication === "unlisted") {
    if (lifecycle === "retired") {
      return {
        description: "Use a fresh schema-v2 retired/unlisted owner manifest bound to the exact retirement event, then archive.",
        id: "archive-publication",
        label: "Continue in Product Publication",
        surface: "product-publication",
      };
    }
    return {
      description: "Retire the current product record through Workspace Registry before creating the archive manifest.",
      id: "retire-inventory",
      label: "Continue in Workspace Registry",
      surface: "workspace-registry",
    };
  }

  if (publication === "archived") {
    if (lifecycle === "retired") {
      return {
        description: "Restore the product lifecycle through Workspace Registry before restoring publication.",
        id: "restore-inventory",
        label: "Continue in Workspace Registry",
        surface: "workspace-registry",
      };
    }
    if (lifecycle === "active") {
      return {
        description: "Use a fresh schema-v2 active/unlisted owner manifest bound to the exact restore event and prior archived receipt.",
        id: "restore-publication",
        label: "Continue in Product Publication",
        surface: "product-publication",
      };
    }
  }

  return blocked(
    "The current inventory lifecycle and publication posture have no safe maintenance transition.",
  );
}

function blocked(description: string): ProductMaintenanceStep {
  return {
    description,
    id: "blocked-contradiction",
    label: "Maintenance blocked",
    surface: null,
  };
}
