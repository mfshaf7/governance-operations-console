import { createElement, type ComponentProps, type ComponentType } from "react";
import { TerasActionButton } from "./teras-action";
import { TerasSelectableRow } from "./teras-choice";
import { TerasContentRegion } from "./teras-content-layout";
import { TerasContentTray } from "./teras-content-tray";
import { TerasDialog } from "./teras-dialog";
import { TerasFieldGrid, TerasFieldStack } from "./teras-field-layout";
import { TerasHubStepList } from "./teras-hub";
import { TerasMetadataList } from "./teras-metadata";
import { TerasModalShell } from "./teras-modal-shell";
import { TerasNoteField } from "./teras-note-field";
import { TerasPanel, TerasPanelHeader } from "./teras-panel";
import { TerasProgressStepList } from "./teras-progress-steps";
import { TerasSegmentedControl, type TerasSegmentedControlProps } from "./teras-segmented-control";
import { TerasStatGroup } from "./teras-stats";
import { TerasTextField } from "./teras-text-field";
import { TerasZoneLayout } from "./teras-zone-layout";
import { cx } from "./teras-utils";
import styles from "./teras-planning-layout.module.css";

type WithoutStyle<T> = T extends unknown ? Omit<T, "className"> : never;

function layout<P extends { className?: string }>(Component: ComponentType<P>, className: string) {
  return function PlanningPart(props: Omit<P, "className">) {
    return createElement(Component, { ...props, className } as P);
  };
}

function element<Tag extends "div" | "span" | "p" | "details" | "section" | "ul" | "ol">(tag: Tag, className: string) {
  return function PlanningElement(props: WithoutStyle<ComponentProps<Tag>>) {
    return createElement(tag, { ...props, className });
  };
}

function Modal({ bodyLayout, height, surfaceId, width, ...props }: Omit<ComponentProps<typeof TerasModalShell>, "modalAttributes">) {
  return <TerasModalShell {...props} bodyLayout={bodyLayout} height={height} surfaceId={surfaceId} width={width}
    modalAttributes={{ className: styles.technicalPlanSurface }} />;
}

function Progress<Step extends string>(props: WithoutStyle<ComponentProps<typeof TerasProgressStepList<Step>>>) {
  return <TerasProgressStepList {...props} className={styles.stepFlow} />;
}

function tabs(className: string) {
  return function PlanningTabs<Id extends string>(props: WithoutStyle<TerasSegmentedControlProps<Id>>) {
    return <TerasSegmentedControl {...props} className={className} />;
  };
}

const stepRegions = { scope: styles.scopeRegion, plan: styles.planRegion, review: undefined };
function StepRegion({ step, ...props }: WithoutStyle<ComponentProps<typeof TerasContentRegion>> & { step: keyof typeof stepRegions }) {
  return <TerasContentRegion {...props} className={stepRegions[step]} />;
}

const referenceRegions = {
  body: styles.savedArchitectureContent,
  diagrams: cx(styles.referenceContent, styles.savedArchitectureDiagrams),
  brief: cx(styles.referenceContent, styles.savedArchitectureBrief),
};
function ReferenceRegion({ section, ...props }: WithoutStyle<ComponentProps<typeof TerasContentRegion>> & { section?: keyof typeof referenceRegions }) {
  return <TerasContentRegion {...props} className={section ? referenceRegions[section] : styles.referenceContent} />;
}

const metadataPresentations = {
  normal: styles.planFacts,
  revisions: cx(styles.planFacts, styles.revisionCards),
  relationships: styles.sequenceDetailFacts,
  review: cx(styles.planFacts, styles.reviewScalarGrid),
};
function Metadata({ presentation = "normal", ...props }: WithoutStyle<ComponentProps<typeof TerasMetadataList>> & { presentation?: keyof typeof metadataPresentations }) {
  return <TerasMetadataList {...props} className={metadataPresentations[presentation]} />;
}

function Applicability({ emphasized, ...props }: WithoutStyle<ComponentProps<typeof TerasFieldStack>> & { emphasized: boolean }) {
  return <TerasFieldStack {...props} className={emphasized ? styles.lifecycleApplicability : undefined} />;
}

function FilterAction({ aligned = true, ...props }: WithoutStyle<ComponentProps<typeof TerasActionButton>> & { aligned?: boolean }) {
  return <TerasActionButton {...props} className={aligned ? styles.scopeFilter : undefined} />;
}

function ReaderList({ fill, ...props }: WithoutStyle<ComponentProps<"div">> & { fill: boolean }) {
  return <div {...props} className={fill ? styles.planReaderList : undefined} />;
}

/** The detailed planning workspace composes Teras controls with consistent
 * responsive layout, entry navigation, and scroll ownership. */
