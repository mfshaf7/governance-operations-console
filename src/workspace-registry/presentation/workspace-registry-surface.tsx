"use client";

import { useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasEmptyState,
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
} from "@/teras";

import type { WorkspaceRegistryLiveRuntime } from "../live-runtime/use-workspace-registry-live-runtime";
import type {
  WorkspaceRegistryCandidate,
  WorkspaceRegistryKind,
  WorkspaceRegistryRecord,
  WorkspaceRegistrySnapshot,
} from "../model/workspace-registry-types";

type RegistryView = "eligible" | "registry";
type KindFilter = "all" | WorkspaceRegistryKind;

export function WorkspaceRegistrySurface({
  fixtureMode,
  onLifecycle,
  onPromote,
  runtime,
  snapshot,
  view,
}: {
  fixtureMode: boolean;
  onLifecycle: (record: WorkspaceRegistryRecord) => void;
  onPromote: (candidate: WorkspaceRegistryCandidate) => void;
  runtime: WorkspaceRegistryLiveRuntime;
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
            description={runtime.error?.message ?? "Reading the canonical Workspace Inventory projection through OOS."}
            kicker="Workspace Registry"
            statusLabel={runtime.error ? "Unavailable" : "Loading"}
            statusTone={runtime.error ? "danger" : "info"}
            title={runtime.error ? "Registry unavailable" : "Loading registry"}
          />
          {runtime.error ? (
            <TerasActionButton emphasis="secondary" onClick={() => void runtime.load()}>
              Retry Registry
            </TerasActionButton>
          ) : null}
        </TerasPanel>
        <TerasEmptyState fill>No canonical records are available.</TerasEmptyState>
      </TerasPanelStack>
    );
  }

  return (
    <TerasRecordControlLayout
      composition="fullscreen-register"
      mode="register-selected"
      register={
        <TerasRegisterPanel
          description={view === "registry" ? "Canonical active inventory from Workspace Governance." : "Approved intake entrants eligible for canonical promotion."}
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
                placeholder: "Search name, identity, or owner...",
                value: query,
              }}
            />
          }
          kicker={view === "registry" ? "Canonical Register" : "Promotion Register"}
          statusLabel={`${filtered.length}/${records.length} shown`}
          statusTone={fixtureMode ? "info" : "ok"}
          title={view === "registry" ? "Active inventory" : "Eligible entrants"}
        >
          {filtered.length ? (
            <TerasRecordTable
              columns={registryColumns(view)}
              fill
              getRowId={(entry) => entryTarget(entry).record_id}
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
              onLifecycle={onLifecycle}
              record={selected as WorkspaceRegistryRecord}
            />
          ) : (
            <PromotionCandidateSelected
              candidate={selected as WorkspaceRegistryCandidate}
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
  fixtureMode,
  onLifecycle,
  record,
}: {
  fixtureMode: boolean;
  onLifecycle: (record: WorkspaceRegistryRecord) => void;
  record: WorkspaceRegistryRecord;
}) {
  return (
    <TerasPanelStack fill="last">
      <TerasSelectedPanel
        action={{
          description: fixtureMode
            ? "Inspect the lifecycle flow; fixture mode cannot mutate canonical inventory."
            : "Review current authority before updating metadata or changing posture through OOS.",
          kicker: "Available Action",
          node: (
            <TerasActionButton onClick={() => onLifecycle(record)}>
              Manage Lifecycle
            </TerasActionButton>
          ),
          title: "Lifecycle control",
        }}
        description="Canonical inventory identity and current ownership posture."
        facts={[
          { label: "Type", value: record.kind },
          { label: "Version", value: String(record.version) },
          { label: "Maturity", value: record.maturity ?? "Not declared" },
          { label: "Owners", value: record.owner_refs.join(", ") },
        ]}
        kicker="Selected Record"
        selected
        status={{ label: record.posture, tone: record.posture === "active" ? "ok" : "warn" }}
        title={record.name}
        tone={record.posture === "active" ? "ok" : "warn"}
        variant="rich"
      />
      <TerasPanel fit="fill" layout="header-body" overflow="auto" treatment="neutral">
        <TerasPanelHeader
          description="Versioned source and latest mutation evidence for this record."
          kicker="Record Evidence"
          title="Authority lineage"
        />
        <TerasMetadataList
          columns={1}
          items={[
            { label: "Source", value: record.lineage.source },
            { label: "Source ref", value: record.lineage.source_ref },
            { label: "Record digest", value: shortDigest(record.record_digest) },
            { label: "Last action", value: record.last_mutation.action },
            { label: "Applied", value: new Date(record.last_mutation.applied_at).toLocaleString() },
            { label: "Receipt", value: record.last_mutation.request_ref ?? record.last_mutation.id },
          ]}
          shape="list"
        />
      </TerasPanel>
    </TerasPanelStack>
  );
}

function PromotionCandidateSelected({
  candidate,
  fixtureMode,
  onPromote,
}: {
  candidate: WorkspaceRegistryCandidate;
  fixtureMode: boolean;
  onPromote: (candidate: WorkspaceRegistryCandidate) => void;
}) {
  return (
    <TerasPanelStack fill="last">
      <TerasSelectedPanel
        action={{
          description: fixtureMode ? "Inspect the promotion flow; fixture mode cannot mutate canonical inventory." : "Review current authority evidence before sending the promotion through OOS.",
          kicker: "Available Action",
          node: <TerasActionButton onClick={() => onPromote(candidate)}>Review Promotion</TerasActionButton>,
          title: "Promote entrant",
        }}
        description="Approved intake entrant that is not yet part of active inventory."
        facts={[
          { label: "Type", value: candidate.target.kind },
          { label: "Version", value: String(candidate.intake_entry_ref.version) },
          { label: "Owners", value: candidate.owner_refs.join(", ") },
          { label: "Approvals", value: String(candidate.approval_refs.length) },
        ]}
        kicker="Selected Entrant"
        selected
        status={{ label: "Eligible", tone: "ok" }}
        title={candidate.target.name}
        tone="ok"
        variant="rich"
      />
      <TerasPanel fit="fill" layout="header-body" overflow="auto" treatment="neutral">
        <TerasPanelHeader
          description="Digest-bound source evidence used to detect stale review state."
          kicker="Promotion Evidence"
          title="Reviewed inputs"
        />
        <TerasMetadataList
          columns={1}
          items={[
            { label: "Record", value: candidate.target.record_id },
            { label: "Intake digest", value: shortDigest(candidate.intake_entry_ref.digest) },
            { label: "Candidate digest", value: shortDigest(candidate.candidate_digest) },
            { label: "Approval refs", value: candidate.approval_refs.join(", ") },
          ]}
          shape="list"
        />
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
        return <TerasRecordCellText description={target.record_id} title={target.name} />;
      },
    },
    {
      header: "Type",
      intent: "secondary" as const,
      key: "type",
      render: (entry: WorkspaceRegistryRecord | WorkspaceRegistryCandidate) => entryTarget(entry).kind,
    },
    {
      header: "Owner",
      intent: "secondary" as const,
      key: "owner",
      render: (entry: WorkspaceRegistryRecord | WorkspaceRegistryCandidate) => entryOwners(entry)[0] ?? "Unassigned",
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

function shortDigest(value: string) {
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}
