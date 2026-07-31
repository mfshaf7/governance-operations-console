"use client";

import {
  DeliveryWorkspace,
  getDeliveryOperationWorkbenchContract,
} from "../domain-workspaces/delivery";
import {
  ModelOperationsWorkspace,
  getModelOperationsOperationWorkbenchContract,
} from "../domain-workspaces/model-operations";
import {
  OrchestrationWorkspace,
  getOrchestrationOperationWorkbenchContract,
} from "../domain-workspaces/orchestration";
import {
  PortfolioWorkspace,
  getPortfolioOperationWorkbenchContract,
} from "../domain-workspaces/portfolio";
import {
  ProposalWorkspace,
  getProposalOperationWorkbenchContract,
} from "../domain-workspaces/proposal";
import {
  PrototypeWorkspace,
  getPrototypeOperationWorkbenchContract,
} from "../domain-workspaces/prototype";
import {
  RepositoryWorkspace,
  getRepositoryOperationWorkbenchContract,
} from "../domain-workspaces/repository";
import type { ConsoleSurfaceEntryIntent } from "../console-architecture";
import type { OperationWorkbenchSelectorEntry } from "./operation-workbench-selector-model";
import { OperationWorkbench } from "./operation-workbench";

function assertUnreachableOperationWorkbenchDomain(domain: never): never {
  throw new Error(`Unhandled Operation Workbench domain: ${domain}`);
}

export function OperationWorkbenchHost({
  entryIntent,
  onClose,
  onOpenRepositorySurface,
  selected,
}: {
  entryIntent: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
  onOpenRepositorySurface: (proposalId: string) => void;
  selected: OperationWorkbenchSelectorEntry;
}) {
  const domain = selected.domain;

  switch (domain) {
    case "proposal": {
      const contract = getProposalOperationWorkbenchContract();

      return (
        <OperationWorkbench contract={contract}>
          <ProposalWorkspace
            contract={contract}
            entryIntent={entryIntent}
            onClose={onClose}
            onOpenRepositorySurface={onOpenRepositorySurface}
          />
        </OperationWorkbench>
      );
    }
    case "repository": {
      const contract = getRepositoryOperationWorkbenchContract();

      return (
        <OperationWorkbench contract={contract}>
          <RepositoryWorkspace
            contract={contract}
            entryIntent={entryIntent}
            onClose={onClose}
          />
        </OperationWorkbench>
      );
    }
    case "model-operations": {
      const contract = getModelOperationsOperationWorkbenchContract();

      return (
        <OperationWorkbench contract={contract}>
          <ModelOperationsWorkspace contract={contract} onClose={onClose} />
        </OperationWorkbench>
      );
    }
    case "delivery": {
      const contract = getDeliveryOperationWorkbenchContract();

      return (
        <OperationWorkbench contract={contract}>
          <DeliveryWorkspace
            contract={contract}
            entryIntent={entryIntent}
            onClose={onClose}
          />
        </OperationWorkbench>
      );
    }
    case "prototype": {
      const contract = getPrototypeOperationWorkbenchContract();

      return (
        <OperationWorkbench contract={contract}>
          <PrototypeWorkspace
            contract={contract}
            entryIntent={entryIntent}
            onClose={onClose}
          />
        </OperationWorkbench>
      );
    }
    case "portfolio": {
      const contract = getPortfolioOperationWorkbenchContract();

      return (
        <OperationWorkbench contract={contract}>
          <PortfolioWorkspace
            contract={contract}
            entryIntent={entryIntent}
            onClose={onClose}
          />
        </OperationWorkbench>
      );
    }
    case "orchestration": {
      const contract = getOrchestrationOperationWorkbenchContract();

      return (
        <OperationWorkbench contract={contract}>
          <OrchestrationWorkspace
            contract={contract}
            entryIntent={entryIntent}
            onClose={onClose}
          />
        </OperationWorkbench>
      );
    }
  }

  return assertUnreachableOperationWorkbenchDomain(domain);
}
