"use client";
import { useDraftAdvisor } from "@/agent-console";
import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

export function useBlockerDraftAdvisor(options: {
  role: "work-design-blocker" | "refinement-blocker";
  deliveryPackage: DeliveryPackageSummary;
  issue: unknown; action: unknown; justification: string;
  setJustification: (value: string) => void; disabled?: boolean; active?: boolean;
}) {
  return useDraftAdvisor({
    active: options.active,
    disabled: options.disabled,
    getScope: () => ({ role: options.role, ref: options.deliveryPackage.delivery_package_id,
      sourceRef: options.deliveryPackage.source_ref, sourceRevision: "local-blocker-draft",
      context: JSON.stringify({ package: options.deliveryPackage.display_name, summary: options.deliveryPackage.summary,
        issue: options.issue, selectedAction: options.action, authority: "Draft a justification only. Recording or executing a recovery action remains an operator decision." }),
      fields: [{ key: "justification", label: "Recovery justification", value: options.justification }],
    }),
    apply: (edits) => { options.setJustification(String(edits[0].value)); return edits; },
  });
}
