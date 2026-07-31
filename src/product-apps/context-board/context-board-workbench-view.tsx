"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowRight,
  BringToFront,
  Brush,
  ChevronDown,
  Circle,
  Component,
  Container,
  Copy,
  Diamond,
  Eraser,
  GitBranch,
  Highlighter,
  Layers,
  MapIcon,
  Maximize2,
  Minus,
  MoveIcon,
  MousePointer2,
  PencilLine,
  RectangleHorizontal,
  Redo2,
  RotateCcw,
  Rows3,
  Settings2,
  SendToBack,
  Shapes,
  Spline,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  UserRound,
  Waypoints,
  Workflow,
  X,
} from "lucide-react";
import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";

import styles from "@/product-apps/context-board/context-board-workbench.module.css";
import {
  CONTEXT_BOARD_HEIGHT,
  CONTEXT_BOARD_MAX_ZOOM,
  CONTEXT_BOARD_MIN_ZOOM,
  CONTEXT_BOARD_WIDTH,
  CONTEXT_BOARD_ZOOM_STEP,
  contextBoardConnectorMidpoint,
  contextBoardConnectorPath,
  contextBoardConnectorPointAt,
  contextBoardOppositeSide,
  contextBoardSelectionKey,
  contextBoardSelectionRect,
} from "./context-board-core";
import {
  contextBoardBasicShapeKinds,
  contextBoardConnectionTone,
  contextBoardConnectorMarkerId,
  contextBoardConnectorMarkerStyle,
  contextBoardConnectorPathStyle,
  contextBoardCustomDetailRows,
  contextBoardCustomItemResolvedSize,
  contextBoardCustomKindCopy,
  contextBoardCustomKindHasDetail,
  contextBoardCustomKindHasKicker,
  contextBoardCustomKindHasPorts,
  contextBoardDiagramCopy,
  contextBoardDiagramLabelSectionLabel,
  contextBoardDiagramToolLabel,
  contextBoardDiagramTypes,
  contextBoardGeneralComponentKinds,
  contextBoardLabelKinds,
  contextBoardSketchPath,
  contextBoardSketchToolCopy,
  contextBoardStyleCopy,
  contextBoardStylePalettePosition,
  contextBoardStyleTargetSurface,
} from "./context-board-template-helpers";
import type {
  ContextBoardConnectorShape,
  ContextBoardConnectorStroke,
  ContextBoardConnectorTip,
  ContextBoardConnectorTone,
  ContextBoardItemType,
  ContextBoardPortSide,
  ContextBoardSketchTone,
  ContextBoardSketchTool,
  ContextBoardStyle,
  ContextBoardTone as ContextBoardColorTone,
} from "./context-board-model";
import type { ContextBoardController } from "./use-context-board-controller";

type ContextBoardColorCopy = {
  label: string;
  title: string;
  tone: ContextBoardColorTone;
};

const contextBoardColorOptions: ContextBoardColorCopy[] = [
  { label: "Default", title: "Reset to diagram default color", tone: "default" },
  { label: "Blue", title: "Apply blue information tone", tone: "blue" },
  { label: "Amber", title: "Apply amber decision tone", tone: "amber" },
  { label: "Green", title: "Apply green completed tone", tone: "green" },
  { label: "Red", title: "Apply red risk tone", tone: "red" },
  { label: "Purple", title: "Apply purple system tone", tone: "purple" },
  { label: "Neutral", title: "Apply neutral muted tone", tone: "neutral" },
];

const contextBoardConnectorToneOptions: Array<
  Omit<ContextBoardColorCopy, "tone"> & { tone: ContextBoardConnectorTone }
> = [
  { label: "Amber", title: "Use amber connector color", tone: "amber" },
  { label: "Blue", title: "Use blue connector color", tone: "blue" },
  { label: "Green", title: "Use green connector color", tone: "green" },
  { label: "Red", title: "Use red connector color", tone: "red" },
  { label: "Purple", title: "Use purple connector color", tone: "purple" },
  { label: "Neutral", title: "Use neutral connector color", tone: "neutral" },
];

const contextBoardSketchTools: ContextBoardSketchTool[] = [
  "pen",
  "marker",
  "highlighter",
  "eraser",
];

const contextBoardSketchToneOptions: Array<{
  label: string;
  title: string;
  tone: ContextBoardSketchTone;
}> = [
  { label: "Black", title: "Use black sketch color", tone: "black" },
  { label: "White", title: "Use white sketch color", tone: "white" },
  { label: "Charcoal", title: "Use dark charcoal sketch color", tone: "charcoal" },
  { label: "Navy", title: "Use dark navy sketch color", tone: "navy" },
  { label: "Forest", title: "Use dark forest sketch color", tone: "forest" },
  { label: "Burgundy", title: "Use dark burgundy sketch color", tone: "burgundy" },
  { label: "Amber", title: "Use amber sketch color", tone: "amber" },
  { label: "Blue", title: "Use blue sketch color", tone: "blue" },
  { label: "Red", title: "Use red sketch color", tone: "red" },
  { label: "Purple", title: "Use purple sketch color", tone: "purple" },
];

const contextBoardEditorFieldProps = {
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false,
} as const;

export type ContextBoardWorkbenchCopy = {
  emptyDetail: string;
  emptyLabel: string;
  emptyTitle: string;
  lockDetail: string;
  lockLabel: string;
  lockTitle: string;
  readonlySummaryDetail: string;
  readonlySummaryTitle: string;
  stageAriaLabel: string;
  summaryDetail: string;
  summaryTitle: string;
  topbarDetail: string;
  topbarLabel: string;
  topbarTitle: string;
};

export type ContextBoardWorkbenchSourceSlotProps = {
  collapsed: boolean;
  onToggle: () => void;
  style: CSSProperties;
};

type ContextBoardWorkbenchViewProps = {
  board: ContextBoardController;
  copy: ContextBoardWorkbenchCopy;
  rail: ReactNode;
  sourceOverlay?: (props: ContextBoardWorkbenchSourceSlotProps) => ReactNode;
};

