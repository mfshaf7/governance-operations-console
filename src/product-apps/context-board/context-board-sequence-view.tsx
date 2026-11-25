"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  TerasActionButton, TerasActionRow, TerasContentRegion, TerasEmptyState, TerasFieldStack,
  TerasMediaSnapshotViewerDialog, TerasPanel, TerasPanelHeader, TerasTechnicalDetails,
} from "@/teras";
import {
  contextBoardSequenceLabel, contextBoardSequenceLayout, contextBoardSequencePaths, contextBoardSequenceRelation,
  contextBoardSequenceRelationStyles, contextBoardSequenceStrokeWidth, contextBoardSequenceSvg, type ContextBoardSequence, type ContextBoardSequenceNode,
} from "./context-board-sequence.ts";
import styles from "./context-board-sequence.module.css";

const relationLabels = {
  change: "Merge first", start: "Before start", closeout: "Before closeout", approval: "Approval",
} as const;

export function ContextBoardSequenceView({
  plan, sourceLabel, controls, renderDetails, renderTitle, fit = "content", initialScale, showImageViewer = true,
  selectedId, onSelectNode, onBack,
}: {
  fit?: "content" | "workspace" | "embedded";
  plan: ContextBoardSequence;
  sourceLabel: string;
  controls?: ReactNode;
  renderDetails?: (node: ContextBoardSequenceNode) => ReactNode;
  renderTitle?: (node: ContextBoardSequenceNode) => ReactNode;
  initialScale?: number;
  showImageViewer?: boolean;
  selectedId?: string;
  onSelectNode?: (id: string) => void;
  onBack?: () => void;
}) {
  const [localFocus, setLocalFocus] = useState<{ id: string; history: string[] }>({ id: "", history: [] });
  const [scale, setScale] = useState<number | null>(initialScale ?? null);
  const [full, setFull] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const diagram = useRef<SVGSVGElement | null>(null);
  const arrow = useId();
  const compact = fit === "embedded";
  const layout = useMemo(() => contextBoardSequenceLayout(plan, compact), [plan, compact]);
  const paths = useMemo(() => contextBoardSequencePaths(plan, layout), [plan, layout]);
  const byId = useMemo(() => new Map(plan.nodes.map(node => [node.id, node])), [plan]);
  const current = byId.get(selectedId ?? localFocus.id);
  const related = new Set(current ? [current.id, ...paths.flatMap(({ edge }) =>
    edge.from === current.id ? [edge.to] : edge.to === current.id ? [edge.from] : [])] : []);
  const relations = new Set(paths.map(({ edge }) => contextBoardSequenceRelation(edge, byId.get(edge.from))));
  const hasNodes = plan.nodes.length > 0;
  const fitScale = size.width > 0 ? Math.min(1, (size.width - 2) / layout.width, (size.height - 2) / layout.height) : 1;
  const zoom = scale ?? Math.max(.01, fitScale);
  const svg = full && showImageViewer ? contextBoardSequenceSvg(plan, { compact, selectedId: current?.id }) : null;

  useEffect(() => {
    const viewport = diagram.current?.parentElement;
    if (!viewport) return;
    const resize = () => setSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [hasNodes]);

  const scrollToFocus = useCallback((id: string) => {
    const position = layout.positions.get(id);
    const viewport = diagram.current?.parentElement;
    if (!viewport || !position) return;
    viewport.scrollTo({
      left: Math.max(0, (position.x + layout.nodeWidth / 2) * zoom - size.width / 2),
      top: Math.max(0, (position.y + layout.nodeHeight / 2) * zoom - size.height / 2),
    });
  }, [layout, zoom, size.width, size.height]);

  useEffect(() => {
    if (fit === "embedded" && selectedId) scrollToFocus(selectedId);
  }, [fit, selectedId, scrollToFocus]);

  function select(id: string) {
    if (onSelectNode) onSelectNode(id);
    else setLocalFocus(previous => ({
      id: previous.id === id ? "" : id,
      history: [...previous.history, previous.id],
    }));
  }

  function goBack() {
    const id = localFocus.history.at(-1);
    if (id === undefined) return;
    setLocalFocus({ id, history: localFocus.history.slice(0, -1) });
    if (id) scrollToFocus(id);
  }

  return <TerasFieldStack spacing="compact" className={styles.workspace} data-fit={fit}>
    {fit === "content" ? <TerasPanelHeader kicker={sourceLabel} title="Implementation sequence"
      description="Read left to right. Select a node to highlight its direct connections." /> : null}
    {controls}
    {!hasNodes ? <TerasEmptyState>Add a change group or work dependency in Edit plan to build this diagram.</TerasEmptyState> : <>
      <TerasPanel className={styles.sequenceFrame} treatment="neutral" frame="flush" spacing="tight"
        layout="header-body" overflow="hidden" aria-label="Dependency diagram" data-teras-diagram-frame>
        <div className={styles.sequenceToolbar} data-teras-diagram-toolbar>
          <ul className={styles.sequenceLegend} aria-label="Arrow meanings">
            {[...relations].map(relation => {
              const { stroke, dashArray } = contextBoardSequenceRelationStyles[relation];
              return <li key={relation}>
                <svg width="22" height="6" viewBox="0 0 22 6" aria-hidden="true">
                  <path d="M 0 3 H 22" stroke={stroke} strokeWidth="2" strokeDasharray={dashArray} />
                </svg>
                {relationLabels[relation]}
              </li>;
            })}
          </ul>
          <TerasActionRow spacing="none" role="group" aria-label="Diagram controls">
            <TerasActionButton className={styles.sequenceIconAction} emphasis="secondary" size="table-compact"
              aria-label="Back to previous focus" title="Back to previous focus"
              disabled={onSelectNode ? !onBack : !localFocus.history.length} onClick={onSelectNode ? onBack : goBack}>
              <ArrowLeft size={14} aria-hidden="true" />
            </TerasActionButton>
            {current && !onSelectNode ? <TerasActionButton emphasis="secondary" size="table-compact" onClick={() => select("")}>Show all paths</TerasActionButton> : null}
            <TerasActionButton className={styles.sequenceIconAction} emphasis="secondary" size="table-compact"
              aria-label="Zoom out" title="Zoom out" disabled={zoom <= .05} onClick={() => setScale(Math.max(.05, zoom / 1.35))}>−</TerasActionButton>
            <TerasActionButton className={styles.sequenceIconAction} emphasis="secondary" size="table-compact"
              aria-label="Zoom in" title="Zoom in" disabled={zoom >= 2} onClick={() => setScale(Math.min(2, Math.max(.15, zoom * 1.35)))}>+</TerasActionButton>
            <TerasActionButton emphasis="secondary" size="table-compact" aria-label="Fit diagram" title="Fit diagram"
              onClick={() => { setScale(null); diagram.current?.parentElement?.scrollTo({ top: 0, left: 0 }); }}>Fit</TerasActionButton>
            {showImageViewer ? <TerasActionButton emphasis="secondary" size="table-compact" aria-label="View diagram" title="View diagram"
              onClick={() => setFull(true)}>View<span className={styles.sequenceViewerSuffix}> diagram</span></TerasActionButton> : null}
          </TerasActionRow>
        </div>
        <TerasContentRegion scroll className={styles.sequenceCanvas} aria-label="Implementation sequence canvas" tabIndex={0}
          data-teras-diagram-canvas style={{ height: compact ? layout.height + 18 : undefined }}>
          <svg ref={diagram} width={layout.width * zoom} height={layout.height * zoom}
            viewBox={`0 0 ${layout.width} ${layout.height}`} role="group" aria-label="Select a change or work item">
            <defs>
              {[...relations].map(relation => <marker key={relation} id={`${arrow}-${relation}`} markerWidth="9" markerHeight="10"
                refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                <path className={styles.sequenceArrow} stroke={contextBoardSequenceRelationStyles[relation].stroke} d="M 1 1 L 8 5 L 1 9" />
              </marker>)}
            </defs>
            {layout.unlinkedY !== null ? <>
              <line className={styles.sequenceDivider} x1={29} y1={layout.unlinkedY - 22} x2={layout.width - 29} y2={layout.unlinkedY - 22} />
              <text className={styles.sequenceDividerLabel} x={29} y={layout.unlinkedY}>Items with no recorded links</text>
            </> : null}
            {paths.map(({ edge, index, d }) => {
              const relation = contextBoardSequenceRelation(edge, byId.get(edge.from));
              const { stroke, dashArray } = contextBoardSequenceRelationStyles[relation];
              return <path key={index} className={styles.sequenceEdge} data-relation={relation}
                data-dim={Boolean(current && edge.from !== current.id && edge.to !== current.id)}
                stroke={stroke} strokeWidth={contextBoardSequenceStrokeWidth} strokeDasharray={dashArray}
                d={d} markerEnd={`url(#${arrow}-${relation})`}><title>{edge.label}</title></path>;
            })}
            {plan.nodes.map((node, index) => {
              const at = layout.positions.get(node.id)!;
              return <g key={`${node.id}:${index}`} role="button" tabIndex={0} aria-label={`Inspect ${node.title}`}
                aria-pressed={current?.id === node.id} className={styles.sequenceNode} data-dim={Boolean(current) && !related.has(node.id)}
                onClick={() => select(node.id)} onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(node.id); }
                }}>
                <title>{node.title} — {node.detail}</title>
                <rect x={at.x} y={at.y} width={layout.nodeWidth} height={layout.nodeHeight} rx={10} data-kind={node.kind} data-selected={current?.id === node.id} />
                <text x={at.x + 14} y={at.y + 24} className={styles.sequenceKicker}>
                  {node.kind === "approval" ? "REQUIRED APPROVAL" : node.kind === "change" ? "CHANGE GROUP" : "WORK ITEM"}
                </text>
                {contextBoardSequenceLabel(node.title, compact ? 25 : 34).map((line, index) =>
                  <text key={index} x={at.x + 14} y={at.y + 49 + index * 17} className={styles.sequenceLabel}>
                    {index === 0 && node.reference && line.startsWith(node.reference) ? <>
                      <tspan className={styles.sequenceKicker}>{node.reference}</tspan>{line.slice(node.reference.length)}
                    </> : line}
                  </text>)}
              </g>;
            })}
          </svg>
        </TerasContentRegion>
      </TerasPanel>
      {fit !== "embedded" && layout.cyclic ? <TerasEmptyState>This draft contains a dependency cycle. Review the linked items before validation.</TerasEmptyState> : null}
      {fit !== "embedded" && plan.issues.length ? <TerasTechnicalDetails summary="Sequence issues"
        items={plan.issues.map((value, index) => ({ label: `Issue ${index + 1}`, value }))} /> : null}
      {current && renderDetails ? <TerasPanel frame="padded" spacing="normal" treatment="neutral">
        <TerasPanelHeader kicker={current.kind === "approval" ? "Required approval" : "Selected plan element"}
          title={renderTitle ? renderTitle(current) : current.title} description={current.detail} />
        <TerasTechnicalDetails summary="Selected element details" items={[]}>{renderDetails(current)}</TerasTechnicalDetails>
      </TerasPanel> : null}
    </>}
    {svg ? <TerasMediaSnapshotViewerDialog open={full} onClose={() => setFull(false)} kicker={sourceLabel}
      title="Dependency diagram viewer" toolbarTitle="Implementation sequence"
      description="Zoom in or open fullscreen to inspect the current diagram."
      imageSrc={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} imageAlt="Implementation sequence from recorded plan facts" /> : null}
  </TerasFieldStack>;
}
