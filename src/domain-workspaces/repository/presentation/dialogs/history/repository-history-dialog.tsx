"use client";

import { TerasActionButton, TerasLoadingState, TerasDialog, TerasContentRegion, TerasEmptyState,
  TerasMetadataList, TerasPanel, TerasPanelHeader, TerasStatusPill, TerasTechnicalDetails,
  TerasTimeline, TerasTimelineItem, TerasTrayStack, TerasZone, TerasZoneLayout } from "@/teras";
import type { RepositoryRuntimeReceipt } from "../../../local-runtime/repository-runtime.ts";
import type { RepositoryLifecycleAudit, RepositoryLifecycleLiveSnapshot } from "../../../live-runtime/repository-lifecycle-live-types.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import type { RepositoryProviderObservationSnapshot } from "../../../live-runtime/use-repository-provider-observations.ts";
import { repositoryProviderObservation } from "../../../live-runtime/repository-provider-observation.ts";
import { repositoryHistoryControlFacts, repositoryHistoryReceiptFacts, repositoryHistoryRecordFacts, repositoryHistoryTimelineRows } from "./repository-history-view-model.ts";
import { repositoryRecordStatusLabel, repositoryRecordTone } from "../../shared/repository-display-model.ts";
import {RepositoryPageControls, type RepositoryPageControl} from "../../shared/repository-page-controls.tsx";

