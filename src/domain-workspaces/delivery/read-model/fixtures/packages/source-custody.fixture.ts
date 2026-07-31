import type { OperationResolvedSourceCustody } from "../../../../operation-projections/index.ts";

import { deliveryIntakeSourceFixtures } from "../intake-sources/intake-sources.fixture.ts";
import type {
  DeliveryPackageFixture,
  DeliveryPackageSummary,
} from "../../../domain/delivery-types.ts";

const intakeSourceCustodyBySourceRef = new Map(
  deliveryIntakeSourceFixtures.map((source) => [
    `Proposal ${source.source_ref}`,
    source.source_custody,
  ]),
);

const explicitSourceCustodyByLegacyEpicId: Record<
  number,
  OperationResolvedSourceCustody
> = {
  87: existingRepo(
    "security-architecture",
    "Security baseline review is owned by the security architecture source boundary.",
  ),
  251: existingRepo(
    "operator-orchestration-service",
    "AI-assist workflow changes are owned by the operator orchestration service.",
  ),
  540: nonSourceWork(
    "Workspace Delivery ART",
    "Closeout work records delivery posture rather than changing product source.",
  ),
  681: existingRepo(
    "operator-orchestration-service",
    "Broker apply controls are implemented in the operator orchestration service.",
  ),
  698: existingRepo(
    "workspace-governance-control-fabric",
    "Governed AI control-plane delivery is owned by the control-fabric repo.",
  ),
  712: existingRepo(
    "context-governance-gateway",
    "Context admission work design targets the context governance gateway.",
  ),
  714: existingRepo(
    "operator-orchestration-service",
    "Broker draft validation is owned by the operator orchestration service.",
  ),
  812: newRepoRequired(
    "client-insight-delivery",
    "repo://client-insight-delivery",
    "Repository admission resolved the source home, but the operator still needs to add, link, and sync the Owner Repo value through Delivery Catalog before Execution can apply it.",
  ),
  724: existingRepo(
    "workspace-governance-control-fabric",
    "Control Fabric ART design targets the control-fabric owner repo.",
  ),
  732: existingRepo(
    "workspace-prototype-studio",
    "Delivery console workflow recovery fixtures live in Workspace Prototype Studio.",
  ),
  733: existingRepo(
    "workspace-prototype-studio",
    "Delivery console snapshot recovery fixtures live in Workspace Prototype Studio.",
  ),
  734: existingRepo(
    "workspace-prototype-studio",
    "Delivery console apply-reconcile fixtures live in Workspace Prototype Studio.",
  ),
  735: existingRepo(
    "workspace-prototype-studio",
    "Delivery console apply sequence fixtures live in Workspace Prototype Studio.",
  ),
  739: existingRepo(
    "context-governance-gateway",
    "Context Gateway linked-work delivery targets the existing gateway repo.",
  ),
  746: nonSourceWork(
    "Workspace Delivery ART",
    "Duplicate retirement is a delivery record decision, not a source change.",
  ),
  748: existingRepo(
    "workspace-prototype-studio",
    "Workspace diagram review fixtures live in Workspace Prototype Studio.",
  ),
  753: existingRepo(
    "workspace-governance-control-fabric",
    "Receipt projection repair is owned by the control-fabric repo.",
  ),
  756: existingRepo(
    "workspace-prototype-studio",
    "Complex package review fixtures live in Workspace Prototype Studio.",
  ),
  757: existingRepo(
    "workspace-prototype-studio",
    "Ambiguous sketch context fixtures live in Workspace Prototype Studio.",
  ),
  758: existingRepo(
    "workspace-prototype-studio",
    "Scattered shape context fixtures live in Workspace Prototype Studio.",
  ),
  760: existingRepo(
    "operator-orchestration-service",
    "Adapter contract metadata repair targets the operator orchestration service.",
  ),
  766: existingRepo(
    "workspace-governance-control-fabric",
    "WGCF receipt refinement is owned by the control-fabric repo.",
  ),
  771: existingRepo(
    "security-architecture",
    "Security boundary metadata work is owned by the security architecture repo.",
  ),
  778: existingRepo(
    "workspace-governance",
    "Repository onboarding metadata is owned by workspace governance.",
  ),
  789: existingRepo(
    "operator-orchestration-service",
    "Operator workflow metadata is owned by the operator orchestration service.",
  ),
  900: existingRepo(
    "workspace-prototype-studio",
    "Large tree migration probe fixtures live in Workspace Prototype Studio.",
  ),
};

export function attachSourceCustodyToDeliveryPackages(
  packages: DeliveryPackageFixture[],
): DeliveryPackageSummary[] {
  return packages.map((deliveryPackage) => ({
    ...deliveryPackage,
    source_custody: projectDeliveryPackageSourceCustody(deliveryPackage),
  }));
}

function projectDeliveryPackageSourceCustody(
  deliveryPackage: DeliveryPackageFixture,
): OperationResolvedSourceCustody {
  const intakeCustody = intakeSourceCustodyBySourceRef.get(
    deliveryPackage.source_ref,
  );

  if (intakeCustody) {
    return cloneSourceCustody(intakeCustody);
  }

  return cloneSourceCustody(
    explicitSourceCustodyByLegacyEpicId[deliveryPackage.legacy_epic_id] ??
      existingRepo(
        "workspace-prototype-studio",
        "Prototype fixture source custody falls back to Workspace Prototype Studio until backend projection provides owner truth.",
      ),
  );
}

function existingRepo(
  owner: string,
  rationale: string,
): OperationResolvedSourceCustody {
  return {
    classification: "existing-repo",
    owner,
    rationale,
    repo_ref: `repo://${owner}`,
    repository_gate_state: "resolved",
  };
}

function nonSourceWork(
  owner: string,
  rationale: string,
): OperationResolvedSourceCustody {
  return {
    classification: "non-source-work",
    owner,
    rationale,
    repo_ref: null,
    repository_gate_state: "not-required",
  };
}

function newRepoRequired(
  owner: string,
  repoRef: string,
  rationale: string,
): OperationResolvedSourceCustody {
  return {
    classification: "new-repo-required",
    owner,
    rationale,
    repo_ref: repoRef,
    repository_gate_state: "resolved",
  };
}

function cloneSourceCustody(
  sourceCustody: OperationResolvedSourceCustody,
): OperationResolvedSourceCustody {
  return { ...sourceCustody };
}
