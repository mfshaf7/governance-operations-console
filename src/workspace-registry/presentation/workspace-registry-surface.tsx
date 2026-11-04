"use client";

import { useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasLoadingState,
  TerasFilterBar,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasRecordCellText,
  TerasRecordControlLayout,
  TerasRecordStatusStack,
  TerasRecordTable,
  TerasRegisterPanel,
  TerasSelectedPanel,
  TerasStatusPill,
  TerasTechnicalDetails,
} from "@/teras";

import type {
  WorkspaceRegistryCandidate,
  WorkspaceRegistryKind,
  WorkspaceRegistryRecord,
  WorkspaceRegistrySnapshot,
} from "../model/workspace-registry-types";

type RegistryView = "eligible" | "registry";
type KindFilter = "all" | WorkspaceRegistryKind;

export function WorkspaceRegistrySurface({
  availabilityError,
  actionsCurrent = true,
  retained = false,
  fixtureMode,
  onLifecycle,
  onPromote,
  onPromotionHistory,
  onRetry,
  snapshot,
  view,
}: {
  availabilityError: string | null;
  actionsCurrent?: boolean;
  retained?: boolean;
  fixtureMode: boolean;
  onLifecycle: (record: WorkspaceRegistryRecord) => void;
  onPromote: (candidate: WorkspaceRegistryCandidate) => void;
  onPromotionHistory: (record: WorkspaceRegistryRecord) => void;
  onRetry: () => void;
  snapshot: WorkspaceRegistrySnapshot | null;
  view: RegistryView;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const records = view === "registry" ? snapshot?.records ?? [] : snapshot?.eligible_promotions ?? [];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((entry) => {
      const target = entryTarget(entry);
      const owners = entryOwners(entry);
      return (
        (kind === "all" || target.kind === kind) &&
        (!normalized || `${target.name} ${target.record_id} ${owners.join(" ")}`.toLowerCase().includes(normalized))
      );
    });
  }, [kind, query, records]);
  const selected = filtered.find((entry) => entryTarget(entry).record_id === selectedId) ?? filtered[0] ?? null;

  if (!snapshot) {
    return (
      <TerasPanelStack fill="last">
        <TerasPanel fit="content" treatment="neutral">
          <TerasPanelHeader
            description={availabilityError ?? "Reconciling canonical Workspace Inventory projections from WGCF and OOS."}
            kicker="Workspace Registry"
            statusLabel={availabilityError ? "Unavailable" : "Loading"}
            statusTone={availabilityError ? "danger" : "info"}
            title={availabilityError ? "Registry unavailable" : "Loading registry"}
          />
          {availabilityError ? (
            <TerasActionButton emphasis="secondary" onClick={onRetry}>
              Retry Registry
            </TerasActionButton>
          ) : null}
        </TerasPanel>
        {availabilityError ? <TerasEmptyState fill>No canonical records are available.</TerasEmptyState>
          : <TerasLoadingState fill label="Loading workspace inventory…" />}
      </TerasPanelStack>
    );
  }

  return (
    <TerasRecordControlLayout
      composition="fullscreen-register"
      mode="register-selected"
      register={
        <TerasRegisterPanel
          description={retained
            ? `Retained inventory; current source could not be confirmed. Refresh before making changes. ${availabilityError ?? ""}`
            : fixtureMode ? "Preview records; no canonical changes are submitted."
            : view === "registry" ? "Workspace inventory, including retained suspended and retired records." : "Approved intake entrants eligible for inventory promotion."}
          filterBar={
            <TerasFilterBar
              filters={[
                {
                  label: "Filter record type",
                  onValueChange: setKind,
                  options: [
                    { label: "All types", value: "all" },
                    { label: "Repositories", value: "repo" },
                    { label: "Products", value: "product" },
                    { label: "Components", value: "component" },
                  ],
                  value: kind,
                },
              ]}
              search={{
                ariaLabel: `Search ${view}`,
                onValueChange: setQuery,
                placeholder: "Search name, identity, or responsible repository...",
                value: query,
              }}
            />
          }
          kicker={view === "registry" ? "Canonical Register" : "Promotion Register"}
          statusLabel={`${filtered.length}/${records.length} shown`}
          statusTone={retained ? "warn" : fixtureMode ? "info" : "ok"}
          title={view === "registry" ? "Workspace inventory" : "Eligible entrants"}
        >
          {filtered.length ? (
            <TerasRecordTable
              columns={registryColumns(view)}
              fill
              getRowId={(entry) => entryTarget(entry).record_id}
              profile="register"
              onSelect={(entry) => setSelectedId(entryTarget(entry).record_id)}
              rows={[...filtered]}
              selectedRowId={selected ? entryTarget(selected).record_id : null}
            />
          ) : (
            <TerasEmptyState fill>No record matches the current filters.</TerasEmptyState>
          )}
        </TerasRegisterPanel>
      }
      selected={
        selected ? (
          view === "registry" ? (
            <RegistryRecordSelected
              fixtureMode={fixtureMode}
              actionsCurrent={actionsCurrent}
              snapshot={snapshot}
              onLifecycle={onLifecycle}
              onPromotionHistory={onPromotionHistory}
              record={selected as WorkspaceRegistryRecord}
            />
          ) : (
            <PromotionCandidateSelected
              candidate={selected as WorkspaceRegistryCandidate}
              actionsCurrent={actionsCurrent}
              fixtureMode={fixtureMode}
              onPromote={onPromote}
            />
          )
        ) : (
          <TerasEmptyState fill>No record is selected.</TerasEmptyState>
        )
      }
    />
  );
}

