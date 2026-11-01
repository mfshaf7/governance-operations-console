"use client";

import { useCallback, useEffect, useState } from "react";
import { assertProductPublicationPreparation } from "./product-publication-preparation.ts";

import {
  assertGovernedProductPublicationIntent,
  assertGovernedProductPublicationResult,
  assertProductPublicationLiveMode,
  isProductPublicationLiveApiError,
} from "./product-publication-live-contract.ts";
import type {
  GovernedProductPublicationIntent,
  GovernedProductPublicationResult,
  ProductPublicationLiveMode,
} from "./product-publication-live-types.ts";

export function useProductPublicationLiveRuntime() {
  const [mode, setMode] = useState<ProductPublicationLiveMode | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Readonly<Record<string, GovernedProductPublicationResult>>
  >({});

  const refreshMode = useCallback(async () => {
    const response = await fetch("/api/product-portfolio/publications", {
      cache: "no-store",
      method: "GET",
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw clientError(body);
    const next = assertProductPublicationLiveMode(body);
    setMode(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    void refreshMode().catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Product Publication is unavailable.");
    });
    return () => {
      active = false;
    };
  }, [refreshMode]);

  const submit = useCallback(async (intent: GovernedProductPublicationIntent) => {
    return run(async () => {
      const reviewed = assertGovernedProductPublicationIntent(intent);
      const response = await fetch("/api/product-portfolio/publications", {
        body: JSON.stringify(reviewed),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw clientError(body);
      return remember(assertGovernedProductPublicationResult(body));
    });
  }, []);

  const read = useCallback(async (requestId: string) => {
    return run(async () => {
      const response = await fetch(
        `/api/product-portfolio/publications/${encodeURIComponent(requestId)}`,
        { cache: "no-store", method: "GET" },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw clientError(body);
      return remember(assertGovernedProductPublicationResult(body));
    });
  }, []);

  function remember(result: GovernedProductPublicationResult) {
    setResults((current) => ({ ...current, [result.request_id]: result }));
    return result;
  }

  async function run<T>(operation: () => Promise<T>) {
    setPending(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      const failure = caught instanceof Error ? caught : new Error("Product Publication failed.");
      setError(failure.message);
      throw failure;
    } finally {
      setPending(false);
    }
  }

  const prepare = useCallback(async (productId: string) => run(async () => {
    if (!/^product:[a-z0-9][a-z0-9._-]*$/.test(productId)) throw new Error("Select a registered product.");
    const response = await fetch(`/api/product-portfolio/publications/products/${encodeURIComponent(productId)}/preparation`, { cache: "no-store" });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw clientError(body);
    return assertProductPublicationPreparation(body, productId);
  }), []);
  return { error, mode, pending, prepare, read, refreshMode, results, submit };
}

function clientError(value: unknown) {
  return new Error(
    isProductPublicationLiveApiError(value)
      ? value.error
      : "Product Publication owner operation failed.",
  );
}
