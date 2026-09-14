import type {
  PrototypeClosureAction,
  PrototypeClosureLifecycle,
  PrototypeClosureRequestFields,
} from "../../../live-runtime/prototype-closure-live-types.ts";

export type ClosureFieldKey = keyof PrototypeClosureRequestFields;

export type ClosureFieldSpec = Readonly<{
  key: ClosureFieldKey;
  label: string;
  placeholder: string;
  kind: "ref" | "text";
}>;

export const closureActionLabels: Record<PrototypeClosureAction, string> = {
  "apply-delivery": "Apply to Delivery",
  "graduate-source": "Graduate source",
  "retire-incubation": "Retire incubation",
  "reopen-incubation": "Reopen incubation",
};

export function closureActionsForLifecycle(lifecycle: PrototypeClosureLifecycle): PrototypeClosureAction[] {
  switch (lifecycle) {
    case "baseline-approved": return ["apply-delivery", "retire-incubation"];
    case "graduating": return ["graduate-source", "retire-incubation"];
    case "retired": return ["reopen-incubation"];
    case "exploring":
    case "candidate": return ["retire-incubation"];
    case "graduated": return [];
  }
}

const specs: Record<ClosureFieldKey, ClosureFieldSpec> = {
  accepted_baseline_receipt_ref: { key: "accepted_baseline_receipt_ref", label: "Accepted baseline receipt", placeholder: "receipt://...", kind: "ref" },
  target_kind: { key: "target_kind", label: "Delivery target", placeholder: "", kind: "text" },
  target_delivery_ref: { key: "target_delivery_ref", label: "Existing Delivery item", placeholder: "openproject://work_packages/...", kind: "ref" },
  accepted_delivery_target_receipt_ref: { key: "accepted_delivery_target_receipt_ref", label: "Accepted Delivery receipt", placeholder: "receipt://...", kind: "ref" },
  durable_owner_ref: { key: "durable_owner_ref", label: "Durable owner", placeholder: "Owner identity", kind: "text" },
  durable_repo_ref: { key: "durable_repo_ref", label: "Durable repository", placeholder: "github://...", kind: "ref" },
  durable_owner_acceptance_ref: { key: "durable_owner_acceptance_ref", label: "Owner acceptance", placeholder: "receipt://...", kind: "ref" },
  transfer_strategy: { key: "transfer_strategy", label: "Source transfer", placeholder: "", kind: "text" },
  already_owned_source_proof_ref: { key: "already_owned_source_proof_ref", label: "Existing ownership proof", placeholder: "receipt://...", kind: "ref" },
  retirement_reason: { key: "retirement_reason", label: "Retirement reason", placeholder: "Why should incubation end?", kind: "text" },
  retention_plan_ref: { key: "retention_plan_ref", label: "Retention plan", placeholder: "record://...", kind: "ref" },
  runtime_disposition_plan_ref: { key: "runtime_disposition_plan_ref", label: "Runtime disposition plan", placeholder: "record://...", kind: "ref" },
  prior_retirement_receipt_ref: { key: "prior_retirement_receipt_ref", label: "Prior retirement receipt", placeholder: "receipt://...", kind: "ref" },
};

export function closureFieldsForAction(action: PrototypeClosureAction, fields: PrototypeClosureRequestFields): ClosureFieldSpec[] {
  switch (action) {
    case "apply-delivery": return [specs.accepted_baseline_receipt_ref,
      ...(fields.target_kind === "existing-delivery-item" ? [specs.target_delivery_ref] : [])];
    case "graduate-source": return [specs.accepted_delivery_target_receipt_ref,
      specs.durable_owner_ref, specs.durable_repo_ref, specs.durable_owner_acceptance_ref,
      ...(fields.transfer_strategy === "already-owned" ? [specs.already_owned_source_proof_ref] : [])];
    case "retire-incubation": return [specs.retirement_reason, specs.retention_plan_ref,
      specs.runtime_disposition_plan_ref];
    case "reopen-incubation": return [specs.prior_retirement_receipt_ref];
  }
}

export function initialClosureFields(action: PrototypeClosureAction): PrototypeClosureRequestFields {
  return action === "apply-delivery" ? { target_kind: "new-delivery-epic" } :
    action === "graduate-source" ? { transfer_strategy: "transfer" } : {};
}

const safeRef = /^[a-z][a-z0-9+.-]*:\/\/[A-Za-z0-9][A-Za-z0-9._~:/%+=-]*$/;

export function closureFieldsComplete(action: PrototypeClosureAction, fields: PrototypeClosureRequestFields) {
  return closureFieldsForAction(action, fields).every((spec) => {
    const value = fields[spec.key];
    return typeof value === "string" && value.trim().length > 0 && value.length <= 512 &&
      (spec.kind !== "ref" || safeRef.test(value));
  });
}
