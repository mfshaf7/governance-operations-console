import { useEffect, useMemo, useState } from "react";
import type { DeliveryArtNode } from "../../../../domain/delivery-execution.ts";

import {
  TerasActionButton,
  TerasDialog,
  TerasEmptyState,
  TerasFieldStack,
  TerasList,
  TerasSignalItem,
  TerasTextField,
  TerasSelectField,
} from "@/teras";
import { parseExecutionWorkItemReference } from "./execution-work-session-target.ts";
import { executionWorkChoices, type ExecutionWorkFilter } from "../../../../work-model/execution/execution-package-content.ts";

export function ExecutionWorkSessionTargetDialog({
  onClose,
  onOpenTarget,
  onInspectTarget,
  onCompleteTarget,
  open,
  items = [],
  defaultWorkItemId = null,
  initialStatus = "all",
  scopeLabel,
  readOnly = false,
  activeWorkIds = [],
  preparedWorkIds = [],
  sessionWorkIds = [],
}: {
  onClose: () => void;
  onOpenTarget: (workItemId: number) => void;
  onInspectTarget?: (workItemId: number) => void;
  onCompleteTarget?: (workItemId: number) => void;
  open: boolean;
  items?: DeliveryArtNode[];
  defaultWorkItemId?: number | null;
  initialStatus?: ExecutionWorkFilter;
  scopeLabel?: string;
  readOnly?: boolean;
  activeWorkIds?: number[];
  preparedWorkIds?: number[];
  sessionWorkIds?: number[];
}) {
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [workPath, setWorkPath] = useState("source");
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(false);
  const [status, setStatus] = useState<ExecutionWorkFilter>(initialStatus);
  const choices = useMemo(() => {
    const rank = (id: number | null) => id !== null && sessionWorkIds.includes(id) ? 0 : id !== null && activeWorkIds.includes(id) ? 1 : id !== null && preparedWorkIds.includes(id) ? 2 : 3;
    return executionWorkChoices(items, status).sort((a, b) => rank(a.legacy_work_package_id) - rank(b.legacy_work_package_id));
  }, [items, status, activeWorkIds, preparedWorkIds, sessionWorkIds]);
  const matching = choices.filter(node => `${node.component_type} ${node.legacy_work_package_id} ${node.title}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visible = matching.slice(0, 100);
  const selected = choices.find(node => String(node.legacy_work_package_id) === reference);

  useEffect(() => {
    if (!open) {
      setReference("");
      setError(null);
      setWorkPath("source");
      setQuery(""); setManual(false);
    } else {
      setReference(defaultWorkItemId ? String(defaultWorkItemId) : "");
      setManual(Boolean(defaultWorkItemId && !scopeLabel && !executionWorkChoices(items, "all").some(item => item.legacy_work_package_id === defaultWorkItemId)));
      setStatus(initialStatus);
    }
  }, [open, defaultWorkItemId, initialStatus]);

  function openTarget(inspect = false) {
    try {
      const workItemId = parseExecutionWorkItemReference(reference);
      if (inspect && onInspectTarget) onInspectTarget(workItemId);
      else if (workPath === "completion" && onCompleteTarget) onCompleteTarget(workItemId);
      else onOpenTarget(workItemId);
      setReference("");
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The ART work item reference is invalid.",
      );
    }
  }

  return (
    <TerasDialog
      actions={
        <>
          <TerasActionButton emphasis="secondary" onClick={onClose}>
            Back to Board
          </TerasActionButton>
          {onInspectTarget ? (
            <TerasActionButton disabled={!reference.trim()} emphasis="secondary" onClick={() => openTarget(true)}>
              Inspect ART Tree
            </TerasActionButton>
          ) : null}
          {!readOnly ? <TerasActionButton disabled={!reference.trim()} onClick={() => openTarget()}>
            {workPath === "completion" ? "Open Completion" : "Open Session"}
          </TerasActionButton> : null}
        </>
      }
      closeLabel="Close work item entry"
      contentOverflow="auto"
      description={readOnly ? "Browse recorded work and inspect its structure. This history view cannot start or complete work." : "Choose a work item, then open its session or record completed work that does not change files. Opening an item does not start or complete it."}
      height="content"
      kicker="Execution Board"
      onClose={onClose}
      open={open}
      title="Open Work Item"
      width="standard"
    >
      <TerasFieldStack spacing="normal">
        {scopeLabel ? <TerasList frame="contained"><TerasSignalItem label="Selected package" title={scopeLabel} detail="Progress filters cover stories, defects and tasks. Blocked work also includes parent and governance records; All work retains the full hierarchy." tone="info" /></TerasList> : null}
        {!readOnly && (activeWorkIds.length || preparedWorkIds.length) ? <TerasList frame="contained"><TerasSignalItem label="Work candidates" title={`${activeWorkIds.length} in progress · ${preparedWorkIds.length} prepared`}
          detail="Recorded progress is listed first, followed by work with complete preparation metadata. Select an item to check its current session and permissions; this list does not grant permission to start." tone="info" /></TerasList> : null}
        {!readOnly && sessionWorkIds.length ? <TerasList frame="contained"><TerasSignalItem label="Recorded work sessions" title={`${sessionWorkIds.length} work item${sessionWorkIds.length === 1 ? "" : "s"} with a saved session`}
          detail="These items are listed first so interrupted work can be resumed. Open the session to check its current state and next action." tone="info" /></TerasList> : null}
        <TerasSelectField label="Work status" value={status} onValueChange={value => { setStatus(value as ExecutionWorkFilter); setReference(""); setManual(false); }}
          options={[{ value: "all", label: "All work" }, { value: "in-progress", label: "In progress" }, { value: "blocked", label: "Blocked" }, { value: "ready", label: "Marked ready" }]} />
        {!choices.length && (scopeLabel || status !== "all") ? <TerasEmptyState>No matching work is loaded. Change the filter or inspect the package records.</TerasEmptyState> : null}
        {choices.length || scopeLabel ? <>
          <TerasTextField label="Find work" value={query} onValueChange={setQuery} placeholder="Search by name or work-item number" />
          <TerasSelectField label="Work item" helper={matching.length > 100 ? "Showing the first 100 matches. Narrow the search to find another item." : undefined} value={manual ? "manual" : reference} onValueChange={value => {
            setManual(value === "manual"); setReference(value === "manual" ? "" : value); setError(null);
          }} options={[
            { value: "", label: "Choose a work item" },
            ...[...(selected && !visible.includes(selected) ? [selected] : []), ...visible].map(node => ({
              value: String(node.legacy_work_package_id), label: `${node.component_type} ${node.legacy_work_package_id} · ${node.title} · ${node.backend_status.replaceAll("-", " ")}`,
            })), ...(!readOnly && !scopeLabel ? [{ value: "manual", label: "Enter another work-item number…" }] : []),
          ]} />
        </> : null}
        {selected ? <TerasList frame="contained"><TerasSignalItem label="Selected work" title={selected.title}
          detail={<>
            Native ART status: {selected.backend_status.replaceAll("-", " ")}. Preparation: {selected.metadata_status.replaceAll("_", " ")}.
            {selected.legacy_work_package_id && sessionWorkIds.includes(selected.legacy_work_package_id) ? " A work session is recorded; open it to inspect current progress." : ""}
            {selected.depends_on_work_package_ids?.length ? ` Dependencies: ${selected.depends_on_work_package_ids.map(id => `Work Item ${id}`).join(", ")}.` : ""}
            {selected.dependency_blocked ? " Unresolved dependencies are recorded. The owner checks exact Landing Unit coverage before starting." : ""}
            {selected.blocker ? ` Blocker: ${selected.blocker.statement || "Statement not recorded"}. Impact: ${selected.blocker.impact || "Not recorded"}. Responsible: ${selected.blocker.owner || "Not recorded"}.` : selected.backend_status === "blocked" ? " This work is marked blocked; blocker details were not returned." : ""}
          </>} tone={selected.dependency_blocked || selected.backend_status === "blocked" ? "warn" : "info"} /></TerasList> : null}
        {onCompleteTarget && !readOnly ? <TerasSelectField label="Work path" value={workPath} onValueChange={setWorkPath}
          options={[{ label: "Code or content changes", value: "source" }, { label: "Complete work without file changes", value: "completion" }]} /> : null}
        {!readOnly && (manual || choices.length === 0 && !scopeLabel && status === "all") ? <TerasTextField
          aria-label="ART work item"
          autoFocus
          label="ART work item"
          onKeyDown={(event) => {
            if (event.key === "Enter" && reference.trim()) openTarget();
          }}
          onValueChange={(value) => {
            setReference(value);
            setError(null);
          }}
          placeholder="1175"
          prefix="#"
          value={reference}
        /> : null}
        {error ? (
          <TerasList frame="contained">
            <TerasSignalItem
              detail={error}
              label="Invalid reference"
              title="Work item could not be opened"
              tone="danger"
            />
          </TerasList>
        ) : null}
      </TerasFieldStack>
    </TerasDialog>
  );
}
