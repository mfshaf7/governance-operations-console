import {
  readRepoFile,
  repoPathExists,
} from "../guard-lib.mjs";

const operationWorkbenchContract =
  "docs/product/operation-workbench-contract.md";

const requiredTerms = [
  "### Local Baseline Authority And Artifact Model",
  "authorize live wiring",
  "Do not implement a generic mutable `local overlay` record",
  "### Multi-Source Projection And Preconditions Rule",
  "### Domain State Machine Rule",
  "current state + command + preconditions -> accepted transition or rejection",
  "### Capability And Action Semantics Rule",
  "prototype-local simulation",
  "### Cross-Domain Packet And Custody Rule",
  "The producer prepares and dispatches a packet; it does not mutate the consumer's",
  "### Post-Baseline Live Runtime Authority Rule",
  "### Schema, Identity, Ordering, And Local Retention Rule",
  "a receipt is immutable action evidence",
  "rollback returns the domain to prototype-local or read-only mode",
];

export const guard = {
  id: "shared/operation-authority-contract",
  run() {
    if (!repoPathExists(operationWorkbenchContract)) {
      return [`${operationWorkbenchContract}: missing operation contract`];
    }

    const source = readRepoFile(operationWorkbenchContract);

    return requiredTerms.flatMap((term) =>
      source.includes(term)
        ? []
        : [`${operationWorkbenchContract}: missing authority contract token "${term}"`],
    );
  },
};

export default guard;
