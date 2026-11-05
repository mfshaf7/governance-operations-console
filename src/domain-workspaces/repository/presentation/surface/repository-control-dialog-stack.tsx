import { TerasDraftCloseGuardDialog } from "@/teras";

import { RepositoryAdmissionDialog } from "../dialogs/admission/repository-admission-dialog.tsx";
import { RepositoryOwnerBootstrapDialog } from "../dialogs/admission/repository-owner-bootstrap-dialog.tsx";
import { RepositoryCustodyDialog } from "../dialogs/custody/repository-custody-dialog.tsx";
import { RepositoryLinkExistingDialog } from "../dialogs/custody/repository-link-existing-dialog.tsx";
import { RepositoryDetailDialog } from "../dialogs/details/repository-detail-dialog.tsx";
import { RepositoryGateResolutionDialog } from "../dialogs/gate-resolution/repository-gate-resolution-dialog.tsx";
import { RepositoryHistoryDialog } from "../dialogs/history/repository-history-dialog.tsx";
import { RepositoryLifecycleDialog } from "../dialogs/lifecycle/repository-lifecycle-dialog.tsx";
import { RepositoryRequestDialog } from "../dialogs/request/repository-request-dialog.tsx";
import type { RepositoryControlController } from "./use-repository-control-controller.ts";

export function RepositoryControlDialogStack({
  controller,
}: {
  controller: RepositoryControlController;
}) {
  return (
    <>
      {controller.standaloneLink.open ? <RepositoryLinkExistingDialog enabled={controller.standaloneLink.enabled} executionAvailable={controller.standaloneLink.executionAvailable}
        preview={controller.standaloneLink.preview} previewLookup={controller.standaloneLink.previewLookup}
        onContinueOnboarding={controller.standaloneLink.continueOnboarding}
        onFindByProvider={controller.standaloneLink.findByProvider}
        results={controller.standaloneLink.results} onLink={controller.standaloneLink.link}
        onOpenRepository={controller.standaloneLink.openRepository} onClose={controller.standaloneLink.close} /> : null}
      {controller.verification.open ? <RepositoryOwnerBootstrapDialog ownerRepo={controller.verification.ownerRepo} custodyRequestId={controller.verification.custodyRequestId} operation="configure-verification" onClose={controller.verification.close} /> : null}
      <RepositoryRequestDialog
        onContinueOnboarding={controller.request.continueOnboarding}
        canSubmit={controller.request.canSubmit}
        historyPage={controller.request.historyPage}
        preview={controller.request.preview}
        proposalId={controller.request.proposalId}
        proposalTitle={controller.request.proposalTitle}
        correction={controller.request.correction}
        resume={controller.request.resume}
        retainedRequests={controller.request.retainedRequests}
        selectedRequestId={controller.request.selectedRequestId}
        onSelectRetained={controller.request.onSelectRetained}
        draft={controller.request.draft}
        connections={controller.request.connections}
        connectionsLoading={controller.request.connectionsLoading}
        connectionsError={controller.request.connectionsError}
        onRetryConnections={controller.request.onRetryConnections}
        error={controller.request.error}
        onClose={controller.request.close}
        onSubmit={controller.request.onSubmit}
        onUpdateDraft={controller.request.onUpdateDraft}
        open={controller.request.open}
        pending={controller.request.pending}
        result={controller.request.result}
      />

      <TerasDraftCloseGuardDialog
        description={controller.request.guardDescription}
        kicker="Unsaved changes"
        leaveLabel="Discard Draft"
        onKeepEditing={controller.request.keepEditing}
        onLeave={controller.request.discard}
        open={controller.request.closeGuardOpen}
        title={controller.request.guardTitle}
      />

      <RepositoryDetailDialog
        onClose={controller.details.close}
        onOpenHistory={controller.details.onOpenHistory}
        onOpenLifecycle={controller.details.onOpenLifecycle}
        onResolveProposalGate={controller.details.onResolveProposalGate}
        repository={controller.details.repository}
      />
      {controller.canonicalGate.open ? <RepositoryGateResolutionDialog
        onClose={controller.canonicalGate.close}
        onRecordResolution={controller.gateResolution.onRecordResolution}
        repository={null}
        canonical={{subjectRef:controller.canonicalGate.subjectRef, runtime:controller.repositoryRequests,
          onCreateRepository:controller.request.openForProposal, creationAvailable:controller.request.creationAvailable,
          onAttachRepository:controller.proposalGate.attach, attachmentAvailable:controller.proposalGate.attachmentAvailable,
          custodyCurrent:controller.proposalGate.custodyCurrent,custodyResults:controller.proposalGate.custodyResults,
          onFindByProvider:controller.proposalGate.findByProvider, historyPage:controller.proposalGate.historyPage}} /> : null}
      <RepositoryGateResolutionDialog
        key={
          controller.gateResolution.repository?.id ??
          "repository-gate-resolution"
        }
        onClose={controller.gateResolution.close}
        onRecordResolution={controller.gateResolution.onRecordResolution}
        repository={controller.gateResolution.repository}
      />
      <RepositoryAdmissionDialog
        registration={controller.admission.registration}
        onOpenRegistration={controller.admission.onOpenRegistration}
        onClose={controller.admission.close}
        onOpenDeliveryCatalog={controller.admission.onOpenDeliveryCatalog}
        onOpenHistory={controller.admission.onOpenHistory}
        onOpenLifecycle={controller.admission.onOpenLifecycle}
        repository={controller.admission.repository}
      />
      <RepositoryCustodyDialog
        error={controller.custody.error}
        key={controller.custody.repository?.id ?? "repository-custody"}
        onClose={controller.custody.close}
        onLink={controller.custody.onLink}
        pending={controller.custody.pending}
        repository={controller.custody.repository}
        result={controller.custody.result}
      />
      <RepositoryHistoryDialog
        historyPage={controller.history.page}
        providerRead={controller.history.providerRead}
        onRetry={controller.history.retry}
        onRetryProvider={controller.history.retryProvider}
        refreshing={controller.history.refreshing}
        custodyResults={controller.history.custodyResults}
        custodySourceStatus={controller.history.custodySourceStatus}
        custodySourceError={controller.history.custodySourceError}
        custodyRetryable={controller.history.custodyRetryable}
        liveMode={controller.history.liveMode}
        lifecycleSnapshot={controller.history.lifecycleSnapshot}
        lifecycleError={controller.history.lifecycleError}
        lifecycleFailure={controller.history.lifecycleFailure}
        lifecycleAudit={controller.history.lifecycleAudit}
        onClose={controller.history.close}
        receipts={controller.history.receipts}
        repository={controller.history.repository}
      />
      <RepositoryLifecycleDialog
        executionAvailable={controller.lifecycle.executionAvailable}
        custodyResult={controller.lifecycle.custodyResult}
        error={controller.lifecycle.error}
        initialAction={controller.lifecycle.initialAction}
        key={controller.lifecycle.repository?.id ?? "repository-lifecycle"}
        onClose={controller.lifecycle.close}
        onExecute={controller.lifecycle.onExecute}
        onOpenHistory={controller.lifecycle.onOpenHistory}
        pending={controller.lifecycle.pending}
        repository={controller.lifecycle.repository}
        result={controller.lifecycle.result}
        snapshot={controller.lifecycle.snapshot}
      />
    </>
  );
}
