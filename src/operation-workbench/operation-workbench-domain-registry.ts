export const operationWorkbenchDomainRegistry = [
  { domain: "proposal", label: "PROPOSAL" },
  { domain: "repository", label: "REPOSITORY" },
  { domain: "model-operations", label: "MODEL" },
  { domain: "delivery", label: "DELIVERY" },
  { domain: "prototype", label: "PROTOTYPE" },
  { domain: "portfolio", label: "PORTFOLIO" },
  { domain: "orchestration", label: "ORCHESTRATION" },
] as const;

export type OperationWorkbenchDomainEntry =
  (typeof operationWorkbenchDomainRegistry)[number];
export type OperationWorkbenchDomainId = OperationWorkbenchDomainEntry["domain"];
export type OperationWorkbenchPathLabel = OperationWorkbenchDomainEntry["label"];

export const operationWorkbenchDomainIds = operationWorkbenchDomainRegistry.map(
  ({ domain }) => domain,
);

export const operationWorkbenchPathLabels = {
  delivery: "DELIVERY",
  modelOperations: "MODEL",
  orchestration: "ORCHESTRATION",
  portfolio: "PORTFOLIO",
  proposal: "PROPOSAL",
  prototype: "PROTOTYPE",
  repository: "REPOSITORY",
} as const satisfies Record<string, OperationWorkbenchPathLabel>;

export function getOperationWorkbenchDomainId(
  label: OperationWorkbenchPathLabel,
): OperationWorkbenchDomainId {
  const entry = operationWorkbenchDomainRegistry.find(
    (candidate) => candidate.label === label,
  );

  if (!entry) {
    throw new Error(`Unknown Operation Workbench path label: ${label}`);
  }

  return entry.domain;
}
