import type { PrototypeRecord } from "../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypeClosureAction,
  PrototypeClosurePreparation,
  PrototypeClosureRequestFields,
  PrototypeClosureResult,
} from "../../live-runtime/prototype-closure-live-types.ts";
import type { PrototypeClosureClientError } from "../../live-runtime/use-prototype-closure-live-runtime.ts";

export type PrototypeClosureViewState = Readonly<{
  preparation: PrototypeClosurePreparation | null;
  result: PrototypeClosureResult | null;
  error: PrototypeClosureClientError | null;
  pending: boolean;
}>;

export type PrototypeClosureViewActions = Readonly<{
  load: (record: PrototypeRecord) => Promise<PrototypeClosurePreparation>;
  submit: (record: PrototypeRecord, action: PrototypeClosureAction,
    fields: PrototypeClosureRequestFields, preparation: PrototypeClosurePreparation) => Promise<PrototypeClosureResult>;
  read: (record: PrototypeRecord, requestId: string) => Promise<PrototypeClosureResult>;
  inspect: (requestId: string) => Promise<PrototypeClosureResult>;
  command: (record: PrototypeRecord, requestId: string,
    action: "continue" | "cancel" | "approve" | "deny") => Promise<PrototypeClosureResult>;
}>;

export function prototypeClosureAuthorityFact(result: PrototypeClosureResult) {
  switch (result.action) {
    case "apply-delivery": return {
      label: "Delivery target", value: result.resolved_authority?.target_delivery_ref ?? "Awaiting owner verification",
    };
    case "graduate-source": return {
      label: "Durable repository", value: result.resolved_authority?.durable_repo_ref ?? "Awaiting owner verification",
    };
    case "retire-incubation": return {
      label: "Runtime cleanup", value: result.resolved_authority?.runtime_disposition_proof_ref ?? "Awaiting Platform proof",
    };
    case "reopen-incubation": return {
      label: "Retirement event", value: result.resolved_authority?.prior_retirement_event_ref ?? "Awaiting source verification",
    };
  }
}