export function ContextBoardWorkbenchView({
  board,
  copy,
  rail,
  sourceOverlay,
}: ContextBoardWorkbenchViewProps) {
  const {
    contextBoardActiveToolDrawer,
    contextBoardCanvasRef,
    contextBoardCanAlignSelection,
    contextBoardCanDistributeSelection,
    contextBoardCanLayerSelection,
    contextBoardComponentKinds,
    contextBoardConnectionDraft,
    contextBoardConnectorShape,
    setContextBoardConnectorShape,
    contextBoardConnectorStartTip,
    setContextBoardConnectorStartTip,
    contextBoardConnectorStroke,
    setContextBoardConnectorStroke,
    contextBoardConnectorTip,
    setContextBoardConnectorTip,
    contextBoardConnectorTone,
    setContextBoardConnectorTone,
    contextBoardCoreNodes,
    contextBoardCustomItems,
    contextBoardDiagramLabelPresets,
    contextBoardDiagramType,
    contextBoardDrag,
    contextBoardFloatingSourcesStyle,
    contextBoardHasContent,
    contextBoardHoveredConnectionId,
    setContextBoardHoveredConnectionId,
    contextBoardInputsCollapsed,
    setContextBoardInputsCollapsed,
    contextBoardPan,
    contextBoardPositions,
    contextBoardSelectedItems,
    contextBoardSelectedKeys,
    contextBoardSelectionBox,
    contextBoardSketchDraft,
    contextBoardSketchStrokes,
    contextBoardSketchTone,
    setContextBoardSketchTone,
    contextBoardSketchTool,
    setContextBoardSketchTool,
    contextBoardStyle,
    contextBoardStyleTarget,
    setContextBoardStyleTarget,
    contextBoardTemplateTrays,
    contextBoardTool,
    setContextBoardTool,
    contextBoardToolSectionCollapsed,
    contextBoardToolSectionSummary,
    contextBoardToolsCollapsed,
    setContextBoardViewportTick,
    contextBoardVisibleConnections,
    contextBoardZoom,
    contextBriefReadOnly,
    contextBriefReady,
    canRedoContextBoard,
    canUndoContextBoard,
    addContextBoardDiagramLabel,
    addContextBoardItem,
    addContextBoardStarter,
    addContextBoardTray,
    alignContextBoardSelection,
    cancelContextBoardConnection,
    distributeContextBoardSelection,
    duplicateContextBoardConnection,
    duplicateContextBoardCustomItem,
    endContextBoardConnection,
    endContextBoardDrag,
    endContextBoardNavigatorPan,
    endContextBoardPan,
    endContextBoardTemplateResize,
    fitContextBoardContent,
    focusSelectedContextBoardItems,
    getContextBoardAllSurfaceBoxes,
    getContextBoardConnectionPoint,
    getContextBoardViewportSurface,
    layerContextBoardSelection,
    moveContextBoardConnection,
    moveContextBoardDrag,
    moveContextBoardNavigatorPan,
    moveContextBoardPan,
    moveContextBoardTemplateResize,
    redoContextBoardAction,
    removeContextBoardConnection,
    removeContextBoardItem,
    requestRemoveContextBoardTemplateTray,
    requestResetContextBoardLayout,
    setContextBoardPrimaryTool,
    setContextBoardZoomClamped,
    startContextBoardCustomResize,
    startContextBoardDrag,
    startContextBoardNavigatorPan,
    startContextBoardPan,
    startContextBoardReconnect,
    startContextBoardTemplateResize,
    startNearestContextBoardConnection,
    toggleContextBoardToolDrawer,
    toggleContextBoardToolSection,
    undoContextBoardAction,
    updateContextBoardColorTone,
    updateContextBoardDiagramType,
    updateContextBoardItemContent,
    updateContextBoardStyle,
  } = board;

  function renderContextBoardNavigator() {
    const surfaces = getContextBoardAllSurfaceBoxes();
    const viewport = getContextBoardViewportSurface();

    return (
      <div
        className={styles.contextBoardNavigator}
        data-board-control="true"
        data-has-content={surfaces.length > 0 ? "true" : "false"}
      >
        <div className={styles.contextBoardNavigatorHeader}>
          <span>Board Map</span>
          <small>{surfaces.length} items</small>
        </div>
        <div
          aria-label="Board navigator"
          className={styles.contextBoardNavigatorMap}
          onPointerCancel={endContextBoardNavigatorPan}
          onPointerDown={startContextBoardNavigatorPan}
          onPointerMove={moveContextBoardNavigatorPan}
          onPointerUp={endContextBoardNavigatorPan}
          role="button"
          tabIndex={0}
        >
          {surfaces.map((surface) => (
            <span
              aria-hidden="true"
              className={styles.contextBoardNavigatorItem}
              data-selected={
                contextBoardSelectedKeys.has(contextBoardSelectionKey(surface))
                  ? "true"
                  : "false"
              }
              data-type={surface.itemType}
              key={contextBoardSelectionKey(surface)}
              style={
                {
                  "--map-height": `${(surface.height / CONTEXT_BOARD_HEIGHT) * 100}%`,
                  "--map-width": `${(surface.width / CONTEXT_BOARD_WIDTH) * 100}%`,
                  "--map-x": `${(surface.x / CONTEXT_BOARD_WIDTH) * 100}%`,
                  "--map-y": `${(surface.y / CONTEXT_BOARD_HEIGHT) * 100}%`,
                } as CSSProperties
              }
            />
          ))}
          {viewport ? (
            <span
              aria-hidden="true"
              className={styles.contextBoardNavigatorViewport}
              style={
                {
                  "--map-height": `${(viewport.height / CONTEXT_BOARD_HEIGHT) * 100}%`,
                  "--map-width": `${(viewport.width / CONTEXT_BOARD_WIDTH) * 100}%`,
                  "--map-x": `${(viewport.x / CONTEXT_BOARD_WIDTH) * 100}%`,
                  "--map-y": `${(viewport.y / CONTEXT_BOARD_HEIGHT) * 100}%`,
                } as CSSProperties
              }
            />
          ) : null}
        </div>
      </div>
    );
  }

  function renderContextBoardPorts(
    itemType: ContextBoardItemType,
    itemId: string,
  ) {
    if (contextBriefReadOnly) {
      return null;
    }

    return (
      <div
        className={styles.contextBoardPorts}
        data-board-control="true"
        onPointerCancel={cancelContextBoardConnection}
        onPointerDown={startNearestContextBoardConnection}
        onPointerMove={moveContextBoardConnection}
        onPointerUp={endContextBoardConnection}
      >
        {(["top", "right", "bottom", "left"] as ContextBoardPortSide[]).map(
          (side) => (
            <button
              aria-label={`Connect ${side} side`}
              className={styles.contextBoardPort}
              data-board-control="true"
              data-board-item-id={itemId}
              data-board-item-type={itemType}
              data-board-port="true"
              data-board-side={side}
              data-side={side}
              key={side}
              title={`Connect from ${side}`}
              type="button"
            />
          ),
        )}
      </div>
    );
  }

  function renderContextBoardStylePalette() {
    if (contextBriefReadOnly) {
      return null;
    }

    const styleSurface = contextBoardStyleTargetSurface(
      contextBoardStyleTarget,
      contextBoardCustomItems,
      contextBoardTemplateTrays,
    );

    if (!styleSurface) {
      return null;
    }

    const palettePosition = contextBoardStylePalettePosition(
      styleSurface,
      contextBoardCanvasRef.current,
      contextBoardZoom,
    );
    const canvas = contextBoardCanvasRef.current;
    const paletteX = canvas
      ? palettePosition.x * contextBoardZoom - canvas.scrollLeft
      : palettePosition.x;
    const paletteY = canvas
      ? palettePosition.y * contextBoardZoom - canvas.scrollTop
      : palettePosition.y;

    return (
      <div
        aria-label={`Style ${styleSurface.label}`}
        className={styles.contextBoardStylePalette}
        data-board-control="true"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        role="group"
        style={
          {
            "--board-x": `${paletteX}px`,
            "--board-y": `${paletteY}px`,
            "--palette-zoom": contextBoardZoom,
          } as CSSProperties
        }
      >
        <div>
          {contextBoardColorOptions.map((option) => (
            <button
              aria-label={option.title}
              aria-pressed={styleSurface.tone === option.tone}
              data-tone={option.tone}
              key={option.tone}
              onClick={() => updateContextBoardColorTone(option.tone)}
              title={option.title}
              type="button"
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderContextBoardEmptyHint() {
    const canvas = contextBoardCanvasRef.current;

    return (
      <div
        className={styles.contextBoardEmptyHint}
        style={
          {
            "--empty-hint-x": `${canvas ? canvas.clientWidth / 2 : 460}px`,
            "--empty-hint-y": `${canvas ? canvas.clientHeight / 2 : 300}px`,
          } as CSSProperties
        }
      >
        <span>{copy.emptyLabel}</span>
        <strong>{copy.emptyTitle}</strong>
        <small>{copy.emptyDetail}</small>
      </div>
    );
  }


  return (
          <div className={styles.contextBoardWorkspace}>
            <section
              className={styles.contextBoardStage}
              data-read-only={contextBriefReadOnly ? "true" : "false"}
              data-style={contextBoardStyle}
              aria-label={copy.stageAriaLabel}
            >
              <div className={styles.contextBoardTopbar}>
                <div>
                  <p>{copy.topbarLabel}</p>
                  <h3>{copy.topbarTitle}</h3>
                  <span>{copy.topbarDetail}</span>
                </div>
              </div>

              <div
                className={styles.contextBoardCanvas}
                data-panning={contextBoardPan ? "true" : "false"}
                data-tool={contextBoardTool}
                onPointerCancel={endContextBoardPan}
                onPointerDown={startContextBoardPan}
                onPointerMove={moveContextBoardPan}
                onPointerUp={endContextBoardPan}
                onScroll={() => setContextBoardViewportTick((tick) => tick + 1)}
                ref={contextBoardCanvasRef}
              >
                <div className={styles.contextBoardFloatingLayer} data-board-control="true">
                  {contextBriefReadOnly ? (
                    <div className={styles.contextBoardLockNotice}>
                      <span>{copy.lockLabel}</span>
                      <strong>{copy.lockTitle}</strong>
                      <small>{copy.lockDetail}</small>
                    </div>
                  ) : null}
                  <div
                    className={styles.contextBoardToolDock}
                    data-collapsed={contextBoardToolsCollapsed ? "true" : "false"}
                  >
                      <div className={styles.contextBoardToolDockBody}>
                      <div className={styles.contextBoardToolRail} aria-label="Canvas tools">
                          <button
                            aria-label="Select items"
                            aria-pressed={contextBoardTool === "select"}
                            onClick={() => setContextBoardPrimaryTool("select")}
                            title="Select items"
                            type="button"
                          >
                            <MousePointer2 aria-hidden="true" size={18} />
                            <span>Select</span>
                          </button>
                          <button
                            aria-label="Move cards"
                            aria-pressed={contextBoardTool === "move"}
                            onClick={() => setContextBoardPrimaryTool("move")}
                            title="Move cards"
                            type="button"
                          >
                            <MoveIcon aria-hidden="true" size={18} />
                            <span>Move</span>
                          </button>
                          <button
                            aria-label="Open arrange tools"
                            aria-expanded={
                              contextBoardActiveToolDrawer === "arrange" &&
                              !contextBoardToolsCollapsed
                            }
                            aria-pressed={
                              contextBoardActiveToolDrawer === "arrange" &&
                              !contextBoardToolsCollapsed
                            }
                            onClick={() => toggleContextBoardToolDrawer("arrange")}
                            title="Open arrange tools"
                            type="button"
                          >
                            <Layers aria-hidden="true" size={18} />
                            <span>Arrange</span>
                          </button>
                          <button
                            aria-label="Open board style"
                            aria-expanded={
                              contextBoardActiveToolDrawer === "style" &&
                              !contextBoardToolsCollapsed
                            }
                            aria-pressed={
                              contextBoardActiveToolDrawer === "style" &&
                              !contextBoardToolsCollapsed
                            }
                            onClick={() => toggleContextBoardToolDrawer("style")}
                            title="Open board style"
                            type="button"
                          >
                            <Settings2 aria-hidden="true" size={18} />
                            <span>Style</span>
                          </button>
                          <button
                            aria-label="Open diagram tools"
                            aria-expanded={
                              contextBoardActiveToolDrawer === "diagram" &&
                              !contextBoardToolsCollapsed
                            }
                            aria-pressed={
                              contextBoardActiveToolDrawer === "diagram" &&
                              !contextBoardToolsCollapsed
                            }
                            onClick={() => toggleContextBoardToolDrawer("diagram")}
                            title="Open diagram tools"
                            type="button"
                          >
                            <Workflow aria-hidden="true" size={18} />
                            <span>Diagram</span>
                          </button>
                          <button
                            aria-label="Connector settings"
                            aria-expanded={
                              contextBoardActiveToolDrawer === "connector" &&
                              !contextBoardToolsCollapsed
                            }
                            aria-pressed={
                              contextBoardActiveToolDrawer === "connector" &&
                              !contextBoardToolsCollapsed
                            }
                            onClick={() => {
                              setContextBoardTool("connect");
                              toggleContextBoardToolDrawer("connector");
                            }}
                            title="Connector settings"
                            type="button"
                          >
                            <GitBranch aria-hidden="true" size={18} />
                            <span>Connector</span>
                          </button>
                          <button
                            aria-label="Sketch on board"
                            aria-expanded={
                              contextBoardActiveToolDrawer === "sketch" &&
                              !contextBoardToolsCollapsed
                            }
                            aria-pressed={
                              contextBoardActiveToolDrawer === "sketch" &&
                              !contextBoardToolsCollapsed
                            }
                            onClick={() => {
                              setContextBoardTool("sketch");
                              toggleContextBoardToolDrawer("sketch");
                            }}
                            title="Sketch on board"
                            type="button"
                          >
                            <PencilLine aria-hidden="true" size={18} />
                            <span>Sketch</span>
                          </button>
                          <button
                            aria-label="Open general tools"
                            aria-expanded={
                              contextBoardActiveToolDrawer === "general" &&
                              !contextBoardToolsCollapsed
                            }
                            aria-pressed={
                              contextBoardActiveToolDrawer === "general" &&
                              !contextBoardToolsCollapsed
                            }
                            onClick={() => toggleContextBoardToolDrawer("general")}
                            title="Open general tools"
                            type="button"
                          >
                            <Shapes aria-hidden="true" size={18} />
                            <span>General</span>
                          </button>
                          <span aria-hidden="true" className={styles.contextBoardToolDivider} />

                          <button
                            aria-label="Undo board action"
                            disabled={!canUndoContextBoard}
                            onClick={undoContextBoardAction}
                            title="Undo board action"
                            type="button"
                          >
                            <Undo2 aria-hidden="true" size={18} />
                            <span>Undo</span>
                          </button>
                          <button
                            aria-label="Redo board action"
                            disabled={!canRedoContextBoard}
                            onClick={redoContextBoardAction}
                            title="Redo board action"
                            type="button"
                          >
                            <Redo2 aria-hidden="true" size={18} />
                            <span>Redo</span>
                          </button>
                          <button
                            aria-label="Reset board layout"
                            onClick={requestResetContextBoardLayout}
                            title="Reset board layout"
                            type="button"
                          >
                            <RotateCcw aria-hidden="true" size={18} />
                            <span>Reset</span>
                          </button>
                      </div>

                      {!contextBoardToolsCollapsed ? (
                        <div className={styles.contextBoardToolOptions}>
                          <div
                            className={styles.contextBoardToolOptionGroup}
                            data-collapsed={contextBoardToolSectionCollapsed.arrange ? "true" : "false"}
                          >
                            {!contextBoardToolSectionCollapsed.arrange ? (
                              <div className={styles.contextBoardToolSectionBody}>
                                <div className={styles.contextBoardToolSubsection}>
                                  <div className={styles.contextBoardToolSubsectionHeader}>
                                    <span>
                                      <Layers aria-hidden="true" size={12} />
                                      Align
                                    </span>
                                    <small>{contextBoardSelectedItems.length} selected</small>
                                  </div>
                                  <div className={styles.contextBoardToolOptionGrid}>
                                    <button
                                      disabled={!contextBoardCanAlignSelection}
                                      onClick={() => alignContextBoardSelection("align-left")}
                                      title="Align selected items to the left edge"
                                      type="button"
                                    >
                                      <AlignStartVertical aria-hidden="true" size={13} />
                                      <span>Left</span>
                                    </button>
                                    <button
                                      disabled={!contextBoardCanAlignSelection}
                                      onClick={() => alignContextBoardSelection("align-center-x")}
                                      title="Align selected items to the horizontal center"
                                      type="button"
                                    >
                                      <AlignCenterVertical aria-hidden="true" size={13} />
                                      <span>Center X</span>
                                    </button>
                                    <button
                                      disabled={!contextBoardCanAlignSelection}
                                      onClick={() => alignContextBoardSelection("align-right")}
                                      title="Align selected items to the right edge"
                                      type="button"
                                    >
                                      <AlignEndVertical aria-hidden="true" size={13} />
                                      <span>Right</span>
                                    </button>
                                    <button
                                      disabled={!contextBoardCanAlignSelection}
                                      onClick={() => alignContextBoardSelection("align-top")}
                                      title="Align selected items to the top edge"
                                      type="button"
                                    >
                                      <AlignStartHorizontal aria-hidden="true" size={13} />
                                      <span>Top</span>
                                    </button>
                                    <button
                                      disabled={!contextBoardCanAlignSelection}
                                      onClick={() => alignContextBoardSelection("align-center-y")}
                                      title="Align selected items to the vertical center"
                                      type="button"
                                    >
                                      <AlignCenterHorizontal aria-hidden="true" size={13} />
                                      <span>Center Y</span>
                                    </button>
                                    <button
                                      disabled={!contextBoardCanAlignSelection}
                                      onClick={() => alignContextBoardSelection("align-bottom")}
                                      title="Align selected items to the bottom edge"
                                      type="button"
                                    >
                                      <AlignEndHorizontal aria-hidden="true" size={13} />
                                      <span>Bottom</span>
                                    </button>
                                  </div>
                                </div>

                                <div className={styles.contextBoardToolSubsection}>
                                  <div className={styles.contextBoardToolSubsectionHeader}>
                                    <span>
                                      <AlignHorizontalDistributeCenter aria-hidden="true" size={12} />
                                      Distribute
                                    </span>
                                    <small>3+ items</small>
                                  </div>
                                  <div className={styles.contextBoardToolOptionGrid}>
                                    <button
                                      disabled={!contextBoardCanDistributeSelection}
                                      onClick={() =>
                                        distributeContextBoardSelection("distribute-horizontal")
                                      }
                                      title="Distribute selected items horizontally"
                                      type="button"
                                    >
                                      <AlignHorizontalDistributeCenter aria-hidden="true" size={13} />
                                      <span>Horizontal</span>
                                    </button>
                                    <button
                                      disabled={!contextBoardCanDistributeSelection}
                                      onClick={() =>
                                        distributeContextBoardSelection("distribute-vertical")
                                      }
                                      title="Distribute selected items vertically"
                                      type="button"
                                    >
                                      <AlignVerticalDistributeCenter aria-hidden="true" size={13} />
                                      <span>Vertical</span>
                                    </button>
                                  </div>
                                </div>

                                <div className={styles.contextBoardToolSubsection}>
                                  <div className={styles.contextBoardToolSubsectionHeader}>
                                    <span>
                                      <BringToFront aria-hidden="true" size={12} />
                                      Layer
                                    </span>
                                    <small>cards only</small>
                                  </div>
                                  <div className={styles.contextBoardToolOptionGrid}>
                                    <button
                                      disabled={!contextBoardCanLayerSelection}
                                      onClick={() => layerContextBoardSelection("bring-front")}
                                      title="Bring selected cards and frames forward"
                                      type="button"
                                    >
                                      <BringToFront aria-hidden="true" size={13} />
                                      <span>Front</span>
                                    </button>
                                    <button
                                      disabled={!contextBoardCanLayerSelection}
                                      onClick={() => layerContextBoardSelection("send-back")}
                                      title="Send selected cards and frames backward"
                                      type="button"
                                    >
                                      <SendToBack aria-hidden="true" size={13} />
                                      <span>Back</span>
                                    </button>
                                  </div>
                                </div>

                                <div className={styles.contextBoardToolSubsection}>
                                  <div className={styles.contextBoardToolSubsectionHeader}>
                                    <span>
                                      <Maximize2 aria-hidden="true" size={12} />
                                      View
                                    </span>
                                    <small>canvas</small>
                                  </div>
                                  <div className={styles.contextBoardToolMiniActions}>
                                    <button
                                      disabled={contextBoardSelectedItems.length === 0}
                                      onClick={focusSelectedContextBoardItems}
                                      title="Center selected board items"
                                      type="button"
                                    >
                                      Center Selected
                                    </button>
                                    <button
                                      onClick={fitContextBoardContent}
                                      title="Fit current board content in view"
                                      type="button"
                                    >
                                      Fit Content
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div
                            className={styles.contextBoardToolOptionGroup}
                            data-collapsed={contextBoardToolSectionCollapsed.style ? "true" : "false"}
                          >
                            <button
                              aria-expanded={!contextBoardToolSectionCollapsed.style}
                              className={styles.contextBoardToolSectionHeader}
                              onClick={() => toggleContextBoardToolSection("style")}
                              type="button"
                            >
                              <span>
                                <Settings2 aria-hidden="true" size={12} />
                                Board Style
                              </span>
                              <small>{contextBoardToolSectionSummary("style")}</small>
                              <ChevronDown aria-hidden="true" size={12} />
                            </button>
                            {!contextBoardToolSectionCollapsed.style ? (
                              <div className={styles.contextBoardToolSectionBody}>
                            <div className={styles.contextBoardToolSelectorGrid}>
                            {(["architecture", "flow", "map", "plain"] as ContextBoardStyle[]).map(
                              (style) => (
                                <button
                                  aria-label={`${contextBoardStyleCopy(style).label} board style`}
                                  aria-pressed={contextBoardStyle === style}
                                  key={style}
                                  onClick={() => updateContextBoardStyle(style)}
                                  title={`${contextBoardStyleCopy(style).label} board style`}
                                  type="button"
                                >
                                  {style === "architecture" ? (
                                    <RectangleHorizontal aria-hidden="true" size={13} />
                                  ) : style === "flow" ? (
                                    <Rows3 aria-hidden="true" size={13} />
                                  ) : style === "plain" ? (
                                    <Circle aria-hidden="true" size={13} />
                                  ) : (
                                    <MapIcon aria-hidden="true" size={13} />
                                  )}
                                  <span>{contextBoardStyleCopy(style).label}</span>
                                </button>
                              ),
                            )}
                            </div>
                              </div>
                            ) : null}
                          </div>

                          <div
                            className={styles.contextBoardToolOptionGroup}
                            data-collapsed={contextBoardToolSectionCollapsed.diagram ? "true" : "false"}
                          >
                            <button
                              aria-expanded={!contextBoardToolSectionCollapsed.diagram}
                              className={styles.contextBoardToolSectionHeader}
                              onClick={() => toggleContextBoardToolSection("diagram")}
                              type="button"
                            >
                              <span>
                                <Shapes aria-hidden="true" size={12} />
                                Diagram Type
                              </span>
                              <small>{contextBoardToolSectionSummary("diagram")}</small>
                              <ChevronDown aria-hidden="true" size={12} />
                            </button>
                            {!contextBoardToolSectionCollapsed.diagram ? (
                              <div className={styles.contextBoardToolSectionBody}>
                            <div className={styles.contextBoardToolSelectorGrid}>
                              {contextBoardDiagramTypes.map((diagramType) => (
                                <button
                                  aria-label={`Use ${contextBoardDiagramCopy(diagramType).label} components`}
                                  aria-pressed={contextBoardDiagramType === diagramType}
                                  key={diagramType}
                                  onClick={() =>
                                    updateContextBoardDiagramType(diagramType)
                                  }
                                  title={`Use ${contextBoardDiagramCopy(diagramType).label} components`}
                                  type="button"
                                >
                                  {diagramType === "flowchart" ? (
                                    <Workflow aria-hidden="true" size={13} />
                                  ) : diagramType === "sequence" ? (
                                    <GitBranch aria-hidden="true" size={13} />
                                  ) : diagramType === "uml" ? (
                                    <Component aria-hidden="true" size={13} />
                                  ) : diagramType === "c4" ? (
                                    <Container aria-hidden="true" size={13} />
                                  ) : diagramType === "dependency" ? (
                                    <Waypoints aria-hidden="true" size={13} />
                                  ) : diagramType === "swimlane" ? (
                                    <Rows3 aria-hidden="true" size={13} />
                                  ) : diagramType === "mindmap" ? (
                                    <MapIcon aria-hidden="true" size={13} />
                                  ) : (
                                    <StickyNote aria-hidden="true" size={13} />
                                  )}
                                  <span>{contextBoardDiagramToolLabel(diagramType)}</span>
                                </button>
                              ))}
                          </div>
                          <div className={styles.contextBoardToolMiniActions}>
                            <button
                              className={styles.contextBoardToolTemplateAction}
                              onClick={() => addContextBoardStarter()}
                              title={`Add ${contextBoardDiagramCopy(contextBoardDiagramType).label} template`}
                              type="button"
                            >
                              Add {contextBoardDiagramCopy(contextBoardDiagramType).label} Template
                            </button>
                          </div>
                              </div>
                            ) : null}
                        </div>

                          <div
                            className={styles.contextBoardToolOptionGroup}
                            data-collapsed={contextBoardToolSectionCollapsed.general ? "true" : "false"}
                          >
                            {!contextBoardToolSectionCollapsed.general ? (
                              <div className={styles.contextBoardToolSectionBody}>
                                <div className={styles.contextBoardToolSubsection}>
                                  <div className={styles.contextBoardToolSubsectionHeader}>
                                    <span>
                                      <Component aria-hidden="true" size={12} />
                                      Components
                                    </span>
                                    <small>{contextBoardGeneralComponentKinds.length + 1} tools</small>
                                  </div>
                                  <div className={styles.contextBoardToolOptionGrid}>
                                    <button
                                      aria-label="Add freeform frame"
                                      data-kind="freeform-frame"
                                      onClick={addContextBoardTray}
                                      title="Add freeform frame"
                                      type="button"
                                    >
                                      <RectangleHorizontal aria-hidden="true" size={13} />
                                      <span>Frame</span>
                                    </button>
                                    {contextBoardGeneralComponentKinds.map((kind) => {
                                      const generalCopy =
                                        contextBoardCustomKindCopy(kind);

                                      return (
                                        <button
                                          aria-label={`Add ${generalCopy.label}`}
                                          data-kind={kind}
                                          key={kind}
                                          onClick={() => addContextBoardItem(kind)}
                                          title={`Add ${generalCopy.label}`}
                                          type="button"
                                        >
                                          {kind === "note" ? (
                                            <StickyNote aria-hidden="true" size={13} />
                                          ) : kind === "text" ? (
                                            <Type aria-hidden="true" size={13} />
                                          ) : kind === "process" ? (
                                            <Workflow aria-hidden="true" size={13} />
                                          ) : kind === "component" ? (
                                            <Component aria-hidden="true" size={13} />
                                          ) : (
                                            <RectangleHorizontal aria-hidden="true" size={13} />
                                          )}
                                          <span>{generalCopy.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className={styles.contextBoardToolSubsection}>
                                  <div className={styles.contextBoardToolSubsectionHeader}>
                                    <span>
                                      <Type aria-hidden="true" size={12} />
                                      Labels &amp; Fields
                                    </span>
                                    <small>{contextBoardLabelKinds.length} tools</small>
                                  </div>
                                  <div className={styles.contextBoardToolOptionGrid}>
                                    {contextBoardLabelKinds.map((kind) => {
                                      const labelCopy =
                                        contextBoardCustomKindCopy(kind);

                                      return (
                                        <button
                                          aria-label={`Add ${labelCopy.label}`}
                                          data-kind={kind}
                                          key={kind}
                                          onClick={() => addContextBoardItem(kind)}
                                          title={`Add ${labelCopy.label}`}
                                          type="button"
                                        >
                                          {kind === "label-area" ? (
                                            <StickyNote aria-hidden="true" size={13} />
                                          ) : kind === "label-field" ? (
                                            <RectangleHorizontal aria-hidden="true" size={13} />
                                          ) : (
                                            <Type aria-hidden="true" size={13} />
                                          )}
                                          <span>{labelCopy.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className={styles.contextBoardToolSubsection}>
                                  <div className={styles.contextBoardToolSubsectionHeader}>
                                    <span>
                                      <Shapes aria-hidden="true" size={12} />
                                      Shapes
                                    </span>
                                    <small>{contextBoardBasicShapeKinds.length} tools</small>
                                  </div>
                                  <div className={styles.contextBoardToolOptionGrid}>
                                    {contextBoardBasicShapeKinds.map((kind) => {
                                      const shapeCopy =
                                        contextBoardCustomKindCopy(kind);

                                      return (
                                        <button
                                          aria-label={`Add ${shapeCopy.label}`}
                                          data-kind={kind}
                                          key={kind}
                                          onClick={() => addContextBoardItem(kind)}
                                          title={`Add ${shapeCopy.label}`}
                                          type="button"
                                        >
                                          {kind === "shape-circle" ? (
                                            <Circle aria-hidden="true" size={13} />
                                          ) : kind === "shape-diamond" ? (
                                            <Diamond aria-hidden="true" size={13} />
                                          ) : (
                                            <RectangleHorizontal aria-hidden="true" size={13} />
                                          )}
                                          <span>{shapeCopy.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div
                            className={styles.contextBoardToolOptionGroup}
                            data-collapsed={contextBoardToolSectionCollapsed.component ? "true" : "false"}
                          >
                            <button
                              aria-expanded={!contextBoardToolSectionCollapsed.component}
                              className={styles.contextBoardToolSectionHeader}
                              onClick={() => toggleContextBoardToolSection("component")}
                              type="button"
                            >
                              <span>
                                <Component aria-hidden="true" size={12} />
                                Components
                              </span>
                              <small>{contextBoardToolSectionSummary("component")}</small>
                              <ChevronDown aria-hidden="true" size={12} />
                            </button>
                            {!contextBoardToolSectionCollapsed.component ? (
                              <div className={styles.contextBoardToolSectionBody}>
                            <div className={styles.contextBoardToolOptionGrid}>
                              {contextBoardComponentKinds.map((kind) => {
                                const componentCopy = contextBoardCustomKindCopy(kind);

                                return (
                                  <button
                                    aria-label={`Add ${componentCopy.label}`}
                                    data-kind={kind}
                                    key={kind}
                                    onClick={() => addContextBoardItem(kind)}
                                    title={`Add ${componentCopy.label}`}
                                    type="button"
                                  >
                                    {kind === "process" ? (
                                      <RectangleHorizontal aria-hidden="true" size={13} />
                                    ) : kind === "decision" ? (
                                      <Diamond aria-hidden="true" size={13} />
                                    ) : kind === "text" ||
                                      kind === "sequence-message" ||
                                      kind === "sequence-return" ? (
                                      <Type aria-hidden="true" size={13} />
                                    ) : kind === "sequence-activation" ? (
                                      <RectangleHorizontal aria-hidden="true" size={13} />
                                    ) : kind === "sequence-fragment" ? (
                                      <Container aria-hidden="true" size={13} />
                                    ) : kind === "c4-person" ? (
                                      <UserRound aria-hidden="true" size={13} />
                                    ) : kind === "c4-external-system" ||
                                      kind === "c4-software-system" ? (
                                      <Container aria-hidden="true" size={13} />
                                    ) : kind === "c4-system-boundary" ? (
                                      <RectangleHorizontal aria-hidden="true" size={13} />
                                    ) : kind === "c4-container" ? (
                                      <Container aria-hidden="true" size={13} />
                                    ) : kind === "c4-component" ? (
                                      <Component aria-hidden="true" size={13} />
                                    ) : kind === "c4-relationship" ? (
                                      <Type aria-hidden="true" size={13} />
                                    ) : kind === "uml-class" ? (
                                      <RectangleHorizontal aria-hidden="true" size={13} />
                                    ) : kind === "uml-interface" ? (
                                      <Circle aria-hidden="true" size={13} />
                                    ) : kind === "uml-package" ? (
                                      <Container aria-hidden="true" size={13} />
                                    ) : kind === "uml-usecase" ? (
                                      <UserRound aria-hidden="true" size={13} />
                                    ) : kind === "uml-state" ? (
                                      <Circle aria-hidden="true" size={13} />
                                    ) : kind === "start" || kind === "end" ? (
                                      <Circle aria-hidden="true" size={13} />
                                    ) : kind === "actor" ? (
                                      <UserRound aria-hidden="true" size={13} />
                                    ) : kind === "lifeline" ? (
                                      <GitBranch aria-hidden="true" size={13} />
                                    ) : kind === "component" ? (
                                      <Component aria-hidden="true" size={13} />
                                    ) : kind === "container" ? (
                                      <Container aria-hidden="true" size={13} />
                                    ) : kind === "lane" ? (
                                      <Rows3 aria-hidden="true" size={13} />
                                    ) : kind === "topic" || kind === "branch" ? (
                                      <MapIcon aria-hidden="true" size={13} />
                                    ) : kind === "note" ? (
                                      <StickyNote aria-hidden="true" size={13} />
                                    ) : (
                                      <Shapes aria-hidden="true" size={13} />
                                    )}
                                    <span>{componentCopy.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                              </div>
                            ) : null}
                          </div>

                          {!contextBoardToolSectionCollapsed["diagram-label"] ? (
                            <div
                              className={styles.contextBoardToolOptionGroup}
                              data-collapsed={contextBoardToolSectionCollapsed["diagram-label"] ? "true" : "false"}
                            >
                              <button
                                aria-expanded={!contextBoardToolSectionCollapsed["diagram-label"]}
                                className={styles.contextBoardToolSectionHeader}
                                onClick={() => toggleContextBoardToolSection("diagram-label")}
                                type="button"
                              >
                                <span>
                                  <Type aria-hidden="true" size={12} />
                                  {contextBoardDiagramLabelSectionLabel(
                                    contextBoardDiagramType,
                                  )}
                                </span>
                                <small>{contextBoardToolSectionSummary("diagram-label")}</small>
                                <ChevronDown aria-hidden="true" size={12} />
                              </button>
                              {!contextBoardToolSectionCollapsed["diagram-label"] ? (
                                <div className={styles.contextBoardToolSectionBody}>
                                  <div className={styles.contextBoardUmlRelationGrid}>
                                    {contextBoardDiagramLabelPresets.map((preset) => {
                                      return (
                                        <button
                                          aria-label={`Add ${preset.label} diagram label`}
                                          data-relationship={preset.relationship ?? preset.id}
                                          key={preset.id}
                                          onClick={() =>
                                            addContextBoardDiagramLabel(preset)
                                          }
                                          title={`Add ${preset.title}`}
                                          type="button"
                                        >
                                          <span>{preset.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div
                            className={styles.contextBoardToolOptionGroup}
                            data-collapsed={contextBoardToolSectionCollapsed.sketch ? "true" : "false"}
                          >
                            <button
                              aria-expanded={!contextBoardToolSectionCollapsed.sketch}
                              className={styles.contextBoardToolSectionHeader}
                              onClick={() => toggleContextBoardToolSection("sketch")}
                              type="button"
                            >
                              <span>
                                <PencilLine aria-hidden="true" size={12} />
                                Sketch
                              </span>
                              <small>{contextBoardToolSectionSummary("sketch")}</small>
                              <ChevronDown aria-hidden="true" size={12} />
                            </button>
                            {!contextBoardToolSectionCollapsed.sketch ? (
                              <div className={styles.contextBoardToolSectionBody}>
                                <div className={styles.contextBoardLineControls}>
                                  <div className={styles.contextBoardLineControl}>
                                    <span>Tool</span>
                                    <div className={styles.contextBoardLineChoice}>
                                      {contextBoardSketchTools.map((tool) => {
                                        const sketchCopy =
                                          contextBoardSketchToolCopy(tool);

                                        return (
                                          <button
                                            aria-label={sketchCopy.description}
                                            aria-pressed={contextBoardSketchTool === tool}
                                            key={tool}
                                            onClick={() => {
                                              setContextBoardSketchTool(tool);
                                              setContextBoardTool("sketch");
                                            }}
                                            title={sketchCopy.description}
                                            type="button"
                                          >
                                            {tool === "marker" ? (
                                              <Brush aria-hidden="true" size={13} />
                                            ) : tool === "highlighter" ? (
                                              <Highlighter aria-hidden="true" size={13} />
                                            ) : tool === "eraser" ? (
                                              <Eraser aria-hidden="true" size={13} />
                                            ) : (
                                              <PencilLine aria-hidden="true" size={13} />
                                            )}
                                            <span>{sketchCopy.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className={styles.contextBoardLineControl}>
                                    <span>Color</span>
                                    <div className={styles.contextBoardLineSwatches}>
                                      {contextBoardSketchToneOptions.map((option) => (
                                        <button
                                          aria-label={`Use ${option.label} sketch color`}
                                          aria-pressed={contextBoardSketchTone === option.tone}
                                          data-tone={option.tone}
                                          key={option.tone}
                                          onClick={() => {
                                            setContextBoardSketchTone(option.tone);
                                            setContextBoardTool("sketch");
                                          }}
                                          title={`Use ${option.label} sketch color`}
                                          type="button"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div
                            className={styles.contextBoardToolOptionGroup}
                            data-collapsed={contextBoardToolSectionCollapsed.connector ? "true" : "false"}
                          >
                            <button
                              aria-expanded={!contextBoardToolSectionCollapsed.connector}
                              className={styles.contextBoardToolSectionHeader}
                              onClick={() => toggleContextBoardToolSection("connector")}
                              type="button"
                            >
                              <span>
                                <Spline aria-hidden="true" size={12} />
                                Connector
                              </span>
                              <small>{contextBoardToolSectionSummary("connector")}</small>
                              <ChevronDown aria-hidden="true" size={12} />
                            </button>
                            {!contextBoardToolSectionCollapsed.connector ? (
                              <div className={styles.contextBoardToolSectionBody}>
                            <div className={styles.contextBoardLineControls}>
                              <div className={styles.contextBoardLineControl}>
                                <span>Path</span>
                                <div className={styles.contextBoardLineChoice}>
                                  {(["curve", "straight"] as ContextBoardConnectorShape[]).map(
                                    (shape) => (
                                      <button
                                        aria-label={`${shape} connector path`}
                                        aria-pressed={contextBoardConnectorShape === shape}
                                        key={shape}
                                        onClick={() => setContextBoardConnectorShape(shape)}
                                        title={`${shape} connector path`}
                                        type="button"
                                      >
                                        {shape === "curve" ? (
                                          <Spline aria-hidden="true" size={13} />
                                        ) : (
                                          <Minus aria-hidden="true" size={13} />
                                        )}
                                        <span>{shape}</span>
                                      </button>
                                    ),
                                  )}
                                </div>
                              </div>

                              <div className={styles.contextBoardLineControl}>
                                <span>Start</span>
                                <div className={styles.contextBoardLineChoice}>
                                  {([
                                    "plain",
                                    "diamond",
                                    "filled-diamond",
                                  ] as ContextBoardConnectorTip[]).map((tip) => (
                                    <button
                                      aria-label={`${tip} connector start`}
                                      aria-pressed={
                                        contextBoardConnectorStartTip === tip
                                      }
                                      key={`start-${tip}`}
                                      onClick={() =>
                                        setContextBoardConnectorStartTip(tip)
                                      }
                                      title={`${tip} connector start`}
                                      type="button"
                                    >
                                      {tip === "diamond" ||
                                      tip === "filled-diamond" ? (
                                        <Diamond aria-hidden="true" size={13} />
                                      ) : (
                                        <Minus aria-hidden="true" size={13} />
                                      )}
                                      <span>
                                        {tip === "filled-diamond" ? "filled" : tip}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className={styles.contextBoardLineControl}>
                                <span>End</span>
                                <div className={styles.contextBoardLineChoice}>
                                  {([
                                    "plain",
                                    "arrow",
                                    "triangle",
                                    "diamond",
                                    "filled-diamond",
                                  ] as ContextBoardConnectorTip[]).map((tip) => (
                                    <button
                                      aria-label={`${tip} connector end`}
                                      aria-pressed={contextBoardConnectorTip === tip}
                                      key={tip}
                                      onClick={() => setContextBoardConnectorTip(tip)}
                                      title={`${tip} connector end`}
                                      type="button"
                                    >
                                      {tip === "arrow" ? (
                                        <ArrowRight aria-hidden="true" size={13} />
                                      ) : tip === "triangle" ? (
                                        <Component aria-hidden="true" size={13} />
                                      ) : tip === "diamond" || tip === "filled-diamond" ? (
                                        <Diamond aria-hidden="true" size={13} />
                                      ) : (
                                        <Minus aria-hidden="true" size={13} />
                                      )}
                                      <span>
                                        {tip === "filled-diamond" ? "filled" : tip}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className={styles.contextBoardLineControl}>
                                <span>Stroke</span>
                                <div className={styles.contextBoardLineChoice}>
                                  {(["solid", "dashed"] as ContextBoardConnectorStroke[]).map(
                                    (stroke) => (
                                      <button
                                        aria-label={`${stroke} connector stroke`}
                                        aria-pressed={contextBoardConnectorStroke === stroke}
                                        key={stroke}
                                        onClick={() => setContextBoardConnectorStroke(stroke)}
                                        title={`${stroke} connector stroke`}
                                        type="button"
                                      >
                                        <span
                                          aria-hidden="true"
                                          className={styles.contextBoardLineGlyph}
                                          data-stroke={stroke}
                                        />
                                        <span>{stroke}</span>
                                      </button>
                                    ),
                                  )}
                                </div>
                              </div>

                              <div className={styles.contextBoardLineControl}>
                                <span>Color</span>
                                <div className={styles.contextBoardLineSwatches}>
                                  {contextBoardConnectorToneOptions.map((option) => (
                                    <button
                                      aria-label={option.title}
                                      aria-pressed={contextBoardConnectorTone === option.tone}
                                      data-tone={option.tone}
                                      key={option.tone}
                                      onClick={() => setContextBoardConnectorTone(option.tone)}
                                      title={option.title}
                                      type="button"
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`${styles.contextBoardFloatingTray} ${styles.contextBoardFloatingVisual}`}
                    data-has-content={contextBoardHasContent ? "true" : "false"}
                  >
                    <span>visual workspace</span>
                    <strong>
                      {contextBriefReadOnly
                        ? copy.readonlySummaryTitle
                        : copy.summaryTitle}
                    </strong>
                    <small>
                      {contextBriefReadOnly
                        ? copy.readonlySummaryDetail
                        : copy.summaryDetail}
                    </small>
                  </div>

                  <div className={styles.contextBoardZoomFloat} aria-label="Canvas zoom tool">
                    <button
                      aria-label="Zoom in"
                      onClick={() =>
                        setContextBoardZoomClamped(
                          contextBoardZoom + CONTEXT_BOARD_ZOOM_STEP,
                        )
                      }
                      type="button"
                    >
                      +
                    </button>
                    <input
                      aria-label="Canvas zoom"
                      aria-orientation="vertical"
                      max={CONTEXT_BOARD_MAX_ZOOM}
                      min={CONTEXT_BOARD_MIN_ZOOM}
                      onChange={(event) =>
                        setContextBoardZoomClamped(Number(event.target.value))
                      }
                      step={CONTEXT_BOARD_ZOOM_STEP}
                      type="range"
                      value={contextBoardZoom}
                    />
                    <span>{Math.round(contextBoardZoom * 100)}%</span>
                    <button
                      aria-label="Zoom out"
                      onClick={() =>
                        setContextBoardZoomClamped(
                          contextBoardZoom - CONTEXT_BOARD_ZOOM_STEP,
                        )
                      }
                      type="button"
                    >
                      -
                    </button>
                  </div>

                  {renderContextBoardNavigator()}

                  {sourceOverlay?.({
                    collapsed: contextBoardInputsCollapsed,
                    onToggle: () =>
                      setContextBoardInputsCollapsed((collapsed) => !collapsed),
                    style: contextBoardFloatingSourcesStyle(),
                  })}

                  {renderContextBoardStylePalette()}
                  {!contextBoardHasContent ? renderContextBoardEmptyHint() : null}
                </div>
                <div
                  className={styles.contextBoardPlaneSizer}
                  style={
                    {
                      "--board-height": `${CONTEXT_BOARD_HEIGHT}px`,
                      "--board-scaled-height": `${CONTEXT_BOARD_HEIGHT * contextBoardZoom}px`,
                      "--board-scaled-width": `${CONTEXT_BOARD_WIDTH * contextBoardZoom}px`,
                      "--board-width": `${CONTEXT_BOARD_WIDTH}px`,
                      "--board-zoom": contextBoardZoom,
                    } as CSSProperties
                  }
                >
                  <div className={styles.contextBoardPlane} data-tool={contextBoardTool}>
                    <svg
                      aria-label="Canvas connectors"
                      className={styles.contextBoardConnectorLayer}
                      viewBox={`0 0 ${CONTEXT_BOARD_WIDTH} ${CONTEXT_BOARD_HEIGHT}`}
                    >
                      <defs>
                        {contextBoardConnectorToneOptions.map((option) => (
                          <Fragment key={option.tone}>
                            <marker
                              id={contextBoardConnectorMarkerId(option.tone, "arrow")}
                              markerHeight="8"
                              markerWidth="10"
                              orient="auto"
                              refX="8"
                              refY="4"
                              viewBox="0 0 10 8"
                            >
                              <path
                                className={styles.contextBoardConnectorMarker}
                                d="M 0 0 L 10 4 L 0 8 z"
                                data-marker="arrow"
                                data-tone={option.tone}
                                style={contextBoardConnectorMarkerStyle(
                                  option.tone,
                                  "arrow",
                                )}
                              />
                            </marker>
                            <marker
                              id={contextBoardConnectorMarkerId(option.tone, "triangle")}
                              markerHeight="11"
                              markerWidth="12"
                              orient="auto"
                              refX="10"
                              refY="5.5"
                              viewBox="0 0 12 11"
                            >
                              <path
                                className={styles.contextBoardConnectorMarker}
                                d="M 1 1 L 11 5.5 L 1 10 z"
                                data-marker="triangle"
                                data-tone={option.tone}
                                style={contextBoardConnectorMarkerStyle(
                                  option.tone,
                                  "triangle",
                                )}
                              />
                            </marker>
                            <marker
                              id={contextBoardConnectorMarkerId(option.tone, "diamond")}
                              markerHeight="10"
                              markerWidth="14"
                              orient="auto"
                              refX="2"
                              refY="5"
                              viewBox="0 0 14 10"
                            >
                              <path
                                className={styles.contextBoardConnectorMarker}
                                d="M 2 5 L 7 1 L 12 5 L 7 9 z"
                                data-marker="diamond"
                                data-tone={option.tone}
                                style={contextBoardConnectorMarkerStyle(
                                  option.tone,
                                  "diamond",
                                )}
                              />
                            </marker>
                            <marker
                              id={contextBoardConnectorMarkerId(option.tone, "filled-diamond")}
                              markerHeight="10"
                              markerWidth="14"
                              orient="auto"
                              refX="2"
                              refY="5"
                              viewBox="0 0 14 10"
                            >
                              <path
                                className={styles.contextBoardConnectorMarker}
                                d="M 2 5 L 7 1 L 12 5 L 7 9 z"
                                data-marker="filled-diamond"
                                data-tone={option.tone}
                                style={contextBoardConnectorMarkerStyle(
                                  option.tone,
                                  "filled-diamond",
                                )}
                              />
                            </marker>
                          </Fragment>
                        ))}
                      </defs>
                      {[...contextBoardSketchStrokes, ...(contextBoardSketchDraft ? [contextBoardSketchDraft] : [])].map(
                        (stroke) => (
                          <path
                            className={styles.contextBoardSketchPath}
                            d={contextBoardSketchPath(stroke.points)}
                            data-sketch-tool={stroke.tool}
                            data-tone={stroke.tone}
                            key={stroke.id}
                            style={
                              {
                                "--sketch-opacity": stroke.opacity,
                                "--sketch-width": stroke.width,
                              } as CSSProperties
                            }
                          />
                        ),
                      )}
                      {contextBoardVisibleConnections.map((connection) => {
                        const from = getContextBoardConnectionPoint(connection.from);
                        const to = getContextBoardConnectionPoint(connection.to);

                        if (!from || !to) {
                          return null;
                        }

                        const connectorTone =
                          contextBoardConnectionTone(connection.tone);
                        const path = contextBoardConnectorPath(
                          from,
                          to,
                          connection.from.side,
                          connection.to.side,
                          connection.shape,
                        );
                        const fromControlPoint = contextBoardConnectorPointAt(
                          from,
                          to,
                          connection.from.side,
                          connection.to.side,
                          connection.shape,
                          0.2,
                        );
                        const toControlPoint = contextBoardConnectorPointAt(
                          from,
                          to,
                          connection.from.side,
                          connection.to.side,
                          connection.shape,
                          0.8,
                        );

                        return (
                          <g key={connection.id}>
                            <title>Connector controls</title>
                            <path
                              className={styles.contextBoardConnectorPath}
                              d={path}
                              data-shape={connection.shape}
                              data-stroke={connection.stroke ?? "solid"}
                              data-tone={connectorTone}
                              data-tip={connection.tip}
                              data-relationship={connection.relationship ?? "line"}
                              style={contextBoardConnectorPathStyle(
                                connectorTone,
                                connection.shape,
                                connection.stroke,
                              )}
                              markerStart={
                                connection.startTip && connection.startTip !== "plain"
                                  ? `url(#${contextBoardConnectorMarkerId(
                                      connectorTone,
                                      connection.startTip,
                                    )})`
                                  : undefined
                              }
                              markerEnd={
                                connection.tip !== "plain"
                                  ? `url(#${contextBoardConnectorMarkerId(
                                      connectorTone,
                                      connection.tip,
                                    )})`
                                  : undefined
                              }
                            />
                            <path
                              className={styles.contextBoardConnectorHitPath}
                              d={path}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onPointerEnter={() =>
                                setContextBoardHoveredConnectionId(connection.id)
                              }
                              onPointerLeave={() =>
                                setContextBoardHoveredConnectionId((current) =>
                                  current === connection.id ? null : current,
                                )
                              }
                            />
                            <circle
                              aria-label="Reconnect connector start"
                              className={styles.contextBoardConnectorEndpointHandle}
                              cx={fromControlPoint.x}
                              cy={fromControlPoint.y}
                              data-connector-endpoint="from"
                              data-visible={
                                contextBoardHoveredConnectionId === connection.id
                                  ? "true"
                                  : "false"
                              }
                              onPointerCancel={cancelContextBoardConnection}
                              onPointerDown={(event) =>
                                startContextBoardReconnect(event, connection, "from")
                              }
                              onPointerEnter={() =>
                                setContextBoardHoveredConnectionId(connection.id)
                              }
                              onPointerLeave={() =>
                                setContextBoardHoveredConnectionId((current) =>
                                  current === connection.id ? null : current,
                                )
                              }
                              onPointerMove={moveContextBoardConnection}
                              onPointerUp={endContextBoardConnection}
                              r="12"
                              role="button"
                              tabIndex={0}
                            />
                            <circle
                              aria-label="Reconnect connector end"
                              className={styles.contextBoardConnectorEndpointHandle}
                              cx={toControlPoint.x}
                              cy={toControlPoint.y}
                              data-connector-endpoint="to"
                              data-visible={
                                contextBoardHoveredConnectionId === connection.id
                                  ? "true"
                                  : "false"
                              }
                              onPointerCancel={cancelContextBoardConnection}
                              onPointerDown={(event) =>
                                startContextBoardReconnect(event, connection, "to")
                              }
                              onPointerEnter={() =>
                                setContextBoardHoveredConnectionId(connection.id)
                              }
                              onPointerLeave={() =>
                                setContextBoardHoveredConnectionId((current) =>
                                  current === connection.id ? null : current,
                                )
                              }
                              onPointerMove={moveContextBoardConnection}
                              onPointerUp={endContextBoardConnection}
                              r="12"
                              role="button"
                              tabIndex={0}
                            />
                            <circle
                              className={styles.contextBoardConnectorPoint}
                              cx={from.x}
                              cy={from.y}
                              r="4"
                            />
                            <circle
                              className={styles.contextBoardConnectorPoint}
                              cx={to.x}
                              cy={to.y}
                              r="4"
                            />
                          </g>
                        );
                      })}
                      {contextBoardConnectionDraft ? (() => {
                        const from = getContextBoardConnectionPoint(
                          contextBoardConnectionDraft.from,
                        );
                        const draftShape =
                          contextBoardConnectionDraft.shape ?? contextBoardConnectorShape;
                        const draftStroke =
                          contextBoardConnectionDraft.stroke ??
                          contextBoardConnectorStroke;
                        const draftTone =
                          contextBoardConnectionDraft.tone ?? contextBoardConnectorTone;
                        const draftStartTip =
                          contextBoardConnectionDraft.startTip ??
                          contextBoardConnectorStartTip;
                        const draftTip =
                          contextBoardConnectionDraft.tip ?? contextBoardConnectorTip;
                        const draftPointerSide =
                          contextBoardConnectionDraft.pointerSide ??
                          contextBoardOppositeSide(
                            contextBoardConnectionDraft.from.side,
                          );

                        if (!from) {
                          return null;
                        }

                        return (
                          <path
                            className={styles.contextBoardConnectorDraftPath}
                            d={contextBoardConnectorPath(
                              from,
                              contextBoardConnectionDraft.pointer,
                              contextBoardConnectionDraft.from.side,
                              draftPointerSide,
                              draftShape,
                            )}
                            data-stroke={draftStroke}
                            data-tone={draftTone}
                            style={contextBoardConnectorPathStyle(
                              draftTone,
                              draftShape,
                              draftStroke,
                            )}
                            markerStart={
                              draftStartTip !== "plain"
                                ? `url(#${contextBoardConnectorMarkerId(
                                    draftTone,
                                    draftStartTip,
                                  )})`
                                : undefined
                            }
                            markerEnd={
                              draftTip !== "plain"
                                ? `url(#${contextBoardConnectorMarkerId(
                                    draftTone,
                                    draftTip,
                                  )})`
                                : undefined
                            }
                          />
                        );
                      })() : null}
                    </svg>

                    {contextBoardSelectionBox ? (() => {
                      const rect = contextBoardSelectionRect(
                        contextBoardSelectionBox,
                      );

                      return (
                        <div
                          className={styles.contextBoardSelectionBox}
                          data-board-control="true"
                          style={
                            {
                              "--selection-height": `${rect.height}px`,
                              "--selection-width": `${rect.width}px`,
                              "--selection-x": `${rect.x}px`,
                              "--selection-y": `${rect.y}px`,
                            } as CSSProperties
                          }
                        />
                      );
                    })() : null}

                    {contextBoardVisibleConnections.map((connection) => {
                      const from = getContextBoardConnectionPoint(connection.from);
                      const to = getContextBoardConnectionPoint(connection.to);

                      if (!from || !to) {
                        return null;
                      }

                      const midpoint = contextBoardConnectorMidpoint(
                        from,
                        to,
                        connection.from.side,
                        connection.to.side,
                        connection.shape,
                      );

                      return (
                        <Fragment key={`connector-ui-${connection.id}`}>
                          <button
                            aria-label="Duplicate connector"
                            className={styles.contextBoardConnectorDuplicateButton}
                            data-board-control="true"
                            data-visible={
                              contextBoardHoveredConnectionId === connection.id
                                ? "true"
                                : "false"
                            }
                            disabled={contextBriefReadOnly}
                            onBlur={() =>
                              setContextBoardHoveredConnectionId((current) =>
                                current === connection.id ? null : current,
                              )
                            }
                            onFocus={() =>
                              setContextBoardHoveredConnectionId(connection.id)
                            }
                            onPointerDown={(event) =>
                              duplicateContextBoardConnection(event, connection)
                            }
                            onPointerEnter={() =>
                              setContextBoardHoveredConnectionId(connection.id)
                            }
                            onPointerLeave={() =>
                              setContextBoardHoveredConnectionId((current) =>
                                current === connection.id ? null : current,
                              )
                            }
                            style={
                              {
                                "--connector-x": `${midpoint.x}px`,
                                "--connector-y": `${midpoint.y}px`,
                              } as CSSProperties
                            }
                            title="Duplicate connector"
                            type="button"
                          >
                            <Copy aria-hidden="true" size={12} />
                          </button>
                          <button
                            aria-label="Remove connector"
                            className={styles.contextBoardConnectorRemoveButton}
                            data-board-control="true"
                            data-visible={
                              contextBoardHoveredConnectionId === connection.id
                                ? "true"
                                : "false"
                            }
                            disabled={contextBriefReadOnly}
                            onBlur={() =>
                              setContextBoardHoveredConnectionId((current) =>
                                current === connection.id ? null : current,
                              )
                            }
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              removeContextBoardConnection(connection.id);
                            }}
                            onFocus={() =>
                              setContextBoardHoveredConnectionId(connection.id)
                            }
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onPointerEnter={() =>
                              setContextBoardHoveredConnectionId(connection.id)
                            }
                            onPointerLeave={() =>
                              setContextBoardHoveredConnectionId((current) =>
                                current === connection.id ? null : current,
                              )
                            }
                            style={
                              {
                                "--connector-x": `${midpoint.x}px`,
                                "--connector-y": `${midpoint.y}px`,
                              } as CSSProperties
                            }
                            title="Remove connector"
                            type="button"
                          >
                            <X aria-hidden="true" size={12} />
                          </button>
                        </Fragment>
                      );
                    })}

                    {contextBoardTemplateTrays.map((tray) => (
                      <div
                        aria-label={`Move ${tray.label} template tray`}
                        className={styles.contextBoardTemplateTray}
                        data-board-object="true"
                        data-board-template="true"
                        data-diagram-type={tray.diagramType}
                        data-dragging={contextBoardDrag?.id === tray.id}
                        data-manual={tray.manual ? "true" : "false"}
                        data-selected={
                          contextBoardSelectedKeys.has(
                            contextBoardSelectionKey({
                              id: tray.id,
                              itemType: "template",
                            }),
                          ) ||
                          (contextBoardStyleTarget?.itemType === "template" &&
                            contextBoardStyleTarget.id === tray.id)
                            ? "true"
                            : "false"
                        }
                        data-tone={tray.tone ?? "default"}
                        key={tray.id}
                        onPointerCancel={endContextBoardDrag}
                        onPointerDown={(event) =>
                          startContextBoardDrag(event, "template", tray.id, tray)
                        }
                        onPointerMove={moveContextBoardDrag}
                        onPointerUp={endContextBoardDrag}
                        role="group"
                        style={
                          {
                            "--board-height": `${tray.height}px`,
                            "--board-width": `${tray.width}px`,
                            "--board-x": `${tray.x}px`,
                            "--board-y": `${tray.y}px`,
                          } as CSSProperties
                        }
                      >
                        <div className={styles.contextBoardTemplateTrayHeader}>
                          <span>{contextBoardDiagramCopy(tray.diagramType).label}</span>
                          <strong>{tray.label}</strong>
                        </div>
                        <button
                          aria-label={`Delete ${tray.label} template tray`}
                          className={styles.contextBoardTemplateTrayDelete}
                          data-board-control="true"
                          disabled={contextBriefReadOnly}
                          onPointerDown={(event) =>
                            requestRemoveContextBoardTemplateTray(event, tray.id)
                          }
                          title={`Delete ${tray.label}`}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={13} />
                        </button>
                        <button
                          aria-label={`Resize ${tray.label} template tray`}
                          className={styles.contextBoardTemplateTrayResize}
                          data-board-control="true"
                          disabled={contextBriefReadOnly}
                          onPointerCancel={endContextBoardTemplateResize}
                          onPointerDown={(event) =>
                            startContextBoardTemplateResize(event, tray)
                          }
                          onPointerMove={moveContextBoardTemplateResize}
                          onPointerUp={endContextBoardTemplateResize}
                          title={`Resize ${tray.label}`}
                          type="button"
                        />
                      </div>
                    ))}

                    {contextBoardCoreNodes.map((node) => {
                      const position = contextBoardPositions[node.id];

                      return (
                        <article
                          aria-label={`Move ${node.label}`}
                          className={styles.contextBoardNode}
                          data-board-object="true"
                          data-dragging={contextBoardDrag?.id === node.id}
                          data-selected={
                            contextBoardSelectedKeys.has(
                              contextBoardSelectionKey({
                                id: node.id,
                                itemType: "core",
                              }),
                            )
                              ? "true"
                              : "false"
                          }
                          data-tone={node.tone}
                          key={node.id}
                          onPointerCancel={endContextBoardDrag}
                          onPointerDown={(event) =>
                            startContextBoardDrag(event, "core", node.id, position)
                          }
                          onPointerMove={moveContextBoardDrag}
                          onPointerUp={endContextBoardDrag}
                          role="button"
                          style={
                            {
                              "--board-x": `${position.x}px`,
                              "--board-y": `${position.y}px`,
                            } as CSSProperties
                          }
                          tabIndex={0}
                        >
                          <button
                            aria-label={`Remove ${node.label}`}
                            className={styles.contextBoardDeleteButton}
                            data-board-control="true"
                            disabled={contextBriefReadOnly}
                            onPointerDown={(event) =>
                              removeContextBoardItem(event, "core", node.id)
                            }
                            title={`Remove ${node.label}`}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={13} />
                          </button>
                          {renderContextBoardPorts("core", node.id)}
                          <span>{node.kicker}</span>
                          <strong>{node.label}</strong>
                          <small>{node.detail}</small>
                        </article>
                      );
                    })}

                    {contextBoardCustomItems.map((item) => {
                      const itemSize = contextBoardCustomItemResolvedSize(item);
                      const showDetail = contextBoardCustomKindHasDetail(
                        item.kind,
                        item.diagramType,
                      );
                      const showKicker = contextBoardCustomKindHasKicker(
                        item.kind,
                        item.diagramType,
                      );

                      return (
                      <article
                        aria-label={`Move ${item.label}`}
                        className={styles.contextBoardCustomItem}
                        data-board-object="true"
                        data-dragging={contextBoardDrag?.id === item.id}
                        data-diagram-type={item.diagramType ?? "custom"}
                        data-kind={item.kind}
                        data-selected={
                          contextBoardSelectedKeys.has(
                            contextBoardSelectionKey({
                              id: item.id,
                              itemType: "custom",
                            }),
                          ) ||
                          (contextBoardStyleTarget?.itemType === "custom" &&
                            contextBoardStyleTarget.id === item.id)
                            ? "true"
                            : "false"
                        }
                        data-tone={item.tone ?? "default"}
                        key={item.id}
                        onPointerCancel={endContextBoardDrag}
                        onPointerDown={(event) =>
                          startContextBoardDrag(event, "custom", item.id, item)
                        }
                        onPointerMove={moveContextBoardDrag}
                        onPointerUp={endContextBoardDrag}
                        role="group"
                        style={
                          {
                            "--board-x": `${item.x}px`,
                            "--board-y": `${item.y}px`,
                            height: `${itemSize.height}px`,
                            minHeight: `${itemSize.height}px`,
                            width: `${itemSize.width}px`,
                          } as CSSProperties
                        }
                        tabIndex={0}
                      >
                        <button
                          aria-label={`Duplicate ${item.label}`}
                          className={styles.contextBoardDuplicateButton}
                          data-board-control="true"
                          disabled={contextBriefReadOnly}
                          onPointerDown={(event) =>
                            duplicateContextBoardCustomItem(event, item.id)
                          }
                          title={`Duplicate ${item.label}`}
                          type="button"
                        >
                          <Copy aria-hidden="true" size={13} />
                        </button>
                        <button
                          aria-label={`Remove ${item.label}`}
                          className={styles.contextBoardDeleteButton}
                          data-board-control="true"
                          disabled={contextBriefReadOnly}
                          onPointerDown={(event) =>
                            removeContextBoardItem(event, "custom", item.id)
                          }
                          title={`Remove ${item.label}`}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={13} />
                        </button>
                        {contextBoardCustomKindHasPorts(item.kind)
                          ? renderContextBoardPorts("custom", item.id)
                          : null}
                        {showKicker ? (
                          <span>{contextBoardCustomKindCopy(item.kind).kicker}</span>
                        ) : null}
                        <input
                          {...contextBoardEditorFieldProps}
                          aria-label={`Edit ${item.label} title`}
                          className={styles.contextBoardCardTitleInput}
                          data-board-control="true"
                          onChange={(event) =>
                            updateContextBoardItemContent(
                              item.id,
                              "label",
                              event.target.value,
                            )
                          }
                          onFocus={() =>
                            setContextBoardStyleTarget({
                              id: item.id,
                              itemType: "custom",
                            })
                          }
                          onPointerDown={(event) => event.stopPropagation()}
                          placeholder={contextBoardCustomKindCopy(item.kind).label}
                          readOnly={contextBriefReadOnly}
                          value={item.label}
                        />
                        {showDetail ? (
                          <textarea
                            {...contextBoardEditorFieldProps}
                            aria-label={`Edit ${item.label} detail`}
                            className={styles.contextBoardCardDetailInput}
                            data-board-control="true"
                            onChange={(event) =>
                              updateContextBoardItemContent(
                                item.id,
                                "detail",
                                event.target.value,
                              )
                            }
                            onFocus={() =>
                              setContextBoardStyleTarget({
                                id: item.id,
                                itemType: "custom",
                              })
                            }
                            onPointerDown={(event) => event.stopPropagation()}
                            placeholder="Add card detail"
                            readOnly={contextBriefReadOnly}
                            rows={contextBoardCustomDetailRows(item)}
                            value={item.detail}
                          />
                        ) : null}
                        <button
                          aria-label={`Resize ${item.label}`}
                          className={`${styles.contextBoardTemplateTrayResize} ${styles.contextBoardCustomResize}`}
                          data-board-control="true"
                          disabled={contextBriefReadOnly}
                          onPointerCancel={endContextBoardTemplateResize}
                          onPointerDown={(event) =>
                            startContextBoardCustomResize(event, item)
                          }
                          onPointerMove={moveContextBoardTemplateResize}
                          onPointerUp={endContextBoardTemplateResize}
                          title={`Resize ${item.label}`}
                          type="button"
                        />
                      </article>
                    );
                    })}
                  </div>
                </div>

              </div>
            </section>

            {rail}
          </div>
  );
}
