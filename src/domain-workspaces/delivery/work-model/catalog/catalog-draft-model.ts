import type {
  DeliveryCatalogItem,
} from "../../domain/delivery-types.ts";

import {
  isDeliveryTeamCatalog,
  isInitiativeFamilyCatalog,
  isOwnerRepoCatalog,
  isTargetPiCatalog,
} from "./catalog-selectors.ts";

export function catalogDraftLabelFieldLabel(
  catalog: DeliveryCatalogItem | null,
) {
  if (isTargetPiCatalog(catalog)) {
    return "Target PI";
  }

  if (isInitiativeFamilyCatalog(catalog)) {
    return "Initiative Family";
  }

  if (isDeliveryTeamCatalog(catalog)) {
    return "Team Name";
  }

  if (isOwnerRepoCatalog(catalog)) {
    return "Repository";
  }

  return "Label";
}

function slugFromLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function catalogDraftValueKey({
  catalog,
  label,
}: {
  catalog: DeliveryCatalogItem | null;
  label: string;
}) {
  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    return "";
  }

  if (isTargetPiCatalog(catalog)) {
    return normalizedLabel.toUpperCase();
  }

  if (isDeliveryTeamCatalog(catalog)) {
    return normalizedLabel;
  }

  if (isOwnerRepoCatalog(catalog)) {
    return normalizedLabel;
  }

  return slugFromLabel(normalizedLabel) || normalizedLabel;
}

export function catalogDraftLabelForStorage({ label }: { label: string }) {
  return label.trim();
}

export function catalogDraftStandardError({
  catalog,
  label,
}: {
  catalog: DeliveryCatalogItem | null;
  label: string;
}) {
  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    return "Enter a label before preparing this catalog value.";
  }

  if (isTargetPiCatalog(catalog) && !/^PI-\d{4}-\d{2}$/.test(normalizedLabel)) {
    return "Target PI must use the PI-YYYY-NN format.";
  }

  if (isInitiativeFamilyCatalog(catalog)) {
    const words = normalizedLabel.split(/\s+/).filter(Boolean);

    if (words.length < 2 || words.length > 8) {
      return "Initiative Family must be a 2-8 word family name.";
    }

    if (
      !/^[A-Z][A-Za-z0-9]*(?:[ -][A-Z0-9][A-Za-z0-9]*)*$/.test(normalizedLabel)
    ) {
      return "Initiative Family must use a title-style family name; the backend key is derived as kebab-case.";
    }
  }

  if (isDeliveryTeamCatalog(catalog)) {
    const words = normalizedLabel.split(/\s+/).filter(Boolean);

    if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(normalizedLabel)) {
      return "Delivery Team must be a team display name, not a repo slug.";
    }

    if (words.length < 2 || words.length > 6) {
      return "Delivery Team must be a 2-6 word human-readable team name.";
    }

    if (
      !/^[A-Z][A-Za-z0-9]*(?:[ &-][A-Z0-9][A-Za-z0-9]*)*$/.test(normalizedLabel)
    ) {
      return "Delivery Team must use a title-style team name from the owning service or group.";
    }
  }

  if (isOwnerRepoCatalog(catalog)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedLabel)) {
      return "Implementation repository must come from an admitted repository slug.";
    }
  }

  return null;
}

export function catalogDraftStandardHelp(catalog: DeliveryCatalogItem | null) {
  if (isTargetPiCatalog(catalog)) {
    return "Use PI-YYYY-NN. Set calendar dates in PI Planning.";
  }

  if (isInitiativeFamilyCatalog(catalog)) {
    return "Use a 2-8 word title-style family name; the canonical key is derived as kebab-case.";
  }

  if (isDeliveryTeamCatalog(catalog)) {
    return "Use a 2-6 word human-readable team name; the backend key preserves the display name.";
  }

  if (isOwnerRepoCatalog(catalog)) {
    return "Select an admitted Repository record; the Implementation repository key is derived from the repository slug.";
  }

  return "Canonical key will be derived from the structured fields.";
}
