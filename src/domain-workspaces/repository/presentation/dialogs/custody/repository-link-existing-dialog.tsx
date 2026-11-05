"use client";

import { useCallback, useState } from "react";
import { TerasActionButton, TerasContentTray, TerasDraftCloseGuardDialog, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasTechnicalDetails } from "@/teras";
import type { RepositoryCustodyLinkIntent, RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import { RepositoryRequestAttachment } from "../gate-resolution/repository-request-attachment.tsx";
import type {RepositoryProviderLookup} from "../../../live-runtime/repository-provider-lookup.ts";

export function RepositoryLinkExistingDialog({ enabled, executionAvailable, results, onLink, onOpenRepository, onContinueOnboarding, onClose, onFindByProvider, preview = false, previewLookup }: {
  enabled: boolean;
  executionAvailable: boolean;
  results: RepositoryCustodyWorkflowResult[];
  onLink: (intent: RepositoryCustodyLinkIntent) => Promise<RepositoryCustodyWorkflowResult>;
  onOpenRepository: (result: RepositoryCustodyWorkflowResult) => void;
  onContinueOnboarding?: (result: RepositoryCustodyWorkflowResult) => void;
  onClose: () => void;
  onFindByProvider?: (providerId: string) => Promise<RepositoryCustodyWorkflowResult[]>;
  preview?: boolean; previewLookup?: RepositoryProviderLookup;
}) {
  const [dirty, setDirty] = useState(false), [pending, setPending] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [result, setResult] = useState<RepositoryCustodyWorkflowResult | null>(null);
  const linked = useCallback((_notes: string, outcome: RepositoryCustodyWorkflowResult) => setResult(outcome), []);
  function requestClose() {
    if (pending) return;
    if (dirty && !result) setLeaveOpen(true);
    else onClose();
  }
  return <><TerasModalShell kicker="Repository" title="Link existing repository"
    description="Bring a repository that already exists on GitHub into Repository Control. Review the verified details before approving the link."
    busy={pending} busyLabel="Checking or linking the repository…" bodyLayout="scroll" height="content" width="standard"
    surfaceId="repository-link-existing" onClose={requestClose}
    footer={<>
      <TerasActionButton emphasis="secondary" disabled={pending} onClick={requestClose}>Back to Repository</TerasActionButton>
      {result && onContinueOnboarding ? <TerasActionButton onClick={() => onContinueOnboarding(result)}>Continue onboarding in Registry</TerasActionButton> : null}
      {result ? <TerasActionButton emphasis="secondary" onClick={() => onOpenRepository(result)}>Open repository</TerasActionButton> : null}
    </>}>
    <TerasFieldStack spacing="loose">
      {result ? <TerasContentTray kicker="Link completed" title="Repository linked"
        description="The verified repository is now available in Repository Control. Workspace registration is a separate review; linking does not change its files or visibility.">
        <TerasMetadataList items={[
          { label: "GitHub repository", value: result.provider_readback?.canonical_url ?? result.request.target.name },
          { label: "Workspace repository", value: result.request.requested_custody.workspace_owner_ref },
        ]} />
        <TerasTechnicalDetails items={[
          { label: "Request ID", value: result.request.request_id },
          { label: "Receipt", value: result.receipt?.receipt_id ?? "Unavailable" },
        ]} />
      </TerasContentTray> : <RepositoryRequestAttachment enabled={enabled} attachmentAvailable={executionAvailable}
        results={results} preview={preview} previewLookup={previewLookup} onFindByProvider={onFindByProvider} onAttach={onLink} onDirtyChange={setDirty} onBusyChange={setPending}
        onAttached={linked} onOpenExisting={onOpenRepository} />}
    </TerasFieldStack>
  </TerasModalShell><TerasDraftCloseGuardDialog open={leaveOpen} kicker="Unsaved changes" title="Discard repository link draft?"
    description="The details entered here will be discarded. Any request already recorded by the service stays in repository history."
    leaveLabel="Discard Draft" onKeepEditing={() => setLeaveOpen(false)} onLeave={onClose} /></>;
}
