"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assertDeliverySourceRealizationProjection } from "./delivery-source-realization-live-contract.ts";
import type { DeliverySourceRealizationInput, DeliverySourceRealizationProjection } from "./delivery-source-realization-live-types.ts";

type Intent = DeliverySourceRealizationInput extends infer Input ? Input extends DeliverySourceRealizationInput ? Omit<Input, "commandId" | "requestedAt"> : never : never;

export function useDeliverySourceRealizationLiveRuntime(workItemId: number, sessionId: string) {
  const [projection, setProjection] = useState<DeliverySourceRealizationProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const scope = `${workItemId}:${sessionId}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const commands = useRef<Record<string, { key: string; input: DeliverySourceRealizationInput }>>({});
  const basePath = `/api/delivery/execution/${workItemId}/work-session/realization`;

  const accept = useCallback(async (response: Response) => {
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok || !body || typeof body !== "object" || !("projection" in body)) {
      throw new Error("Source realization could not be read. Refresh owner state before retrying.");
    }
    const next = assertDeliverySourceRealizationProjection(body.projection);
    if (next.session_id !== sessionId || next.work_item_id !== `work-item-${workItemId}`) throw new Error("Source realization belongs to a different work session.");
    if (currentScope.current === scope) setProjection(next);
    return next;
  }, [scope, sessionId, workItemId]);

  const refresh = useCallback(async () => {
    try {
      const next = await accept(await fetch(basePath, { cache: "no-store" }));
      if (currentScope.current === scope) setError(null);
      return next;
    } catch (caught) {
      if (currentScope.current === scope) {
        setProjection(null);
        setError(caught instanceof Error ? caught.message : "Source realization is unavailable.");
      }
      throw caught;
    }
  }, [accept, basePath, scope]);

  useEffect(() => {
    currentScope.current = scope;
    inFlight.current = false;
    setProjection(null); setError(null); setPending(false); commands.current = {};
    void refresh().catch(() => undefined);
    return () => { if (currentScope.current === scope) currentScope.current = ""; };
  }, [refresh, scope]);

  useEffect(() => {
    if (!projection || !["accepted", "applying", "apply-unknown"].includes(projection.state) || pending) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh().catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [pending, projection, refresh]);

  async function command(intent: Intent) {
    if (inFlight.current || currentScope.current !== scope) return;
    inFlight.current = true;
    const key = JSON.stringify(intent);
    const prior = commands.current[intent.action];
    const input = prior?.key === key ? prior.input : {
      ...intent, commandId: `source-realization-console:${crypto.randomUUID()}`, requestedAt: new Date().toISOString(),
    } as DeliverySourceRealizationInput;
    commands.current[intent.action] = { key, input };
    setPending(true); setError(null);
    try {
      const response = await fetch(`${basePath}/${intent.action}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      if (currentScope.current === scope && response.status >= 400 && response.status < 500) delete commands.current[intent.action];
      const next = await accept(response);
      if (currentScope.current === scope) delete commands.current[intent.action];
      return next;
    } catch (caught) {
      if (currentScope.current === scope) {
        setProjection(null);
        setError("The command did not return authoritative success. Refresh owner state; do not create another draft while the outcome is unknown.");
      }
      throw caught;
    } finally {
      if (currentScope.current === scope) { inFlight.current = false; setPending(false); }
    }
  }

  return { command, error, pending, projection, refresh };
}