export const TerasPlanning = {
  Modal,
  Zones: layout(TerasZoneLayout, styles.overviewLayout),
  Progress,
  StepRegion,
  ViewActions: element("div", styles.planTools),

  ScopeStack: layout(TerasFieldStack, styles.scopeStep),
  ScopeColumns: element("div", styles.scopeLayout),
  WorkTreePanel: layout(TerasPanel, styles.scopeTreePanel),
  WorkTree: layout(TerasContentRegion, styles.scopeTree),
  WorkGroup: element("details", styles.scopeFeature),
  WorkPicker: layout(TerasFieldStack, styles.planWorkPicker),
  ApproachPanel: layout(TerasPanel, styles.scopeApproach),
  ApproachNote: layout(TerasNoteField, styles.approachNote),

  NavigationPanel: layout(TerasPanel, styles.planningNavigation),
  NavigationHeading: layout(TerasPanelHeader, styles.planningHeading),
  NavigationSteps: layout(TerasHubStepList, styles.planningSteps),
  SectionHeader: element("div", styles.planSectionHeader),
  SectionTabs: tabs(styles.planSectionTabs),
  SectionStack: layout(TerasFieldStack, styles.planSectionContent),
  SectionFields: layout(TerasContentRegion, styles.planSectionFields),
  AdvisorWidthAction: layout(TerasActionButton, styles.advisorWidthControl),

  Applicability,
  PairedFields: layout(TerasFieldGrid, styles.pairedPlanFields),
  ChoiceFields: layout(TerasFieldGrid, styles.entryChoiceGrid),
  AuthorizationNotes: layout(TerasFieldGrid, styles.authorizationNotesGrid),
  RecordStack: layout(TerasFieldStack, styles.planObjectSection),
  LifecycleColumns: layout(TerasFieldGrid, styles.lifecycleGrid),
  LifecycleStates: layout(TerasContentTray, styles.lifecycleStates),
  LifecycleTransitions: layout(TerasContentTray, styles.lifecycleTransitions),
  Sources: layout(TerasFieldStack, styles.sourceRevisionWorkspace),
  SourceHeading: layout(TerasPanelHeader, styles.sourceRevisionHeader),
  ReadStatus: element("p", styles.sourceReadStatus),
  LookupFields: layout(TerasFieldGrid, styles.planLookupSelection),

  SearchRow: element("div", styles.searchRow),
  FilterAction,
  AccessibleText: element("span", styles.spokenOnly),
  WorkReference: element("span", styles.scopeWorkReference),
  ItemTitle: element("span", styles.readableRowTitle),
  ItemDetail: element("span", styles.readableRowDetail),
  FieldHint: element("p", styles.readableRowDetail),
  Metadata,
  FactsTray: layout(TerasContentTray, styles.planFactsTray),
  EntryHeading: layout(TerasPanelHeader, styles.planEntryHeader),
  EntryPanel: layout(TerasPanel, styles.planEntry),
  EntryDetails: element("section", styles.planEntry),
  FormDialog: layout(TerasDialog, styles.technicalPlanFormDialog),
  ReviewDialog: layout(TerasDialog, styles.technicalPlanReviewDialog),
  ReaderEntry: element("div", styles.planReaderEntry),
  ReaderList,
  RecordDetails: element("div", styles.sequenceRecordDetails),
  InspectionRow: layout(TerasSelectableRow, styles.planInspectionRow),
  ReviewFacts: layout(TerasStatGroup, styles.reviewFacts),
  ReviewSection: layout(TerasContentTray, styles.reviewFollowUp),

  ReferenceRegion,
  ReferenceTabs: tabs(styles.referenceViewSwitcher),
  ReferenceColumns: element("div", styles.savedArchitectureZones),
  BriefStack: layout(TerasFieldStack, styles.architectureBriefFields),
  Sequence: element("div", styles.sequenceWorkspace),
  MapPanel: layout(TerasPanel, styles.generatedDiagram),
  MapHeader: element("div", styles.sequenceMapHeader),
  MapHeading: layout(TerasPanelHeader, styles.sequenceMapHeading),
  MapFilters: element("div", styles.sequenceMapFields),
  FocusLabel: element("span", styles.sequenceFocusLabel),
  MapAction: layout(TerasActionButton, styles.sequenceOpenMap),
  SequenceBrowse: layout(TerasPanel, styles.sequenceBrowse),
  SequenceHeading: layout(TerasPanelHeader, styles.sequenceSideHeading),
  SequenceSearch: layout(TerasTextField, styles.sequenceSearch),
  SequenceTabs: tabs(styles.sequenceBrowseTabs),
  SequenceSelection: layout(TerasPanel, styles.sequenceSelection),
  Relationships: element("ul", styles.sequenceRelations),
  FocusedFlow: element("ol", styles.focusedFlow),
  FocusCard: layout(TerasPanel, styles.sequenceFocusCard),
};