export function RepositoryHistoryDialog({ lifecycleAudit, onClose, onRetry, onRetryProvider, refreshing = false, receipts, repository,
  providerRead, custodyResults = [], custodySourceStatus = "current", custodySourceError, lifecycleSnapshot, lifecycleError, liveMode = false,
  custodyRetryable = false, lifecycleFailure, historyPage,
}: {
  lifecycleAudit: RepositoryLifecycleAudit | null; onClose: () => void; onRetry?: () => void; onRetryProvider?: () => void; refreshing?: boolean;
  historyPage?: RepositoryPageControl;
  receipts: RepositoryRuntimeReceipt[]; repository: RepositoryWorkspaceRecord | null;
  providerRead?: RepositoryProviderObservationSnapshot;
  custodyResults?: RepositoryCustodyWorkflowResult[]; custodySourceStatus?: "loading" | "current" | "offline";
  custodySourceError?: string | null; lifecycleSnapshot?: RepositoryLifecycleLiveSnapshot; lifecycleError?: string; liveMode?: boolean;
  custodyRetryable?: boolean; lifecycleFailure?: { code: string; retryable: boolean };
}) {
  if (!repository) return null;
  const provider = repositoryProviderObservation(repository, lifecycleSnapshot, lifecycleError, refreshing, providerRead);
  // Retained matching receipts stay visible through a failed or pending read.
  // Never show another repository's audit as this repository's history.
  const identity = repository.providerIdentity;
  const audit = lifecycleAudit && identity && lifecycleAudit.repository_identity.provider === identity.provider &&
    lifecycleAudit.repository_identity.provider_repository_id === identity.repositoryId ? lifecycleAudit : null;
  const localReceipts = liveMode ? [] : receipts;
  const rows = repositoryHistoryTimelineRows(localReceipts, audit, custodyResults);
  const loading = liveMode && (refreshing || (!lifecycleSnapshot && !lifecycleError) || custodySourceStatus === "loading");
  const partial = liveMode && (Boolean(lifecycleError) || lifecycleSnapshot?.status === "offline" || custodySourceStatus === "offline" || Boolean(lifecycleAudit && !audit));
  const historyFailed = liveMode && (custodySourceStatus === "offline" || lifecycleFailure?.retryable || Boolean(lifecycleAudit && !audit));
  const canRetryHistory = (custodySourceStatus === "offline" && custodyRetryable) || lifecycleFailure?.retryable;
  const coverage = loading ? "Loading history" : partial ? "Partial history" : liveMode ? "Receipts loaded" : "Preview history";
  const coverageDetail = historyFailed ? "The History source is unavailable. Recorded references are retained separately."
    : partial
    ? "Some sources could not be confirmed. Previously recorded receipts remain visible; current status is shown separately."
    : loading ? "Reading the available history sources. Existing receipts remain visible."
    : "Recorded creation, linking and lifecycle actions. Receipt history does not establish the provider's current status.";
  const recordTone = repositoryRecordTone(repository);
  const providerNeedsSetup = ["repository_provider_not_configured", "repository_custody_authority_not_configured", "repository_custody_runtime_not_configured"].includes(providerRead?.code ?? "");
  const otherAccount = providerRead?.code === "repository_provider_owner_not_admitted";
  const lifecycleDisabled = lifecycleFailure?.code === "repository_lifecycle_runtime_not_configured";
  return <TerasDialog closeLabel="Close Repository history" description="Recorded actions and current repository observations, with their sources kept clear."
    kicker="Repository" title="Repository History" onClose={onClose} open contentOverflow="hidden" height="fill" width="large">
    <TerasZoneLayout variant="main-aside">
      <TerasZone fit="fill">
        <TerasPanel frame="padded" treatment="neutral" fit="content" spacing="normal">
          <TerasPanelHeader kicker="Repository" title={repository.name} description="Responsibilities and control boundaries from the loaded workspace record." />
          <TerasMetadataList items={repositoryHistoryControlFacts(repository)} topOffset="compact" />
        </TerasPanel>
        <TerasPanel frame="padded" treatment="neutral" fit="fill" layout="header-body" spacing="normal">
          <TerasPanelHeader kicker="Recorded activity" title="History" description={coverageDetail} actionsLayout="inline"
            actions={<><TerasStatusPill tone={partial ? "warn" : "info"}>{rows.length} {rows.length === 1 ? "receipt" : "receipts"} · {historyPage?.cursor ? "More available" : coverage}</TerasStatusPill>
              <RepositoryPageControls page={historyPage} label="receipts" compact /></>} />
          {loading ? <TerasLoadingState fill label="Reading repository history…" />
            : historyFailed ? <RepositoryReadFailure label="History could not be loaded"
              detail={canRetryHistory ? "The connection failed. Try loading this section again." : "The history response could not be verified. Its source needs attention before it can be shown."}
              onRetry={canRetryHistory ? onRetry : undefined} /> : rows.length ? <TerasContentRegion scroll>
            <TerasTimeline ariaLabel="Repository receipt timeline">{rows.map(row => <TerasTimelineItem key={row.id} detail={row.detail}
              displayTimestamp={row.timestamp} label={row.label} status={row.status} timestamp={row.timestamp} tone={row.tone} />)}</TerasTimeline>
          </TerasContentRegion> : <TerasEmptyState fill>{partial ? "Some history is unavailable. No receipts are loaded from the remaining sources." : "No recorded actions were returned by the loaded sources."}</TerasEmptyState>}
        </TerasPanel>
      </TerasZone>
      <TerasZone fit="fill"><TerasContentRegion fill scroll><TerasTrayStack spacing="normal">
        <TerasPanel frame="padded" treatment="state" fit="content" spacing="normal" tone={recordTone}>
          <TerasPanelHeader kicker="Workspace record" title="Registration" description="Workspace registration and provider archiving are independent."
            actionsLayout="inline" actions={<TerasStatusPill tone={recordTone}>{repositoryRecordStatusLabel(repository)}</TerasStatusPill>} />
          <TerasMetadataList items={repositoryHistoryRecordFacts(repository)} topOffset="compact" />
        </TerasPanel>
        <TerasPanel frame="padded" treatment="state" fit="content" spacing="normal" tone={provider.tone}>
          <TerasPanelHeader kicker="Provider observation" title="GitHub status" description={provider.current ? provider.detail : undefined} actionsLayout="inline"
            actions={<TerasStatusPill tone={provider.tone}>{provider.label}</TerasStatusPill>} />
          {providerRead?.loading ? <TerasLoadingState fill label="Reading GitHub status…" />
            : providerRead?.error ? <RepositoryReadFailure label={otherAccount ? "Different GitHub account" : providerNeedsSetup ? "GitHub connection needs setup" : "GitHub status could not be loaded"}
              detail={otherAccount ? "This repository is outside the connected GitHub account. Access to its GitHub account must be configured." : providerRead.retryable ? "The connection failed. Try loading this section again." : providerNeedsSetup ? "The repository reader is not ready. Connection setup must be completed before status can load." : "The response could not be verified. The reader's access or returned repository identity needs attention."}
              onRetry={providerRead.retryable ? onRetryProvider : undefined} />
            : <TerasMetadataList topOffset="compact" items={[
              ...(provider.observedAt ? [{ label: "Observed at", value: provider.observedAt }] : []),
              { label: "Source", value: provider.current ? "GitHub via repository service" : "Not checked" },
            ]} />}
        </TerasPanel>
        <TerasPanel frame="padded" treatment="neutral" fit="content" spacing="normal">
          <TerasPanelHeader kicker="Evidence" title="Receipt references" description="Original references remain available for inspection." />
          <TerasMetadataList topOffset="compact" items={[
            { label: "Lifecycle record", value: lifecycleDisabled ? "Not enabled for this installation" : provider.recordedProvider ?? provider.lifecycleReadState },
            ...(provider.recordedAt ? [{ label: "State recorded at", value: provider.recordedAt }] : []),
          ]} />
          <TerasTechnicalDetails summary="Technical details" items={[
            { label: "Workspace record", value: repository.id }, { label: "Record source", value: repository.routeSource },
            { label: "Record check", value: repository.lastValidation },
            ...(providerRead?.error ? [{ label: "Provider lookup", value: providerRead.error }] : []),
            ...(provider.retained ? [{ label: "Earlier GitHub observation", value: `${provider.retained} · ${provider.observedAt} (retained)` }] : []),
            ...repositoryHistoryReceiptFacts(localReceipts, audit, custodyResults, !liveMode),
            ...(custodySourceError ? [{ label: "Receipt read", value: custodySourceError }] : []),
            ...(lifecycleError ? [{ label: "Lifecycle read", value: lifecycleError }] : []),
          ]} />
        </TerasPanel>
      </TerasTrayStack></TerasContentRegion></TerasZone>
    </TerasZoneLayout>
  </TerasDialog>;
}

function RepositoryReadFailure({ label, detail, onRetry }: { label: string; detail: string; onRetry?: () => void }) {
  return <TerasEmptyState fill><TerasTrayStack spacing="compact" role="status">
    <strong>{label}</strong><span>{detail}</span>
    {onRetry ? <div><TerasActionButton emphasis="secondary" onClick={onRetry}>Retry</TerasActionButton></div> : null}
  </TerasTrayStack></TerasEmptyState>;
}
