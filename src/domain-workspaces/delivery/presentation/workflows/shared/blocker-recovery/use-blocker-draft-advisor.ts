"use client";
import { useDraftAdvisor, advisorWorkContext } from "@/agent-console";
import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

export function useBlockerDraftAdvisor(options: {
  role: "work-design-blocker" | "refinement-blocker";
  deliveryPackage: DeliveryPackageSummary;
  issue: unknown; action: unknown; justification: string;
  setJustification: (value: string) => void; disabled?: boolean; active?: boolean;
}) {
  return useDraftAdvisor({
    conversation: { role: options.role, ref: options.deliveryPackage.delivery_package_id, sourceRef: options.deliveryPackage.source_ref },
    active: options.active,
    disabled: options.disabled,
    getScope: () => ({ role: options.role, ref: options.deliveryPackage.delivery_package_id,
      sourceRef: options.deliveryPackage.source_ref, sourceRevision: "local-blocker-draft",
      context: advisorWorkContext({ package: options.deliveryPackage.display_name, summary: options.deliveryPackage.summary,
        sourceRef: options.deliveryPackage.source_ref, issue: options.issue, selectedAction: options.action,
        authority: "Draft a justification only. Recording or executing a recovery action remains an operator decision." },
        { provided: ["Selected issue and recovery action", "Existing justification and package source identity"],
          unavailable: ["Unprovided diagnostic logs or independently verified root cause", "Action execution or risk acceptance"] }),
      fields: [{ key: "justification", label: "Recovery justification", value: options.justification }],
    }),
    apply: (edits) => { options.setJustification(String(edits[0].value)); return edits; },
  });
}
