"use client";

import {
  TerasActionButton,
  TerasFieldGrid,
  TerasFieldStack,
  TerasContentTray,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasTextField,
} from "@/teras";

import type { RepositoryRequestDraft } from "../../../work-model/request/repository-request-model.ts";
import { repositoryRequestBoundaryMetadata } from "./repository-request-view-model.ts";

export function RepositoryRequestDialog({
  canSubmit,
  draft,
  onClose,
  onSubmit,
  onUpdateDraft,
  open,
}: {
  canSubmit: boolean;
  draft: RepositoryRequestDraft;
  onClose: () => void;
  onSubmit: () => void;
  onUpdateDraft: (field: keyof RepositoryRequestDraft, value: string) => void;
  open: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Prototype-local request draft for preparing a proposed repository record."
      footer={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
          <TerasActionButton
            data-repository-request-submit="true"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            Submit Request
          </TerasActionButton>
        </>
      }
      kicker="Repository Request"
      onClose={onClose}
      surfaceId="repository-request"
      title="Repository Request Draft"
    >
      <TerasFieldStack data-repository-request-draft="true" spacing="loose">
        <TerasTextField
          aria-label="Repository name"
          label="Repository name"
          onValueChange={(value) => onUpdateDraft("name", value)}
          placeholder="workspace-client-dashboard"
          value={draft.name}
        />
        <TerasFieldGrid spacing="loose">
          <TerasTextField
            aria-label="Owner domain"
            label="Owner domain"
            onValueChange={(value) => onUpdateDraft("ownerDomain", value)}
            placeholder="Prototype Studio"
            value={draft.ownerDomain}
          />
          <TerasTextField
            aria-label="Repository class"
            label="Repository class"
            onValueChange={(value) => onUpdateDraft("repoClass", value)}
            placeholder="prototype"
            value={draft.repoClass}
          />
        </TerasFieldGrid>
        <TerasNoteField
          aria-label="Repository purpose and boundary"
          label="Purpose and boundary"
          onValueChange={(value) => onUpdateDraft("purpose", value)}
          placeholder="Describe the repository purpose, owner boundary, visibility posture, runtime lane expectation, and why this needs its own repository."
          value={draft.purpose}
        />
        <TerasMetadataList items={repositoryRequestBoundaryMetadata()} />
        <TerasContentTray
          description="Submit creates a prototype-local proposed repository record in this control surface. It does not create a GitHub repository, update workspace-governance contracts, or call OOS/WGCF."
          kicker="Request Boundary"
        />
      </TerasFieldStack>
    </TerasModalShell>
  );
}
