import { TerasDraftCloseGuardDialog } from "@/teras";

import { RepositoryAdmissionDialog } from "../dialogs/admission/repository-admission-dialog.tsx";
import { RepositoryAdmissionRunDialog } from "../dialogs/admission/repository-admission-run-dialog.tsx";
import { RepositoryCustodyDialog } from "../dialogs/custody/repository-custody-dialog.tsx";
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
      <RepositoryRequestDialog
        canSubmit={controller.request.canSubmit}
        draft={controller.request.draft}
        error={controller.request.error}
        onClose={controller.request.close}
        onSubmit={controller.request.onSubmit}
        onUpdateDraft={controller.request.onUpdateDraft}
        open={controller.request.open}
        pending={controller.request.pending}
        result={controller.request.result}
      />

      <TerasDraftCloseGuardDialog
        description="This repository provisioning request has unsaved reviewed fields. Leaving will discard the current draft."
        kicker="Repository Provisioning"
        leaveLabel="Discard Draft"
        onKeepEditing={controller.request.keepEditing}
        onLeave={controller.request.discard}
        open={controller.request.closeGuardOpen}
        title="Close Draft?"
      />

      <RepositoryDetailDialog
        onClose={controller.details.close}
        onOpenHistory={controller.details.onOpenHistory}
        onOpenLifecycle={controller.details.onOpenLifecycle}
        onResolveProposalGate={controller.details.onResolveProposalGate}
        repository={controller.details.repository}
      />
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
        onClose={controller.admission.close}
        onOpenHistory={controller.admission.onOpenHistory}
        onOpenLifecycle={controller.admission.onOpenLifecycle}
        onStart={controller.admission.onStart}
        receipt={controller.admission.receipt}
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
        lifecycleAudit={controller.history.lifecycleAudit}
        onClose={controller.history.close}
        receipts={controller.history.receipts}
        repository={controller.history.repository}
      />
      <RepositoryAdmissionRunDialog
        onBack={controller.admissionRun.onBack}
        onClose={controller.admissionRun.close}
        onRun={controller.admissionRun.onRun}
        receipt={controller.admissionRun.receipt}
        repository={controller.admissionRun.repository}
      />
      <RepositoryLifecycleDialog
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
