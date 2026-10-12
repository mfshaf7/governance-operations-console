"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ProductMaintenanceComposition,
  ProductMaintenanceMode,
} from "./product-maintenance-live-types.ts";

export function useProductMaintenanceLiveRuntime(requestId: string | null) {
  const [mode, setMode] = useState<ProductMaintenanceMode | null>(null);
  const [composition, setComposition] = useState<ProductMaintenanceComposition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const modeResponse = await fetch("/api/product-portfolio/maintenance", { cache: "no-store" });
    const modeBody: unknown = await modeResponse.json().catch(() => null);
    if (!modeResponse.ok) throw apiError(modeBody);
    const nextMode = assertMode(modeBody);
    setMode(nextMode);
    if (nextMode.mode !== "live" || !requestId) {
      setComposition(null);
      return null;
    }
    const response = await fetch(`/api/product-portfolio/maintenance/${encodeURIComponent(requestId)}`, {
      cache: "no-store",
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw apiError(body);
    const next = assertComposition(body);
    setComposition(next);
    return next;
  }, [requestId]);

  useEffect(() => {
    let active = true;
    setError(null);
    void refresh().catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Product Maintenance is unavailable.");
    });
    return () => { active = false; };
  }, [refresh]);

  return { composition, error, mode, refresh };
}

function assertMode(value: unknown): ProductMaintenanceMode {
  if (!isRecord(value) || !new Set(["disconnected-preview", "live"]).has(String(value.mode))) {
    throw new Error("Product Maintenance mode evidence is invalid.");
  }
  return value as ProductMaintenanceMode;
}

function assertComposition(value: unknown): ProductMaintenanceComposition {
  if (
    !isRecord(value) || value.schema_version !== 1 ||
    value.artifact_type !== "portfolio-product-maintenance-composition" ||
    value.mode !== "live" || !isRecord(value.maintenance) || !isRecord(value.health) ||
    !isRecord(value.inventory_lifecycle) ||
    value.product_id !== value.maintenance.product_id || value.product_id !== value.health.productId ||
    !isRecord(value.grants) || Object.values(value.grants).some((grant) => grant !== false)
  ) {
    throw new Error("Product Maintenance composition evidence is invalid.");
  }
  return value as ProductMaintenanceComposition;
}

function apiError(value: unknown) {
  return new Error(isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Product Maintenance owner operation failed.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
