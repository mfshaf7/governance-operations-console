"use client";

import { useState } from "react";

import { operationEvidenceDetail } from "@/domain-workspaces/operation-projections";

import {
  TerasStatusItem,
  TerasList,
  TerasDetailGrid,
  TerasHighlightPanel,
  TerasDialog,
  TerasActionButton,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasReadoutField,
  TerasTrayStack,
} from "@/teras";

import type { ProposalWorkspaceScenario } from "../../../read-model/proposal-workspace-read-model.ts";
import {
  proposalEvidenceStatusLabel,
  proposalEvidenceTone,
  proposalRecordReferenceMetadata,
  proposalRecordSourceMetadata,
  proposalRepositoryGateMetadata,
  proposalRouteContextMetadata,
} from "./proposal-detail-view-model.ts";
import {
  proposalRepoGateLabel,
  proposalRepoGateTitle,
  proposalRepoGateTone,
  proposalStatusPillLabel,
} from "../../shared/proposal-display-model.ts";

export function ProposalDetailModal({
  onClose,
  proposal,
}: {
  onClose: () => void;
  proposal: ProposalWorkspaceScenario | null;
}) {
  const [referencesOpen, setReferencesOpen] = useState(false);

  if (!proposal) {
    return null;
  }

  const repoGateTone = proposalRepoGateTone(proposal);

  function closeProposalRecord() {
    setReferencesOpen(false);
    onClose();
  }

  return (
    <>
      <TerasDialog
        contentOverflow="auto"
        height="content"
        width="wide"
        actions={
          <TerasActionButton
            onClick={() => setReferencesOpen(true)}
            emphasis="secondary"
          >
            View Record References
          </TerasActionButton>
        }
        closeLabel="Close proposal record"
        description="Inspect source, route, evidence, and repository-gate context."
        kicker="Proposal Record"
        onClose={closeProposalRecord}
        open={Boolean(proposal)}
        title="Proposal Record"
      >
        <TerasDetailGrid
          data-proposal-detail-modal="true"
          scrollGutter
          variant="balanced"
        >
          <TerasTrayStack align="start" spacing="loose">
            <TerasHighlightPanel>
              <TerasTrayStack spacing="comfortable">
                <TerasPanelHeader
                  description="Proposal identity, ingress, and latest backend record state."
                  kicker="Source Record"
                  statusLabel={proposalStatusPillLabel(proposal)}
                  statusTone={proposal.tone}
                  title={proposal.title}
                />
                <TerasMetadataList
                  items={proposalRecordSourceMetadata(proposal)}
                  shape="line"
                  treatment="chip"
                  wrap
                />
                <TerasReadoutField
                  label="Source Preview"
                  scrollHeight="tall"
                  treatment="quote"
                  value={proposal.bodyPreview}
                />
              </TerasTrayStack>
            </TerasHighlightPanel>

            <TerasPanel
              frame="padded"
              treatment="neutral"
              overflow="hidden"
              spacing="normal"
            >
              <TerasPanelHeader
                description="Signals used to explain why this proposal is ready, waiting, blocked, or reference-only."
                kicker="Evidence Signals"
                statusLabel={`${proposal.evidence.length} Signals`}
                statusTone="muted"
                title="Evidence"
              />
              <TerasList data-proposal-detail-evidence="true">
                {proposal.evidence.map((evidence, index) => (
                  <TerasStatusItem
                    tone={proposalEvidenceTone(evidence.state)}
                    detail={operationEvidenceDetail(evidence)}
                    index={`${index + 1}`.padStart(2, "0")}
                    key={evidence.id}
                    label={evidence.label}
                    status={proposalEvidenceStatusLabel(evidence.state)}
                  />
                ))}
              </TerasList>
            </TerasPanel>
          </TerasTrayStack>

          <TerasTrayStack align="start" spacing="loose">
            <TerasPanel frame="padded" treatment="neutral" spacing="normal">
              <TerasPanelHeader
                description="Current route target and handoff rule for this proposal."
                kicker="Route Context"
                title={proposal.routeTarget}
              />
              <TerasMetadataList
                items={proposalRouteContextMetadata(proposal)}
              />
              <TerasReadoutField
                label="Handoff Rule"
                scrollHeight="short"
                value={proposal.handoffRule}
              />
            </TerasPanel>

            <TerasPanel
              frame="padded"
              treatment="rail"
              spacing="normal"
              tone={repoGateTone}
            >
              <TerasPanelHeader
                description="Repository requirement and gate state that must be clear before handoff completes."
                kicker="Repository Gate"
                statusLabel={proposalRepoGateLabel(proposal)}
                statusTone={repoGateTone}
                title={proposalRepoGateTitle(proposal)}
              />
              <TerasMetadataList
                items={proposalRepositoryGateMetadata(proposal)}
              />
              <TerasReadoutField
                label="Gate Detail"
                scrollHeight="short"
                value={proposal.repoGate.detail}
              />
            </TerasPanel>
          </TerasTrayStack>
        </TerasDetailGrid>
      </TerasDialog>

      <ProposalRecordReferencesDialog
        onClose={() => setReferencesOpen(false)}
        open={referencesOpen}
        proposal={proposal}
      />
    </>
  );
}

function ProposalRecordReferencesDialog({
  onClose,
  open,
  proposal,
}: {
  onClose: () => void;
  open: boolean;
  proposal: ProposalWorkspaceScenario;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      closeLabel={`Close ${proposal.id} proposal record references`}
      description="Reference-only record fields that are not repeated in the proposal brief."
      kicker="Proposal Record References"
      onClose={onClose}
      open={open}
      title="Record References"
    >
      <TerasMetadataList items={proposalRecordReferenceMetadata(proposal)} />
    </TerasDialog>
  );
}
