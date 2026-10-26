// Console-local projection of facts already published by a native owner.
// This is not a journal command, approval, fabricated receipt or new workflow.
export type NativeLifecycleOutcome = Readonly<{
  id: string;
  routeId: "proposal-to-prototype" | "proposal-to-delivery" | "prototype-to-delivery";
  sourceId: string;
  sourceVersion: string;
  title: string;
  owner: string;
  sourceRef: string;
  targetRef: string | null;
  receiptRef: string | null;
  recordedAt: string;
  observationKind: "source-acknowledgement" | "owner-confirmation";
  evidenceRefs: readonly string[];
  detail: string;
}>;
