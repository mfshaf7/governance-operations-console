import type {
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../../domain/delivery-types.ts";

import {
  isDeliveryTeamCatalog,
  isInitiativeFamilyCatalog,
  isIterationCatalog,
  isOwnerRepoCatalog,
  isTargetPiCatalog,
  parentTargetPiValueKey,
} from "./catalog-selectors.ts";

export function catalogDraftLabel(
  catalog: DeliveryCatalogItem | null,
  value: DeliveryCatalogValue | null,
) {
  if (!value) {
    return "";
  }

  if (isIterationCatalog(catalog)) {
    const parentTargetPi = parentTargetPiValueKey(value);

    if (parentTargetPi && value.label.startsWith(`${parentTargetPi} / `)) {
      return value.label.slice(parentTargetPi.length + 3);
    }

    if (parentTargetPi && value.value_key.startsWith(`${parentTargetPi} / `)) {
      return value.value_key.slice(parentTargetPi.length + 3);
    }
  }

  return value.label;
}

export function catalogDraftLabelFieldLabel(
  catalog: DeliveryCatalogItem | null,
) {
  if (isTargetPiCatalog(catalog)) {
    return "Target PI";
  }

  if (isIterationCatalog(catalog)) {
    return "Iteration Label";
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
  parentCatalogValueKey,
}: {
  catalog: DeliveryCatalogItem | null;
  label: string;
  parentCatalogValueKey?: string | null;
}) {
  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    return "";
  }

  if (isTargetPiCatalog(catalog)) {
    return normalizedLabel.toUpperCase();
  }

  if (isIterationCatalog(catalog)) {
    return parentCatalogValueKey
      ? `${parentCatalogValueKey} / ${normalizedLabel}`
      : normalizedLabel;
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
  parentCatalogValueKey,
}: {
  catalog: DeliveryCatalogItem | null;
  label: string;
  parentCatalogValueKey?: string | null;
}) {
  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    return "Enter a label before preparing this catalog value.";
  }

  if (isTargetPiCatalog(catalog) && !/^PI-\d{4}-\d{2}$/.test(normalizedLabel)) {
    return "Target PI must use the PI-YYYY-NN format.";
  }

  if (isIterationCatalog(catalog) && !parentCatalogValueKey) {
    return "Select a Target PI before preparing an iteration value.";
  }

  if (
    isIterationCatalog(catalog) &&
    parentCatalogValueKey !== "Program-wide" &&
    !/^Iteration [1-9]\d*$/i.test(normalizedLabel)
  ) {
    return "PI-scoped iteration label must use the standard Iteration N format.";
  }

  if (
    isIterationCatalog(catalog) &&
    parentCatalogValueKey === "Program-wide" &&
    !/^[A-Z][A-Za-z0-9]*(?:[ -][A-Z0-9][A-Za-z0-9]*){0,3}$/.test(
      normalizedLabel,
    )
  ) {
    return "Program-wide iteration label must be a short title-style label.";
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
      return "Owner Repo must come from an admitted repository slug.";
    }
  }

  return null;
}

export function catalogDraftStandardHelp(catalog: DeliveryCatalogItem | null) {
  if (isTargetPiCatalog(catalog)) {
    return "Target PI must use PI-YYYY-NN; planning start and end dates are required.";
  }

  if (isIterationCatalog(catalog)) {
    return "PI-scoped values use Iteration N; Program-wide values use a short title label. The key derives from the selected parent.";
  }

  if (isInitiativeFamilyCatalog(catalog)) {
    return "Use a 2-8 word title-style family name; the canonical key is derived as kebab-case.";
  }

  if (isDeliveryTeamCatalog(catalog)) {
    return "Use a 2-6 word human-readable team name; the backend key preserves the display name.";
  }

  if (isOwnerRepoCatalog(catalog)) {
    return "Select an admitted Repository record; the Owner Repo key is derived from the repository slug.";
  }

  return "Canonical key will be derived from the structured fields.";
}
