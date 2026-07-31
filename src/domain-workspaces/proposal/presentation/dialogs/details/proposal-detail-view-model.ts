import type { TerasMetadataItem } from "@/teras";
import {
  operationEvidenceStateLabel,
  operationEvidenceStateTone,
  type OperationEvidenceState,
} from "@/domain-workspaces/operation-projections";

import type { ProposalWorkspaceScenario } from "../../../read-model/proposal-workspace-read-model.ts";
import {
  proposalIngressLabel,
  proposalScenarioStatusLabel,
} from "../../shared/proposal-display-model.ts";

export function proposalEvidenceStatusLabel(state: OperationEvidenceState) {
  return operationEvidenceStateLabel(state);
}

export function proposalEvidenceTone(state: OperationEvidenceState) {
  return operationEvidenceStateTone(state);
}

export function proposalRecordSourceMetadata(
  proposal: ProposalWorkspaceScenario,
): TerasMetadataItem[] {
  return [
    { label: "Proposal", value: proposal.id },
    { label: "Ingress", value: proposalIngressLabel(proposal.ingress) },
    { label: "Version", value: proposal.recordVersion },
    { label: "Read State", value: proposal.projectionState },
    { label: "Updated", value: proposal.lastProjectionUpdate },
    {
      label: "State",
      value: proposalScenarioStatusLabel(proposal.status),
    },
  ];
}

export function proposalRouteContextMetadata(
  proposal: ProposalWorkspaceScenario,
): TerasMetadataItem[] {
  return [
    { label: "Route Owner", value: proposal.owner },
    {
      label: "Current State",
      value: proposalScenarioStatusLabel(proposal.status),
    },
  ];
}

export function proposalRepositoryGateMetadata(
  proposal: ProposalWorkspaceScenario,
): TerasMetadataItem[] {
  return [
    { label: "Mode", value: proposal.repoGate.mode },
    { label: "State", value: proposal.repoGate.state },
    {
      label: "Owner",
      value: proposal.repoGate.owner ?? "Not required",
    },
    {
      label: "Repository Ref",
      value: proposal.repoGate.ref ?? "Not required",
    },
  ];
}

export function proposalRecordReferenceMetadata(
  proposal: ProposalWorkspaceScenario,
): TerasMetadataItem[] {
  return [
    { label: "Record Ref", value: proposal.backendRecordId },
    { label: "Record Version", value: proposal.recordVersion },
    { label: "Read State", value: proposal.projectionState },
    { label: "Updated", value: proposal.lastProjectionUpdate },
    {
      label: "Repository Ref",
      value: proposal.repoGate.ref ?? "Not required",
    },
  ];
}
