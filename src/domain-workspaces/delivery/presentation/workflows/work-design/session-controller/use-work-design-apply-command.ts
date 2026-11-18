"use client";

import { useEffect, useRef } from "react";
import type { useWorkDesignLiveRuntime } from "../../../../live-runtime/use-work-design-live-runtime.ts";
import type { WorkDesignApplyReceipt } from "../../../../work-model/work-design/work-design-types.ts";
import { createLocalWorkDesignApplyReceipt } from "../../../../local-runtime/index.ts";
import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import type { WorkDesignNode } from "../model/work-design-model.ts";
import type { WorkDesignApplyState } from "../steps/apply-draft/use-work-design-apply-state.ts";

export function useWorkDesignApplyCommand({ readOnly, ready, liveRuntime, state, tree, note, deliveryPackage, record, onApplied, onCanonicalChanged, clearEdits }: {
  readOnly: boolean; ready: boolean; liveRuntime: ReturnType<typeof useWorkDesignLiveRuntime>;
  state: WorkDesignApplyState; tree: WorkDesignNode; note: string; deliveryPackage: DeliveryPackageSummary;
  record: (receipt: WorkDesignApplyReceipt) => void; onApplied?: (receipt: WorkDesignApplyReceipt) => void;
  onCanonicalChanged?: () => Promise<void>; clearEdits: () => void;
}) {
  const inFlight = useRef(false);
  const acceptance = useRef<{ treeKey: string; acceptedAt: string; acceptanceId: string } | null>(null);
  useEffect(() => {
    if (liveRuntime.projection?.state === "apply-pending" && !inFlight.current)
      state.setApplyFeedback(old => ({ ...old, needsCheck: true }));
  }, [liveRuntime.projection?.state, state.setApplyFeedback]);
  function event(text: string, tone: "ok" | "info" | "warn" = "info") {
    state.setApplyFeedback(old => ({ ...old, events: [...old.events, {
      timestamp: new Date().toISOString(), text, tone, marker: tone === "ok" ? "[ok]" : tone === "warn" ? "[!!]" : "[..]",
    }] }));
  }
  async function changed() {
    try { await onCanonicalChanged?.(); }
    catch { event("The application is confirmed, but the Delivery summary could not refresh. Reopen the register to read current status.", "warn"); }
  }
  async function run() {
    if (readOnly || inFlight.current || (!ready && !state.applyFeedback.needsCheck)) return;
    inFlight.current = true;
    state.setApplyFeedback(old => ({ ...old, pending: true }));
    state.setApplyRuntimeError(null);
    try {
      if (state.applyFeedback.needsCheck) {
        event("Checking the original application; no new Apply request is being submitted.");
        const snapshot = await liveRuntime.refresh();
        const result = snapshot.projection?.latest_application;
        if (snapshot.projection?.state === "applied" && result) {
          record({ appliedAt: result.applied_at, appliedBy: result.applied_by, receiptId: result.receipt.ref, targetTree: tree });
          state.setApplyFeedback(old => ({ ...old, needsCheck: false }));
          event("The original durable receipt confirms canonical application and readback.", "ok");
          await changed();
        } else if (snapshot.projection?.state === "not-applied") {
          state.setApplyFeedback(old => ({ ...old, needsCheck: false }));
          event("The backend reports no pending application. Review the retained input before submitting again.");
        } else {
          event("The original application still needs backend reconciliation. No new request was submitted.", "warn");
        }
        return;
      }
      const treeKey = JSON.stringify({ tree, note });
      if (acceptance.current?.treeKey !== treeKey) acceptance.current = {
        treeKey, acceptedAt: new Date().toISOString(), acceptanceId: `work-design-acceptance:${crypto.randomUUID()}`,
      };
      event("Apply requested for the reviewed tree.");
      const live = await liveRuntime.apply({ acceptanceId: acceptance.current.acceptanceId, acceptedAt: acceptance.current.acceptedAt, note, tree }, {
        submitted: () => event("Request submitted. Waiting for backend validation, canonical update and receipt."),
        confirmed: result => {
          record({ appliedAt: result.applied_at, appliedBy: result.applied_by, receiptId: result.receipt.ref, targetTree: tree });
          clearEdits();
          event("Durable receipt received: canonical application and readback confirmed.", "ok");
        },
      });
      const receipt = live.result ? { appliedAt: live.result.applied_at, appliedBy: live.result.applied_by,
        receiptId: live.result.receipt.ref, targetTree: tree } : createLocalWorkDesignApplyReceipt({ deliveryPackage, targetTree: tree });
      record(receipt); clearEdits();
      state.setApplyFeedback(old => ({ ...old, needsCheck: false }));
      if (live.result) await changed(); else onApplied?.(receipt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apply result could not be confirmed.";
      state.setApplyRuntimeError(message);
      state.setApplyFeedback(old => ({ ...old, needsCheck: true }));
      event(`${message} Check the original application before submitting again.`, "warn");
    } finally {
      inFlight.current = false;
      state.setApplyFeedback(old => ({ ...old, pending: false }));
    }
  }
  return run;
}
