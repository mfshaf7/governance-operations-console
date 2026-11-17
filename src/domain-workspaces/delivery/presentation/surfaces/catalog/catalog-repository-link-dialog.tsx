"use client";

import { useEffect, useState } from "react";

import {
  TerasActionButton,
  TerasDraftCloseGuardDialog,
  TerasContentTray,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasTrayStack,
  TerasTechnicalDetails,
} from "@/teras";
import type { OperationOwnerRepoCatalogOption } from "@/domain-workspaces/operation-contracts/owner-repository";

import type {
  CatalogDeliveryLinkTarget,
  CatalogRepositoryReadiness,
} from "../../../live-runtime/catalog-live-types.ts";
import type { DeliveryChangeResult } from "../../../live-runtime/delivery-change-live-types.ts";
import type { DeliveryCatalogValue } from "../../../read-model/index.ts";

export function CatalogRepositoryLinkDialog({
  blockedReason,
  error,
  note,
  onClose,
  onNoteChange,
  onSubmit,
  open,
  pending,
  readiness,
  repository,
  result,
  target,
  value,
}: {
  blockedReason: string | null;
  error: string | null;
  note: string;
  onClose: () => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  open: boolean;
  pending: boolean;
  readiness: CatalogRepositoryReadiness | null;
  repository: OperationOwnerRepoCatalogOption | null;
  result: DeliveryChangeResult | null;
  target: CatalogDeliveryLinkTarget | null;
  value: DeliveryCatalogValue | null;
}) {
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const dirty = open && result?.status !== "applied" && Boolean(note.trim());
  function requestClose() {
    if (pending) return;
    if (dirty) setCloseGuardOpen(true);
    else onClose();
  }
  useEffect(() => { if (!open) setCloseGuardOpen(false); }, [open]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (open && (dirty || pending)) event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [open, dirty, pending]);
  if (!open || !target) return null;

  const applied = result?.status === "applied";
  const catalogReceipt = catalogReceiptRef(result);

  return (
    <>
    <TerasModalShell busy={pending} busyLabel="Linking repository…"
      bodyLayout="scroll"
      description="Link this repository to the selected work item. The system checks readiness, records the Catalog value and then updates Delivery. If only part succeeds, the result shows what needs recovery."
      footer={
        <>
          <TerasActionButton emphasis="secondary" disabled={pending} onClick={requestClose}>
            {applied ? "Close" : "Cancel"}
          </TerasActionButton>
          {!applied ? (
            <TerasActionButton busy={pending}
              disabled={
                pending || Boolean(blockedReason) || note.trim().length === 0
              }
              emphasis="primary"
              onClick={onSubmit}
            >
              {pending ? "Linking…" : "Link Repository"}
            </TerasActionButton>
          ) : null}
        </>
      }
      height="content"
      kicker="Repository / Catalog / Delivery"
      onClose={requestClose}
      surfaceId="delivery-repository-link"
      title="Link implementation repository"
      width="standard"
    >
      <TerasTrayStack spacing="loose">
        <TerasContentTray kicker="Reviewed Target">
          <TerasMetadataList
            items={[
              { label: "Delivery", value: target.packageLabel },
              { label: "Work Item", value: target.workItemId.replace(/^work-item-/, "Work item ") },
              {
                label: "Implementation repository",
                value: repository?.valueKey ?? value?.value_key ?? "Unavailable",
              },

            ]}
          />
        </TerasContentTray>

        <TerasContentTray kicker="Repository readiness">
          <TerasContentTray description="The system verifies the repository’s active registration and current readiness before linking it." />
          <TerasTechnicalDetails items={[
              {label: "Repository reference", value: repository?.repoRef ?? "Unavailable"},
              {
                label: "WGCF Receipt",
                value: readiness?.receipt.uri ?? "No readiness receipt",
              },
              {
                label: "Generation",
                value: readiness ? String(readiness.receipt.generation) : "—",
              },
              {
                label: "Catalog Value",
                value: value?.catalog_value_id ?? "Unavailable",
              },
            ]} />
        </TerasContentTray>

        {result ? (
          <TerasContentTray kicker="Command Result">
            <TerasMetadataList
              items={[
                {
                  label: "Status",
                  tone: applied ? "ok" : "danger",
                  value: result.status.replaceAll("_", " "),
                },
                { label: "Catalog Receipt", value: catalogReceipt ?? "Unavailable" },
                { label: "Delivery Receipt", value: result.receipt.ref },
                { label: "Next Action", value: result.next_action.label },
              ]}
            />
          </TerasContentTray>
        ) : (
          <TerasNoteField
            disabled={pending || Boolean(blockedReason)}
            label="Why this repository?"
            minimumHeight="short"
            onValueChange={onNoteChange}
            placeholder="Why this repository is responsible for implementing the selected work item"
            value={note}
          />
        )}

        {blockedReason || error ? (
          <TerasMetadataList
            columns={1}
            items={[
              {
                label: blockedReason ? "Blocked" : "Command",
                tone: "danger",
                value: blockedReason ?? error ?? "Repository link unavailable.",
              },
            ]}
          />
        ) : null}
      </TerasTrayStack>
    </TerasModalShell>
    <TerasDraftCloseGuardDialog open={closeGuardOpen} title="Discard Repository link note?" kicker="Unsubmitted acceptance note"
      description="The link has not been confirmed. Discarding removes this draft note; inspect the original service result before retrying an uncertain request."
      leaveLabel="Discard Draft" onKeepEditing={() => setCloseGuardOpen(false)} onLeave={() => { setCloseGuardOpen(false); onNoteChange(""); onClose(); }} />
    </>
  );
}

function catalogReceiptRef(result: DeliveryChangeResult | null) {
  const effect = result?.event.effect;
  if (!effect || typeof effect.catalog !== "object" || effect.catalog === null) {
    return null;
  }
  const receipt = (effect.catalog as Record<string, unknown>).receipt;
  if (!receipt || typeof receipt !== "object") return null;
  const ref = (receipt as Record<string, unknown>).ref;
  return typeof ref === "string" ? ref : null;
}