function RegistryRecordSelected({
  actionsCurrent,
  snapshot,
  fixtureMode,
  onLifecycle,
  onPromotionHistory,
  record,
}: {
  fixtureMode: boolean;
  actionsCurrent: boolean;
  snapshot: WorkspaceRegistrySnapshot;
  onLifecycle: (record: WorkspaceRegistryRecord) => void;
  onPromotionHistory: (record: WorkspaceRegistryRecord) => void;
  record: WorkspaceRegistryRecord;
}) {
  return (
    <TerasPanelStack fill="last" scroll>
      <TerasSelectedPanel
        action={{
          description: fixtureMode
            ? "Inspect the lifecycle flow; fixture mode cannot mutate canonical inventory."
            : !actionsCurrent ? "Current authority is unavailable. Refresh Registry before preparing a change."
            : "Review current authority before updating metadata or changing posture through OOS.",
          kicker: "Available Action",
          node: (
            <TerasActionRow>
            <TerasActionButton disabled={!fixtureMode && !actionsCurrent} onClick={() => onLifecycle(record)}>
              Manage Lifecycle
            </TerasActionButton>
            <TerasActionButton emphasis="secondary" onClick={() => onPromotionHistory(record)}>View Promotion Requests</TerasActionButton>
            </TerasActionRow>
          ),
          title: "Lifecycle control",
        }}
        description={fixtureMode ? "Preview record; no inventory changes are submitted." : !actionsCurrent ? "Last reconciled record. Refresh Registry to confirm its current posture." : "Current inventory identity and responsibility posture."}
        facts={[
          { label: "Type", value: record.kind },
          { label: "Version", value: String(record.version) },
          { label: "Maturity", value: record.maturity ?? "Not declared" },
          { label: "Responsible repositories", value: record.owner_refs.join(", ") },
        ]}
        kicker="Selected Record"
        selected
        status={{ label: record.posture, tone: record.posture === "active" ? "ok" : "warn" }}
        title={record.name}
        tone={record.posture === "active" ? "ok" : "warn"}
        variant="rich"
      />
      <TerasPanel fit="content" treatment="neutral">
        <TerasPanelHeader description="Latest source and mutation context; request journals retain workflow history."
          kicker="Record Evidence" title="Authority lineage" />
        <TerasMetadataList columns={1} shape="list" items={[
          { label: "Origin", value: record.lineage.source.replaceAll("-", " ") },
          { label: "Latest change", value: record.last_mutation.action.replaceAll("-", " ") },
          { label: "Recorded", value: new Date(record.last_mutation.applied_at).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC" },
        ]} />
        <TerasTechnicalDetails summary="Record details" items={[
          { label: "Record", value: record.id },
          { label: "Source reference", value: record.lineage.source_ref },
          { label: "Source digest", value: record.lineage.source_digest },
          { label: "Record digest", value: record.record_digest },
          { label: "Mutation event", value: record.last_mutation.id },
          { label: "Request", value: record.last_mutation.request_ref ?? "No request recorded" },
          { label: "Readiness reference", value: record.last_mutation.readiness_ref ?? "Not recorded" },
          { label: "Sources", value: "Workspace Governance via WGCF and OOS" },
          { label: "Authority revision", value: snapshot.authority_revision },
          { label: "Source projection", value: snapshot.projected_at },
          { label: "Projection digest", value: snapshot.projection_digest },
        ]} />
      </TerasPanel>
    </TerasPanelStack>
  );
}

function PromotionCandidateSelected({
  candidate,
  actionsCurrent,
  fixtureMode,
  onPromote,
}: {
  candidate: WorkspaceRegistryCandidate;
  actionsCurrent: boolean;
  fixtureMode: boolean;
  onPromote: (candidate: WorkspaceRegistryCandidate) => void;
}) {
  return (
    <TerasPanelStack fill="last" scroll>
      <TerasSelectedPanel
        action={{
          description: fixtureMode ? "Inspect the promotion flow; fixture mode cannot mutate canonical inventory." : "Review current authority evidence before sending the promotion through OOS.",
          kicker: "Available Action",
          node: <TerasActionButton disabled={!fixtureMode && !actionsCurrent} onClick={() => onPromote(candidate)}>Review Promotion</TerasActionButton>,
          title: "Promote entrant",
        }}
        description={!fixtureMode && !actionsCurrent ? "Retained entrant. Refresh Registry to confirm it is still eligible." : "Approved intake entrant that is not yet part of active inventory."}
        facts={[
          { label: "Type", value: candidate.target.kind },
          { label: "Version", value: String(candidate.intake_entry_ref.version) },
          { label: "Responsible repositories", value: candidate.owner_refs.join(", ") },
          { label: "Approvals", value: String(candidate.approval_refs.length) },
        ]}
        kicker="Selected Entrant"
        selected
        status={{ label: !fixtureMode && !actionsCurrent ? "Retained" : "Eligible", tone: !fixtureMode && !actionsCurrent ? "warn" : "ok" }}
        title={candidate.target.name}
        tone="ok"
        variant="rich"
      />
      <TerasPanel fit="content" treatment="neutral">
        <TerasPanelHeader
          description="Digest-bound source evidence used to detect stale review state."
          kicker="Promotion Evidence"
          title="Reviewed inputs"
        />
        <TerasMetadataList columns={1} shape="list" items={[
          { label: "Intake version", value: String(candidate.intake_entry_ref.version) },
          { label: "Approval references", value: String(candidate.approval_refs.length) },
        ]} />
        <TerasTechnicalDetails summary="Promotion details" items={[
          { label: "Record", value: candidate.target.record_id },
          { label: "Intake reference", value: candidate.intake_entry_ref.id },
          { label: "Intake digest", value: candidate.intake_entry_ref.digest },
          { label: "Candidate digest", value: candidate.candidate_digest },
          ...candidate.approval_refs.map((value, index) => ({ label: `Approval ${index + 1}`, value })),
        ]} />
      </TerasPanel>
    </TerasPanelStack>
  );
}

function registryColumns(view: RegistryView) {
  return [
    {
      header: "Record",
      intent: "primary" as const,
      key: "record",
      render: (entry: WorkspaceRegistryRecord | WorkspaceRegistryCandidate) => {
        const target = entryTarget(entry);
        return <TerasRecordCellText meta={target.kind === "repo" ? "Repository" : target.kind === "product" ? "Product" : "Component"} title={target.name} />;
      },
    },
    {
      header: "Responsible repositories",
      intent: "technical" as const,
      key: "owner",
      render: (entry: WorkspaceRegistryRecord | WorkspaceRegistryCandidate) => entryOwners(entry).join(", ") || "Unassigned",
    },
    {
      header: "Status",
      intent: "status" as const,
      key: "status",
      render: (entry: WorkspaceRegistryRecord | WorkspaceRegistryCandidate) => {
        const status = view === "eligible" ? "Eligible" : (entry as WorkspaceRegistryRecord).posture;
        return (
          <TerasRecordStatusStack
            status={<TerasStatusPill size="compact" tone={status === "active" || status === "Eligible" ? "ok" : "warn"}>{status}</TerasStatusPill>}
          />
        );
      },
    },
  ];
}

function entryTarget(entry: WorkspaceRegistryRecord | WorkspaceRegistryCandidate) {
  return "target" in entry
    ? entry.target
    : { kind: entry.kind, name: entry.name, record_id: entry.id };
}

function entryOwners(entry: WorkspaceRegistryRecord | WorkspaceRegistryCandidate) {
  return [...entry.owner_refs];
}
