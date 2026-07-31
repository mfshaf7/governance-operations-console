"use client";

import { TerasActionButton, TerasDialog, TerasStatusPill } from "@/teras";

import type { BuildTreeScaffoldSection } from "./build-tree-model";
import {
  buildTreeScaffoldCompactValue,
  buildTreeScaffoldStateLabel,
} from "./build-tree-scaffold";
import { buildTreeEditorFieldProps } from "./build-tree-view-contract";
import styles from "./build-tree-scaffold-dialog.module.css";

export type BuildTreeScaffoldDialogSubject = {
  description?: string;
  kindLabel: string;
  title: string;
};

export type BuildTreeScaffoldDialogCopy = {
  applyLabel?: string;
  cancelLabel?: string;
  closeLabel?: string;
  description?: string;
  emptyTitle?: string;
  kicker?: string;
  operatorGroupLabel?: string;
  operatorGroupMeta?: string;
  statusLabel?: string;
  systemGroupLabel?: string;
  titleForSubject?: (subject: BuildTreeScaffoldDialogSubject) => string;
};

export type BuildTreeScaffoldDialogProps = {
  copy?: BuildTreeScaffoldDialogCopy;
  onApply: () => void;
  onClose: () => void;
  onSectionValueChange: (sectionId: string, value: string) => void;
  operatorSections: BuildTreeScaffoldSection[];
  subject: BuildTreeScaffoldDialogSubject | null;
  traceSections: BuildTreeScaffoldSection[];
  traceSummary?: string;
};

const defaultScaffoldDialogCopy: Required<
  Omit<BuildTreeScaffoldDialogCopy, "titleForSubject">
> = {
  applyLabel: "Apply Scaffold",
  cancelLabel: "Cancel",
  closeLabel: "Close scaffold editor",
  description:
    "Capture narrative seeds from the accepted source. Later workflow stages can materialize execution metadata.",
  emptyTitle: "Contract Frame",
  kicker: "Draft Scaffold",
  operatorGroupLabel: "Editable Narrative Seeds",
  operatorGroupMeta: "operator-owned",
  statusLabel: "draft",
  systemGroupLabel: "Trace",
};

export function BuildTreeScaffoldDialog({
  copy,
  onApply,
  onClose,
  onSectionValueChange,
  operatorSections,
  subject,
  traceSections,
  traceSummary = "trace",
}: BuildTreeScaffoldDialogProps) {
  const resolvedCopy = {
    ...defaultScaffoldDialogCopy,
    ...copy,
  };

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      actions={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            {resolvedCopy.cancelLabel}
          </TerasActionButton>
          <TerasActionButton onClick={onApply} >
            {resolvedCopy.applyLabel}
          </TerasActionButton>
        </>
      }
      closeLabel={resolvedCopy.closeLabel}
      description={resolvedCopy.description}
      kicker={resolvedCopy.kicker}
      onClose={onClose}
      open={Boolean(subject)}
      title={
        subject
          ? resolvedCopy.titleForSubject
            ? resolvedCopy.titleForSubject(subject)
            : `${subject.kindLabel} Contract Frame`
          : resolvedCopy.emptyTitle
      }
    >
      {subject ? (
        <>
          <div className={styles.buildTreeScaffoldSummary}>
            <div>
              <span>{subject.kindLabel}</span>
              <strong>{subject.title}</strong>
              {subject.description ? <small>{subject.description}</small> : null}
            </div>
            <TerasStatusPill
              className={styles.buildTreeScaffoldSummaryPill}
              tone="warn"
            >
              {resolvedCopy.statusLabel}
            </TerasStatusPill>
          </div>
          <div className={styles.buildTreeScaffoldSectionList}>
            <div className={styles.buildTreeScaffoldGroup}>
              <div className={styles.buildTreeScaffoldGroupHeader}>
                <span>{resolvedCopy.operatorGroupLabel}</span>
                <small>{resolvedCopy.operatorGroupMeta}</small>
              </div>
              {operatorSections.map((section) => (
                <label className={styles.buildTreeScaffoldSection} key={section.id}>
                  <span className={styles.buildTreeScaffoldSectionHead}>
                    <span>{section.heading}</span>
                    <small data-state={section.state}>
                      {buildTreeScaffoldStateLabel(section.state)}
                    </small>
                  </span>
                  <textarea
                    {...buildTreeEditorFieldProps}
                    className={styles.buildTreeScaffoldSectionInput}
                    onChange={(event) =>
                      onSectionValueChange(section.id, event.target.value)
                    }
                    placeholder={section.placeholder}
                    value={section.value}
                  />
                </label>
              ))}
            </div>
            {traceSections.length > 0 ? (
              <div
                className={`${styles.buildTreeScaffoldGroup} ${styles.buildTreeScaffoldSystemGroup}`}
              >
                <div className={styles.buildTreeScaffoldGroupHeader}>
                  <span>{resolvedCopy.systemGroupLabel}</span>
                  <small>{traceSummary}</small>
                </div>
                <div className={styles.buildTreeScaffoldTraceTray}>
                  <div className={styles.buildTreeScaffoldTraceList}>
                    {traceSections.map((section) => (
                      <div
                        className={styles.buildTreeScaffoldTraceItem}
                        key={section.id}
                      >
                        <span>{section.heading}</span>
                        <p>{buildTreeScaffoldCompactValue(section.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </TerasDialog>
  );
}
