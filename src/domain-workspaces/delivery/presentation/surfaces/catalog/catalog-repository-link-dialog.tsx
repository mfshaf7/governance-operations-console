"use client";

import {
  TerasActionButton,
  TerasContentTray,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasTrayStack,
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
  if (!open || !target) return null;

  const applied = result?.status === "applied";
  const catalogReceipt = catalogReceiptRef(result);

  return (
    <TerasModalShell
      bodyLayout="scroll"
      description="Review one atomic OOS command that verifies Repository readiness, applies the Catalog link, updates the Delivery work item, and returns both receipts."
      footer={
        <>
          <TerasActionButton emphasis="secondary" onClick={onClose}>
            {applied ? "Close" : "Cancel"}
          </TerasActionButton>
          {!applied ? (
            <TerasActionButton
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
      onClose={onClose}
      surfaceId="delivery-repository-link"
      title="Link Owner Repository"
      width="standard"
    >
      <TerasTrayStack spacing="loose">
        <TerasContentTray kicker="Reviewed Target">
          <TerasMetadataList
            items={[
              { label: "Delivery", value: target.packageLabel },
              { label: "Work Item", value: target.workItemId },
              {
                label: "Owner Repo",
                value: repository?.valueKey ?? value?.value_key ?? "Unavailable",
              },
              {
                label: "Repository Ref",
                value: repository?.repoRef ?? "Unavailable",
              },
            ]}
          />
        </TerasContentTray>

        <TerasContentTray kicker="Authority Evidence">
          <TerasMetadataList
            items={[
              {
                label: "Readiness",
                tone: readiness ? "ok" : "danger",
                value: readiness?.receipt.outcome ?? "missing",
              },
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
            ]}
          />
        </TerasContentTray>

        {result ? (
          <TerasContentTray kicker="Command Result">
            <TerasMetadataList
              items={[
                {
                  label: "Status",
                  tone: applied ? "ok" : "danger",
                  value: result.status,
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
            label="Operator acceptance note"
            minimumHeight="short"
            onValueChange={onNoteChange}
            placeholder="Why this repository is the reviewed owner for the selected work item"
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
