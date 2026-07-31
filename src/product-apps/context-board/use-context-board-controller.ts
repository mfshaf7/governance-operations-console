import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";

import {
  CONTEXT_BOARD_CORE_CARD_HEIGHT,
  CONTEXT_BOARD_CORE_CARD_WIDTH,
  CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT,
  CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH,
  CONTEXT_BOARD_HEIGHT,
  CONTEXT_BOARD_WIDTH,
  CONTEXT_BOARD_ZOOM_STEP,
  clampContextBoardZoom,
  cloneContextBoardSnapshot,
  contextBoardConnectorDuplicateOffset,
  contextBoardEndpointEqual,
  contextBoardEndpointHitsSelection,
  contextBoardEndpointInItemSet,
  contextBoardEndpointIsFree,
  contextBoardEndpointMatches,
  contextBoardEndpointsSharePort,
  contextBoardFreeEndpoint,
  contextBoardHasConnection,
  contextBoardOppositeSide,
  contextBoardPointDistance,
  contextBoardPortPoint,
  contextBoardRectsIntersect,
  contextBoardReorderBySelection,
  contextBoardSelectionFromKey,
  contextBoardSelectionKey,
  contextBoardSelectionRect,
  contextBoardSnapshotsEqual,
  contextBoardStrokeIntersectsPoint,
  contextBoardSurfaceBounds,
  contextBoardToggleSelection,
  initialContextBoardConnections,
  initialContextBoardPositions,
  initialContextBoardRemovedCoreIds,
} from "./context-board-core";
import {
  contextBoardCustomItemMinimumSize,
  contextBoardCustomItemResolvedSize,
  contextBoardCustomItemSize,
  contextBoardCustomKindAutoSizesText,
  contextBoardCustomKindCopy,
  contextBoardCustomKindHasPorts,
  contextBoardCustomKindIsGeneral,
  contextBoardCustomKindIsLabel,
  contextBoardDiagramComponentKinds,
  contextBoardDiagramCopy,
  contextBoardDiagramLabelPresets as getContextBoardDiagramLabelPresets,
  contextBoardDuplicatePosition,
  contextBoardGeneralItemKinds,
  contextBoardItemsCenteredAt,
  contextBoardKeyboardTargetIsEditable,
  contextBoardSketchToolCopy,
  contextBoardStyleCopy,
} from "./context-board-template-helpers";
import {
  contextBoardConnectorLabelItem,
  contextBoardDiagramStarterLabelItems,
  contextBoardDiagramStarterUsesIntrinsicCanvas,
  contextBoardDiagramStarterViewportFocus,
  contextBoardEndpointFromPortElement,
  contextBoardTemplateTrayFromItems,
} from "./context-board-starter-helpers";
import type {
  ContextBoardAlignAction,
  ContextBoardConnection,
  ContextBoardConnectionDraft,
  ContextBoardConnectionEndpoint,
  ContextBoardConnectionSide,
  ContextBoardConnectorShape,
  ContextBoardConnectorStroke,
  ContextBoardConnectorTip,
  ContextBoardConnectorTone,
  ContextBoardCoreNode,
  ContextBoardCustomItem,
  ContextBoardDiagramType,
  ContextBoardDistributeAction,
  ContextBoardDragState,
  ContextBoardItemType,
  ContextBoardLayerAction,
  ContextBoardPortSide,
  ContextBoardPosition,
  ContextBoardResizeState,
  ContextBoardSelectionBox,
  ContextBoardSelectionItem,
  ContextBoardSketchDragState,
  ContextBoardSketchStroke,
  ContextBoardSketchTone,
  ContextBoardSketchTool,
  ContextBoardSnapshot,
  ContextBoardStyle,
  ContextBoardSurfaceBounds,
  ContextBoardSurfaceBox,
  ContextBoardTemplateTray,
  ContextBoardTone as ContextBoardColorTone,
  ContextBoardTool,
  ContextBoardToolDrawer,
  ContextBoardToolSection,
} from "./context-board-model";
import type {
  ContextBoardDiagramLabelPreset,
  ContextBoardStyleTarget,
} from "./context-board-template-helpers";

type ContextBoardPanState = {
  pointerId: number;
  scrollLeft: number;
  scrollTop: number;
  startX: number;
  startY: number;
};

type ContextBoardZoomAnchor = {
  boardX: number;
  boardY: number;
  offsetX: number;
  offsetY: number;
};

type UseContextBoardControllerOptions = {
  active: boolean;
  closeGuardOpen: boolean;
  contextBoardCoreNodes: ContextBoardCoreNode[];
  contextBriefAccepted: boolean;
  contextBriefLockedFingerprint: string | null;
  contextBriefMetadataFingerprint: string | null;
  contextBriefSavedFingerprint: string | null;
  contextBriefSnapshotFingerprint: string | null;
  contextFinalizeDialogOpen: boolean;
  contextSaveDialogOpen: boolean;
  contextSavedSessionsModalOpen: boolean;
  createDiagramStarterConnections: (
    type: ContextBoardDiagramType,
    items: ContextBoardCustomItem[],
    timestamp: number,
  ) => ContextBoardConnection[];
  createDiagramStarterItems: (
    type: ContextBoardDiagramType,
    timestamp: number,
    existingItemCount?: number,
  ) => ContextBoardCustomItem[];
  createContextBoardFingerprint: (snapshot: ContextBoardSnapshot) => string;
  markBoardDirty: () => void;
  markBoardDragCommitted: () => void;
};

export function useContextBoardController({
  active,
  closeGuardOpen,
  contextBoardCoreNodes: contextBoardCoreNodeInputs,
  contextBriefAccepted,
  contextBriefLockedFingerprint,
  contextBriefMetadataFingerprint,
  contextBriefSavedFingerprint,
  contextBriefSnapshotFingerprint,
  contextFinalizeDialogOpen,
  contextSaveDialogOpen,
  contextSavedSessionsModalOpen,
  createDiagramStarterConnections,
  createDiagramStarterItems,
  createContextBoardFingerprint,
  markBoardDirty,
  markBoardDragCommitted,
}: UseContextBoardControllerOptions) {
  const contextBoardCanvasRef = useRef<HTMLDivElement | null>(null);
  const contextBoardConnectionDraftRef =
    useRef<ContextBoardConnectionDraft | null>(null);
  const contextBoardSketchDraftRef =
    useRef<ContextBoardSketchStroke | null>(null);
  const contextBoardSketchDragRef =
    useRef<ContextBoardSketchDragState | null>(null);
  const contextBoardNavigatorDragRef = useRef<number | null>(null);
  const contextBoardZoomAnchorRef = useRef<ContextBoardZoomAnchor | null>(null);
  const [contextBoardCustomItems, setContextBoardCustomItems] = useState<
    ContextBoardCustomItem[]
  >([]);
  const [contextBoardConnections, setContextBoardConnections] = useState<
    ContextBoardConnection[]
  >(() => initialContextBoardConnections());
  const [contextBoardConnectionDraft, setContextBoardConnectionDraft] =
    useState<ContextBoardConnectionDraft | null>(null);
  const [contextBoardConnectorShape, setContextBoardConnectorShape] =
    useState<ContextBoardConnectorShape>("curve");
  const [contextBoardConnectorStroke, setContextBoardConnectorStroke] =
    useState<ContextBoardConnectorStroke>("solid");
  const [contextBoardConnectorTone, setContextBoardConnectorTone] =
    useState<ContextBoardConnectorTone>("amber");
  const [contextBoardConnectorTip, setContextBoardConnectorTip] =
    useState<ContextBoardConnectorTip>("plain");
  const [contextBoardConnectorStartTip, setContextBoardConnectorStartTip] =
    useState<ContextBoardConnectorTip>("plain");
  const [contextBoardDiagramType, setContextBoardDiagramType] =
    useState<ContextBoardDiagramType>("flowchart");
  const [contextBoardDrag, setContextBoardDrag] =
    useState<ContextBoardDragState | null>(null);
  const [contextBoardHoveredConnectionId, setContextBoardHoveredConnectionId] =
    useState<string | null>(null);
  const [contextBoardResetGuardOpen, setContextBoardResetGuardOpen] =
    useState(false);
  const [contextBoardPan, setContextBoardPan] =
    useState<ContextBoardPanState | null>(null);
  const [contextBoardRemovedCoreIds, setContextBoardRemovedCoreIds] = useState<
    string[]
  >(() => initialContextBoardRemovedCoreIds());
  const [contextBoardTemplateTrays, setContextBoardTemplateTrays] = useState<
    ContextBoardTemplateTray[]
  >([]);
  const [contextBoardTemplateTrayDeleteRequest, setContextBoardTemplateTrayDeleteRequest] =
    useState<ContextBoardTemplateTray | null>(null);
  const [contextBoardResize, setContextBoardResize] =
    useState<ContextBoardResizeState | null>(null);
  const [contextBoardSelectedItems, setContextBoardSelectedItems] = useState<
    ContextBoardSelectionItem[]
  >([]);
  const [contextBoardSelectionBox, setContextBoardSelectionBox] =
    useState<ContextBoardSelectionBox | null>(null);
  const [contextBoardSketchDraft, setContextBoardSketchDraft] =
    useState<ContextBoardSketchStroke | null>(null);
  const [contextBoardSketchStrokes, setContextBoardSketchStrokes] = useState<
    ContextBoardSketchStroke[]
  >([]);
  const [contextBoardSketchTone, setContextBoardSketchTone] =
    useState<ContextBoardSketchTone>("black");
  const [contextBoardSketchTool, setContextBoardSketchTool] =
    useState<ContextBoardSketchTool>("pen");
  const [contextBoardInputsCollapsed, setContextBoardInputsCollapsed] =
    useState(true);
  const [contextBoardToolsCollapsed, setContextBoardToolsCollapsed] =
    useState(true);
  const [contextBoardActiveToolDrawer, setContextBoardActiveToolDrawer] =
    useState<ContextBoardToolDrawer>("diagram");
  const [contextBoardCenterRequest, setContextBoardCenterRequest] = useState(0);
  const [contextBoardViewportTick, setContextBoardViewportTick] = useState(0);
  const [contextBoardPositions, setContextBoardPositions] = useState(() =>
    initialContextBoardPositions(),
  );
  const [contextBoardRedoStack, setContextBoardRedoStack] = useState<
    ContextBoardSnapshot[]
  >([]);
  const [contextBoardUndoStack, setContextBoardUndoStack] = useState<
    ContextBoardSnapshot[]
  >([]);
  const [contextBoardStyle, setContextBoardStyle] =
    useState<ContextBoardStyle>("architecture");
  const [contextBoardStyleTarget, setContextBoardStyleTarget] =
    useState<ContextBoardStyleTarget | null>(null);
  const [contextBoardTool, setContextBoardTool] =
    useState<ContextBoardTool>("move");
  const [contextBoardZoom, setContextBoardZoom] = useState(1);

  const contextBoardSelectedKeys = useMemo(
    () => new Set(contextBoardSelectedItems.map(contextBoardSelectionKey)),
    [contextBoardSelectedItems],
  );
  const contextBoardCanAlignSelection = contextBoardSelectedItems.length >= 2;
  const contextBoardCanDistributeSelection = contextBoardSelectedItems.length >= 3;
  const contextBoardCanLayerSelection = contextBoardSelectedItems.some(
    (item) => item.itemType === "custom" || item.itemType === "template",
  );
  const contextBriefFingerprint = useMemo(
    () =>
      createContextBoardFingerprint({
        connections: contextBoardConnections,
        customItems: contextBoardCustomItems,
        positions: contextBoardPositions,
        removedCoreIds: contextBoardRemovedCoreIds,
        sketchStrokes: contextBoardSketchStrokes,
        style: contextBoardStyle,
        templateTrays: contextBoardTemplateTrays,
      }),
    [
      contextBoardConnections,
      contextBoardCustomItems,
      contextBoardPositions,
      contextBoardRemovedCoreIds,
      contextBoardSketchStrokes,
      contextBoardStyle,
      contextBoardTemplateTrays,
      createContextBoardFingerprint,
    ],
  );
  const contextBriefSaved =
    contextBriefSavedFingerprint === contextBriefFingerprint;
  const contextBriefLocked =
    contextBriefLockedFingerprint === contextBriefFingerprint;
  const contextBriefMetadataReady =
    contextBriefMetadataFingerprint === contextBriefFingerprint;
  const contextBriefSnapshotReady =
    contextBriefSnapshotFingerprint === contextBriefFingerprint;
  const contextBriefReady =
    contextBriefSaved &&
    contextBriefLocked &&
    contextBriefMetadataReady &&
    contextBriefSnapshotReady;
  const contextBriefReadOnly = contextBriefAccepted && contextBriefReady;
  const canUndoContextBoard = contextBoardUndoStack.length > 0;
  const canRedoContextBoard = contextBoardRedoStack.length > 0;
  const contextBoardComponentKinds = contextBoardDiagramComponentKinds(
    contextBoardDiagramType,
  ).filter((kind) => !contextBoardCustomKindIsGeneral(kind));
  const contextBoardDiagramLabelPresets =
    getContextBoardDiagramLabelPresets(contextBoardDiagramType);
  const contextBoardToolSectionCollapsed: Record<
    ContextBoardToolSection,
    boolean
  > = {
    arrange: contextBoardActiveToolDrawer !== "arrange",
    component: contextBoardActiveToolDrawer !== "diagram",
    connector: contextBoardActiveToolDrawer !== "connector",
    diagram: contextBoardActiveToolDrawer !== "diagram",
    general: contextBoardActiveToolDrawer !== "general",
    sketch: contextBoardActiveToolDrawer !== "sketch",
    style: contextBoardActiveToolDrawer !== "style",
    "diagram-label":
      contextBoardActiveToolDrawer !== "diagram" ||
      contextBoardDiagramLabelPresets.length === 0,
  };
  const contextBoardCoreNodes = contextBoardCoreNodeInputs.filter(
    (node) => !contextBoardRemovedCoreIds.includes(node.id),
  );
  const contextBoardHasContent =
    contextBoardCoreNodes.length > 0 ||
    contextBoardCustomItems.length > 0 ||
    contextBoardSketchStrokes.length > 0 ||
    contextBoardTemplateTrays.length > 0;
  const contextBoardVisibleConnections = contextBoardConnections.filter(
    (connection) =>
      getContextBoardConnectionPoint(connection.from) &&
      getContextBoardConnectionPoint(connection.to),
  );

  useEffect(() => {
    if (
      !active ||
      !contextBriefReadOnly ||
      !contextBoardHasContent
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      fitContextBoardContent();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    active,
    contextBoardCustomItems,
    contextBoardSketchStrokes,
    contextBoardTemplateTrays,
    contextBriefReadOnly,
  ]);

  function getContextBoardConnectionPoint(
    endpoint: ContextBoardConnectionEndpoint,
  ) {
    if (contextBoardEndpointIsFree(endpoint)) {
      return { x: endpoint.x, y: endpoint.y };
    }

    const box = getContextBoardItemBox(endpoint);

    if (!box) {
      return null;
    }

    return contextBoardPortPoint(box, endpoint.side);
  }

  function getContextBoardItemBox(endpoint: ContextBoardConnectionEndpoint) {
    if (contextBoardEndpointIsFree(endpoint)) {
      return null;
    }

    if (endpoint.itemType === "core") {
      const position = contextBoardPositions[endpoint.itemId];

      if (!position || contextBoardRemovedCoreIds.includes(endpoint.itemId)) {
        return null;
      }

      return {
        height: CONTEXT_BOARD_CORE_CARD_HEIGHT,
        width: CONTEXT_BOARD_CORE_CARD_WIDTH,
        x: position.x,
        y: position.y,
      };
    }

    const item = contextBoardCustomItems.find(
      (customItem) => customItem.id === endpoint.itemId,
    );

    if (!item) {
      return null;
    }

    const itemSize = contextBoardCustomItemResolvedSize(item);
    return {
      height: itemSize.height,
      width: itemSize.width,
      x: item.x,
      y: item.y,
    };
  }

  useEffect(() => {
    if (!active) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const canvas = contextBoardCanvasRef.current;
      if (!canvas) {
        return;
      }

      canvas.scrollLeft = Math.max(
        0,
        (CONTEXT_BOARD_WIDTH * contextBoardZoom - canvas.clientWidth) / 2,
      );
      canvas.scrollTop = Math.max(
        0,
        (CONTEXT_BOARD_HEIGHT * contextBoardZoom - canvas.clientHeight) / 2,
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [active, contextBoardCenterRequest]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const canvas = contextBoardCanvasRef.current;
    if (!canvas) {
      return;
    }
    const canvasElement = canvas;

    function handleWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      updateContextBoardZoomFromCanvasCenter(
        canvasElement,
        contextBoardZoom + direction * CONTEXT_BOARD_ZOOM_STEP,
      );
    }

    canvasElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvasElement.removeEventListener("wheel", handleWheel);
  }, [active, contextBoardZoom]);

  useLayoutEffect(() => {
    const anchor = contextBoardZoomAnchorRef.current;
    const canvas = contextBoardCanvasRef.current;

    if (!anchor || !canvas) {
      return;
    }

    contextBoardZoomAnchorRef.current = null;
    canvas.scrollLeft = Math.max(0, anchor.boardX * contextBoardZoom - anchor.offsetX);
    canvas.scrollTop = Math.max(0, anchor.boardY * contextBoardZoom - anchor.offsetY);
  }, [contextBoardZoom]);

  useEffect(() => {
    if (!active) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (
        closeGuardOpen ||
        contextFinalizeDialogOpen ||
        contextSaveDialogOpen ||
        contextSavedSessionsModalOpen ||
        contextBoardResetGuardOpen ||
        contextBoardTemplateTrayDeleteRequest
      ) {
        return;
      }

      if (contextBoardKeyboardTargetIsEditable(event.target)) {
        if (event.key === "Escape") {
          (event.target as HTMLElement).blur();
          event.preventDefault();
        }
        return;
      }

      if (contextBriefReadOnly) {
        if (event.key === "Escape") {
          event.preventDefault();
          clearContextBoardSelection();
        }
        return;
      }

      const hasModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (hasModifier && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoContextBoardAction();
        return;
      }

      if (
        (hasModifier && key === "y") ||
        (hasModifier && event.shiftKey && key === "z")
      ) {
        event.preventDefault();
        redoContextBoardAction();
        return;
      }

      if (hasModifier && key === "a") {
        event.preventDefault();
        selectAllContextBoardItems();
        return;
      }

      if (hasModifier && key === "d") {
        event.preventDefault();
        duplicateSelectedContextBoardItems();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelectedContextBoardItems();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearContextBoardSelection();
        return;
      }

      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        const step = event.shiftKey ? 32 : 8;
        event.preventDefault();

        if (event.key === "ArrowLeft") {
          nudgeContextBoardSelection(-step, 0);
        } else if (event.key === "ArrowRight") {
          nudgeContextBoardSelection(step, 0);
        } else if (event.key === "ArrowUp") {
          nudgeContextBoardSelection(0, -step);
        } else {
          nudgeContextBoardSelection(0, step);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function captureContextBoardSnapshot(): ContextBoardSnapshot {
    return cloneContextBoardSnapshot({
      connections: contextBoardConnections,
      customItems: contextBoardCustomItems,
      positions: contextBoardPositions,
      removedCoreIds: contextBoardRemovedCoreIds,
      sketchStrokes: contextBoardSketchStrokes,
      style: contextBoardStyle,
      templateTrays: contextBoardTemplateTrays,
    });
  }

  function restoreContextBoardSnapshot(snapshot: ContextBoardSnapshot) {
    const nextSnapshot = cloneContextBoardSnapshot(snapshot);

    setContextBoardPositions(nextSnapshot.positions);
    setContextBoardCustomItems(nextSnapshot.customItems);
    setContextBoardTemplateTrays(nextSnapshot.templateTrays);
    setContextBoardConnections(nextSnapshot.connections);
    setContextBoardRemovedCoreIds(nextSnapshot.removedCoreIds);
    setContextBoardSketchStrokes(nextSnapshot.sketchStrokes);
    setContextBoardStyle(nextSnapshot.style);
    setContextBoardStyleTarget(null);
    setContextBoardSelectedItems([]);
    setContextBoardSelectionBox(null);
    contextBoardSketchDraftRef.current = null;
    contextBoardSketchDragRef.current = null;
    setContextBoardSketchDraft(null);
    setContextBoardResetGuardOpen(false);
    setContextBoardTemplateTrayDeleteRequest(null);
    setContextBoardResize(null);
    setContextBoardDrag(null);
    contextBoardConnectionDraftRef.current = null;
    setContextBoardConnectionDraft(null);
    markBoardDirty();
  }

  function commitContextBoardHistorySnapshot(snapshot: ContextBoardSnapshot) {
    const nextSnapshot = cloneContextBoardSnapshot(snapshot);

    setContextBoardUndoStack((stack) => {
      const lastSnapshot = stack.at(-1);

      if (
        lastSnapshot &&
        contextBoardSnapshotsEqual(lastSnapshot, nextSnapshot)
      ) {
        return stack;
      }

      return [...stack.slice(-39), nextSnapshot];
    });
    setContextBoardRedoStack([]);
  }

  function commitCurrentContextBoardHistorySnapshot() {
    commitContextBoardHistorySnapshot(captureContextBoardSnapshot());
  }

  function undoContextBoardAction() {
    if (contextBriefReadOnly) {
      return;
    }

    const previousSnapshot = contextBoardUndoStack.at(-1);

    if (!previousSnapshot) {
      return;
    }

    setContextBoardUndoStack((stack) => stack.slice(0, -1));
    setContextBoardRedoStack((stack) => [
      captureContextBoardSnapshot(),
      ...stack.slice(0, 39),
    ]);
    restoreContextBoardSnapshot(previousSnapshot);
  }

  function redoContextBoardAction() {
    if (contextBriefReadOnly) {
      return;
    }

    const nextSnapshot = contextBoardRedoStack.at(0);

    if (!nextSnapshot) {
      return;
    }

    setContextBoardRedoStack((stack) => stack.slice(1));
    setContextBoardUndoStack((stack) => [
      ...stack.slice(-39),
      captureContextBoardSnapshot(),
    ]);
    restoreContextBoardSnapshot(nextSnapshot);
  }

  function addContextBoardItem(kind: ContextBoardCustomItem["kind"]) {
    if (contextBriefReadOnly) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const copy = contextBoardCustomKindCopy(kind);
    const itemNumber = contextBoardCustomItems.filter((item) => item.kind === kind).length + 1;
    const placementIndex = contextBoardCustomItems.length + 1;
    const visibleCenter = getContextBoardVisibleCenter();
    const itemSize = contextBoardCustomItemSize(kind, contextBoardDiagramType);
    const placementOffset = Math.min((placementIndex - 1) % 5, 4);
    const stackedOffsetX =
      placementOffset * (contextBoardCustomKindIsLabel(kind) ? 74 : 96);
    const stackedOffsetY =
      placementOffset * (contextBoardCustomKindIsLabel(kind) ? 68 : 126);
    const nextItem: ContextBoardCustomItem = {
      diagramType: contextBoardDiagramType,
      detail: copy.detail,
      id: `${kind}-${Date.now()}`,
      kind,
      label: `${copy.label} ${itemNumber}`,
      width: itemSize.width,
      ...(contextBoardCustomKindAutoSizesText(kind, contextBoardDiagramType)
        ? {}
        : { height: itemSize.height }),
      x: Math.max(
        16,
        Math.min(
          CONTEXT_BOARD_WIDTH - itemSize.width - 16,
          visibleCenter.x - itemSize.width / 2 + stackedOffsetX,
        ),
      ),
      y: Math.max(
        16,
        Math.min(
          CONTEXT_BOARD_HEIGHT - itemSize.height - 16,
          visibleCenter.y - itemSize.height / 2 + stackedOffsetY,
        ),
      ),
    };

    setContextBoardCustomItems((items) => [
      ...items,
      nextItem,
    ]);
    setContextBoardStyleTarget({ id: nextItem.id, itemType: "custom" });
    setContextBoardSelectedItems([{ id: nextItem.id, itemType: "custom" }]);
    setContextBoardTool("move");
    markBoardDirty();
  }

  function addContextBoardTray() {
    if (contextBriefReadOnly) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const trayWidth = 520;
    const trayHeight = 260;
    const visibleCenter = getContextBoardVisibleCenter();
    const trayNumber = contextBoardTemplateTrays.filter((tray) => tray.manual).length + 1;
    const x = Math.max(
      16,
      Math.min(CONTEXT_BOARD_WIDTH - trayWidth - 16, visibleCenter.x - trayWidth / 2),
    );
    const y = Math.max(
      16,
      Math.min(
        CONTEXT_BOARD_HEIGHT - trayHeight - 16,
        visibleCenter.y - trayHeight / 2,
      ),
    );
    const nextTray: ContextBoardTemplateTray = {
      diagramType: contextBoardDiagramType,
      height: trayHeight,
      id: `tray-${contextBoardDiagramType}-${Date.now()}`,
      itemIds: [],
      label: `${contextBoardDiagramCopy(contextBoardDiagramType).label} Tray ${trayNumber}`,
      manual: true,
      width: trayWidth,
      x,
      y,
    };

    setContextBoardTemplateTrays((trays) => [...trays, nextTray]);
    setContextBoardStyleTarget({ id: nextTray.id, itemType: "template" });
    setContextBoardSelectedItems([{ id: nextTray.id, itemType: "template" }]);
    setContextBoardTool("move");
    markBoardDirty();
  }

  function getContextBoardVisibleCenter(): ContextBoardPosition {
    const canvas = contextBoardCanvasRef.current;

    if (!canvas) {
      return {
        x: CONTEXT_BOARD_WIDTH / 2,
        y: CONTEXT_BOARD_HEIGHT / 2,
      };
    }

    return {
      x: (canvas.scrollLeft + canvas.clientWidth / 2) / contextBoardZoom,
      y: (canvas.scrollTop + canvas.clientHeight / 2) / contextBoardZoom,
    };
  }

  function startContextBoardSketch(event: PointerEvent<HTMLDivElement>) {
    if (contextBriefReadOnly) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setContextBoardStyleTarget(null);
    setContextBoardSelectedItems([]);
    setContextBoardSelectionBox(null);

    const point = clientPointToContextBoardPoint(event.clientX, event.clientY);
    const originSnapshot = captureContextBoardSnapshot();

    contextBoardSketchDragRef.current = {
      changed: false,
      originSnapshot,
      pointerId: event.pointerId,
      tool: contextBoardSketchTool,
    };

    if (contextBoardSketchTool === "eraser") {
      eraseContextBoardSketchAt(point);
      return;
    }

    const copy = contextBoardSketchToolCopy(contextBoardSketchTool);
    const stroke: ContextBoardSketchStroke = {
      id: `sketch-${Date.now()}`,
      opacity: copy.opacity,
      points: [point],
      tone: contextBoardSketchTone,
      tool: contextBoardSketchTool,
      width: copy.width,
    };

    contextBoardSketchDraftRef.current = stroke;
    setContextBoardSketchDraft(stroke);
  }

  function moveContextBoardSketch(event: PointerEvent<HTMLDivElement>) {
    const drag = contextBoardSketchDragRef.current;

    if (!drag || event.pointerId !== drag.pointerId) {
      return false;
    }

    event.preventDefault();
    const point = clientPointToContextBoardPoint(event.clientX, event.clientY);

    if (drag.tool === "eraser") {
      eraseContextBoardSketchAt(point);
      return true;
    }

    const currentDraft = contextBoardSketchDraftRef.current;

    if (!currentDraft) {
      return true;
    }

    const lastPoint = currentDraft.points.at(-1);
    if (lastPoint && contextBoardPointDistance(lastPoint, point) < 2.5) {
      return true;
    }

    const nextDraft = {
      ...currentDraft,
      points: [...currentDraft.points, point],
    };

    contextBoardSketchDraftRef.current = nextDraft;
    contextBoardSketchDragRef.current = {
      ...drag,
      changed: true,
    };
    setContextBoardSketchDraft(nextDraft);
    return true;
  }

  function endContextBoardSketch(event: PointerEvent<HTMLDivElement>) {
    const drag = contextBoardSketchDragRef.current;

    if (!drag || event.pointerId !== drag.pointerId) {
      return false;
    }

    event.preventDefault();

    const draft = contextBoardSketchDraftRef.current;
    const shouldKeepDraft =
      drag.tool !== "eraser" && draft && draft.points.length > 1;

    if (shouldKeepDraft && draft) {
      commitContextBoardHistorySnapshot(drag.originSnapshot);
      setContextBoardSketchStrokes((strokes) => [...strokes, draft]);
      markBoardDirty();
    } else if (drag.tool === "eraser" && drag.changed) {
      commitContextBoardHistorySnapshot(drag.originSnapshot);
      markBoardDirty();
    }

    contextBoardSketchDraftRef.current = null;
    contextBoardSketchDragRef.current = null;
    setContextBoardSketchDraft(null);
    return true;
  }

  function eraseContextBoardSketchAt(point: ContextBoardPosition) {
    const eraserRadius = 28 / contextBoardZoom;
    const hasHit = contextBoardSketchStrokes.some((stroke) =>
      contextBoardStrokeIntersectsPoint(stroke, point, eraserRadius),
    );

    if (hasHit) {
      const currentDrag = contextBoardSketchDragRef.current;

      if (currentDrag) {
        contextBoardSketchDragRef.current = {
          ...currentDrag,
          changed: true,
        };
      }
    }

    setContextBoardSketchStrokes((strokes) =>
      strokes.filter((stroke) => {
        const shouldRemove = contextBoardStrokeIntersectsPoint(
          stroke,
          point,
          eraserRadius,
        );

        return !shouldRemove;
      }),
    );
  }

  function updateContextBoardItemContent(
    itemId: string,
    field: "detail" | "label",
    value: string,
  ) {
    if (contextBriefReadOnly) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    setContextBoardCustomItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
    markBoardDirty();
  }

  function addContextBoardDiagramLabel(
    preset: ContextBoardDiagramLabelPreset,
  ) {
    if (contextBriefReadOnly) {
      return;
    }

    const label = preset.label;
    const visibleCenter = getContextBoardVisibleCenter();
    const baseSize = contextBoardCustomItemSize(
      "label-tag",
      contextBoardDiagramType,
    );
    const itemNumber =
      contextBoardCustomItems.filter(
        (item) =>
          item.diagramType === contextBoardDiagramType &&
          item.kind === "label-tag",
      ).length + 1;
    const placementOffset = Math.min(itemNumber % 5, 4);
    const itemWidth = Math.min(
      220,
      Math.max(baseSize.width, label.length * 7.2 + 46),
    );

    commitCurrentContextBoardHistorySnapshot();
    const nextItem: ContextBoardCustomItem = {
      detail: "",
      diagramType: contextBoardDiagramType,
      height: baseSize.height,
      id: `diagram-label-${preset.id}-${Date.now()}`,
      kind: "label-tag",
      label,
      tone: preset.tone,
      width: itemWidth,
      x: Math.max(
        16,
        Math.min(
          CONTEXT_BOARD_WIDTH - itemWidth - 16,
          visibleCenter.x - itemWidth / 2 + placementOffset * 72,
        ),
      ),
      y: Math.max(
        16,
        Math.min(
          CONTEXT_BOARD_HEIGHT - baseSize.height - 16,
          visibleCenter.y - baseSize.height / 2 + placementOffset * 58,
        ),
      ),
    };

    setContextBoardCustomItems((items) => [...items, nextItem]);
    setContextBoardSelectedItems([{ id: nextItem.id, itemType: "custom" }]);
    setContextBoardStyleTarget({ id: nextItem.id, itemType: "custom" });
    setContextBoardTool("move");
    markBoardDirty();
  }

  function openContextBoardToolDrawer(drawer: ContextBoardToolDrawer) {
    if (contextBriefReadOnly) {
      return;
    }

    setContextBoardActiveToolDrawer(drawer);
    setContextBoardToolsCollapsed(false);
  }

  function toggleContextBoardToolDrawer(drawer: ContextBoardToolDrawer) {
    if (contextBriefReadOnly) {
      return;
    }

    if (contextBoardActiveToolDrawer === drawer && !contextBoardToolsCollapsed) {
      setContextBoardToolsCollapsed(true);
      return;
    }

    openContextBoardToolDrawer(drawer);
  }

  function setContextBoardPrimaryTool(tool: ContextBoardTool) {
    if (contextBriefReadOnly) {
      return;
    }

    setContextBoardTool(tool);
    setContextBoardToolsCollapsed(true);
  }

  function toggleContextBoardToolSection(section: ContextBoardToolSection) {
    if (contextBriefReadOnly) {
      return;
    }

    if (
      section === "component" ||
      section === "diagram" ||
      section === "diagram-label"
    ) {
      openContextBoardToolDrawer("diagram");
      return;
    }

    openContextBoardToolDrawer(section);
  }

  function contextBoardToolSectionSummary(section: ContextBoardToolSection) {
    switch (section) {
      case "arrange":
        return `${contextBoardSelectedItems.length} selected`;
      case "component":
        return `${contextBoardComponentKinds.length} components`;
      case "connector":
        return `${contextBoardConnectorShape} / ${contextBoardConnectorTip}`;
      case "diagram":
        return contextBoardDiagramCopy(contextBoardDiagramType).label;
      case "general":
        return `${contextBoardGeneralItemKinds.length + 1} tools`;
      case "sketch":
        return contextBoardSketchToolCopy(contextBoardSketchTool).label;
      case "style":
        return contextBoardStyleCopy(contextBoardStyle).label;
      case "diagram-label":
        return `${contextBoardDiagramLabelPresets.length} labels`;
    }
  }

  function addContextBoardStarter(
    diagramType: ContextBoardDiagramType = contextBoardDiagramType,
  ) {
    if (contextBriefReadOnly) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const timestamp = Date.now();
    const visibleCenter = getContextBoardVisibleCenter();
    const rawStarterItems = createDiagramStarterItems(
      diagramType,
      timestamp,
      contextBoardCustomItems.length,
    );
    const starterItems = contextBoardDiagramStarterUsesIntrinsicCanvas(diagramType)
      ? rawStarterItems
      : contextBoardItemsCenteredAt(rawStarterItems, visibleCenter);
    const starterConnections = createDiagramStarterConnections(
      diagramType,
      starterItems,
      timestamp,
    );
    const starterLabelItems = contextBoardDiagramStarterLabelItems(
      diagramType,
      starterItems,
      starterConnections,
      timestamp,
    );
    const allStarterItems = [...starterItems, ...starterLabelItems];
    const templateTray = contextBoardTemplateTrayFromItems(
      diagramType,
      allStarterItems,
      timestamp,
    );

    if (diagramType === "freeform" && contextBoardStyle !== "plain") {
      setContextBoardStyle("plain");
    }
    setContextBoardCustomItems((items) => [...items, ...allStarterItems]);
    setContextBoardTemplateTrays((trays) => [...trays, templateTray]);
    setContextBoardStyleTarget({ id: templateTray.id, itemType: "template" });
    setContextBoardSelectedItems([{ id: templateTray.id, itemType: "template" }]);
    setContextBoardConnections((connections) => [
      ...connections,
      ...starterConnections,
    ]);
    const starterFocus = contextBoardDiagramStarterViewportFocus(diagramType);
    if (starterFocus) {
      if (contextBoardZoom > starterFocus.zoom) {
        setContextBoardZoom(starterFocus.zoom);
      }
      focusContextBoardItems(allStarterItems, starterFocus);
    }
    setContextBoardConnectorShape(
      diagramType === "flowchart" ||
        diagramType === "sequence" ||
        diagramType === "swimlane"
        ? "straight"
        : "curve",
    );
    setContextBoardConnectorTip(
      diagramType === "freeform" || diagramType === "mindmap"
        ? "plain"
        : "arrow",
    );
    setContextBoardConnectorStartTip("plain");
    setContextBoardTool("move");
    markBoardDirty();
  }

  function updateContextBoardColorTone(tone: ContextBoardColorTone) {
    if (contextBriefReadOnly) {
      return;
    }

    if (!contextBoardStyleTarget) {
      return;
    }

    const nextTone = tone === "default" ? undefined : tone;
    commitCurrentContextBoardHistorySnapshot();

    if (contextBoardStyleTarget.itemType === "custom") {
      setContextBoardCustomItems((items) =>
        items.map((item) =>
          item.id === contextBoardStyleTarget.id
            ? { ...item, tone: nextTone }
            : item,
        ),
      );
    } else {
      setContextBoardTemplateTrays((trays) =>
        trays.map((tray) =>
          tray.id === contextBoardStyleTarget.id
            ? { ...tray, tone: nextTone }
            : tray,
        ),
      );
    }

    markBoardDirty();
  }

  function updateContextBoardStyle(style: ContextBoardStyle) {
    if (contextBriefReadOnly) {
      return;
    }

    if (style === contextBoardStyle) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    setContextBoardStyle(style);
    markBoardDirty();
  }

  function updateContextBoardDiagramType(diagramType: ContextBoardDiagramType) {
    if (contextBriefReadOnly) {
      return;
    }

    setContextBoardDiagramType(diagramType);

    if (diagramType === "freeform" && contextBoardStyle !== "plain") {
      setContextBoardStyle("plain");
    }

  }

  function focusContextBoardItems(
    items: ContextBoardCustomItem[],
    options?: { leftClearance?: number; topClearance?: number; zoom?: number },
  ) {
    if (items.length === 0) {
      return;
    }

    focusContextBoardBounds(contextBoardSurfaceBounds(items.map((item) => {
      const size = contextBoardCustomItemResolvedSize(item);

      return {
        height: size.height,
        id: item.id,
        itemType: "custom" as const,
        width: size.width,
        x: item.x,
        y: item.y,
      };
    })), options);
  }

  function focusContextBoardBounds(
    bounds: ContextBoardSurfaceBounds,
    options?: {
      center?: boolean;
      leftClearance?: number;
      topClearance?: number;
      zoom?: number;
    },
  ) {
    const zoom = options?.zoom ?? contextBoardZoom;

    if (options?.zoom && options.zoom !== contextBoardZoom) {
      setContextBoardZoom(options.zoom);
    }

    window.requestAnimationFrame(() => {
      const canvas = contextBoardCanvasRef.current;

      if (!canvas) {
        return;
      }

      const maxScrollLeft = Math.max(
        0,
        CONTEXT_BOARD_WIDTH * zoom - canvas.clientWidth,
      );
      const maxScrollTop = Math.max(
        0,
        CONTEXT_BOARD_HEIGHT * zoom - canvas.clientHeight,
      );

      if (options?.center) {
        const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
        const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
        canvas.scrollLeft = Math.max(
          0,
          Math.min(maxScrollLeft, centerX * zoom - canvas.clientWidth / 2),
        );
        canvas.scrollTop = Math.max(
          0,
          Math.min(maxScrollTop, centerY * zoom - canvas.clientHeight / 2),
        );
        return;
      }

      canvas.scrollLeft = Math.max(
        0,
        Math.min(
          maxScrollLeft,
          bounds.minX * zoom - (options?.leftClearance ?? 300),
        ),
      );
      canvas.scrollTop = Math.max(
        0,
        Math.min(
          maxScrollTop,
          bounds.minY * zoom - (options?.topClearance ?? 220),
        ),
      );
    });
  }

  function focusSelectedContextBoardItems() {
    const selectedSurfaces = getContextBoardSelectedSurfaceBoxes();

    if (selectedSurfaces.length === 0) {
      return;
    }

    focusContextBoardBounds(contextBoardSurfaceBounds(selectedSurfaces), {
      center: true,
    });
  }

  function fitContextBoardContent() {
    const surfaces = getContextBoardAllSurfaceBoxes();

    if (surfaces.length === 0) {
      setContextBoardZoom(1);
      setContextBoardCenterRequest((request) => request + 1);
      return;
    }

    const canvas = contextBoardCanvasRef.current;
    const bounds = contextBoardSurfaceBounds(surfaces);

    if (!canvas) {
      focusContextBoardBounds(bounds, { center: true });
      return;
    }

    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const nextZoom = clampContextBoardZoom(
      Math.min(
        1.1,
        (canvas.clientWidth - 96) / width,
        (canvas.clientHeight - 96) / height,
      ),
    );

    focusContextBoardBounds(bounds, {
      center: true,
      zoom: nextZoom,
    });
  }

  function getContextBoardViewportSurface():
    | (ContextBoardPosition & { height: number; width: number })
    | null {
    void contextBoardViewportTick;
    const canvas = contextBoardCanvasRef.current;

    if (!canvas) {
      return null;
    }

    return {
      height: canvas.clientHeight / contextBoardZoom,
      width: canvas.clientWidth / contextBoardZoom,
      x: canvas.scrollLeft / contextBoardZoom,
      y: canvas.scrollTop / contextBoardZoom,
    };
  }

  function centerContextBoardViewportAt(point: ContextBoardPosition) {
    const canvas = contextBoardCanvasRef.current;

    if (!canvas) {
      return;
    }

    const maxScrollLeft = Math.max(
      0,
      CONTEXT_BOARD_WIDTH * contextBoardZoom - canvas.clientWidth,
    );
    const maxScrollTop = Math.max(
      0,
      CONTEXT_BOARD_HEIGHT * contextBoardZoom - canvas.clientHeight,
    );

    canvas.scrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, point.x * contextBoardZoom - canvas.clientWidth / 2),
    );
    canvas.scrollTop = Math.max(
      0,
      Math.min(maxScrollTop, point.y * contextBoardZoom - canvas.clientHeight / 2),
    );
    setContextBoardViewportTick((tick) => tick + 1);
  }

  function contextBoardNavigatorPointFromEvent(
    event: PointerEvent<HTMLDivElement>,
  ): ContextBoardPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    return {
      x: x * CONTEXT_BOARD_WIDTH,
      y: y * CONTEXT_BOARD_HEIGHT,
    };
  }

  function startContextBoardNavigatorPan(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    contextBoardNavigatorDragRef.current = event.pointerId;
    centerContextBoardViewportAt(contextBoardNavigatorPointFromEvent(event));
  }

  function moveContextBoardNavigatorPan(event: PointerEvent<HTMLDivElement>) {
    if (contextBoardNavigatorDragRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    centerContextBoardViewportAt(contextBoardNavigatorPointFromEvent(event));
  }

  function endContextBoardNavigatorPan(event: PointerEvent<HTMLDivElement>) {
    if (contextBoardNavigatorDragRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    contextBoardNavigatorDragRef.current = null;
  }

  function contextBoardFloatingSourcesStyle() {
    const viewport = getContextBoardViewportSurface();
    const panelHeight = contextBoardInputsCollapsed ? 30 : 228;
    const top = viewport
      ? Math.max(184, viewport.height * contextBoardZoom - panelHeight - 8)
      : contextBoardInputsCollapsed
        ? 584
        : 384;

    return {
      "--context-sources-top": `${top}px`,
    } as CSSProperties;
  }

  function getContextBoardAllSurfaceBoxes(): ContextBoardSurfaceBox[] {
    return [
      ...contextBoardCoreNodes.map((node) => ({
        height: CONTEXT_BOARD_CORE_CARD_HEIGHT,
        id: node.id,
        itemType: "core" as const,
        width: CONTEXT_BOARD_CORE_CARD_WIDTH,
        x: contextBoardPositions[node.id].x,
        y: contextBoardPositions[node.id].y,
      })),
      ...contextBoardTemplateTrays.map((tray) => ({
        height: tray.height,
        id: tray.id,
        itemType: "template" as const,
        width: tray.width,
        x: tray.x,
        y: tray.y,
      })),
      ...contextBoardCustomItems.map((item) => {
        const size = contextBoardCustomItemResolvedSize(item);

        return {
          height: size.height,
          id: item.id,
          itemType: "custom" as const,
          width: size.width,
          x: item.x,
          y: item.y,
        };
      }),
    ];
  }

  function getContextBoardSelectedSurfaceBoxes(): ContextBoardSurfaceBox[] {
    return contextBoardSelectedItems
      .map((item) => getContextBoardSurfaceBox(item))
      .filter((box): box is ContextBoardSurfaceBox => Boolean(box));
  }

  function getContextBoardSurfaceBox(
    item: ContextBoardSelectionItem,
  ): ContextBoardSurfaceBox | null {
    if (item.itemType === "core") {
      const position = contextBoardPositions[item.id];

      if (!position || contextBoardRemovedCoreIds.includes(item.id)) {
        return null;
      }

      return {
        height: CONTEXT_BOARD_CORE_CARD_HEIGHT,
        id: item.id,
        itemType: "core",
        width: CONTEXT_BOARD_CORE_CARD_WIDTH,
        x: position.x,
        y: position.y,
      };
    }

    if (item.itemType === "template") {
      const tray = contextBoardTemplateTrays.find(
        (templateTray) => templateTray.id === item.id,
      );

      if (!tray) {
        return null;
      }

      return {
        height: tray.height,
        id: tray.id,
        itemType: "template",
        width: tray.width,
        x: tray.x,
        y: tray.y,
      };
    }

    const customItem = contextBoardCustomItems.find(
      (candidate) => candidate.id === item.id,
    );

    if (!customItem) {
      return null;
    }

    const size = contextBoardCustomItemResolvedSize(customItem);

    return {
      height: size.height,
      id: customItem.id,
      itemType: "custom",
      width: size.width,
      x: customItem.x,
      y: customItem.y,
    };
  }

  function buildContextBoardSurfaceDelta(
    surface: ContextBoardSurfaceBox,
    position: ContextBoardPosition,
  ): ContextBoardPosition {
    const nextX = Math.max(
      16,
      Math.min(CONTEXT_BOARD_WIDTH - surface.width - 16, position.x),
    );
    const nextY = Math.max(
      16,
      Math.min(CONTEXT_BOARD_HEIGHT - surface.height - 16, position.y),
    );

    return {
      x: nextX - surface.x,
      y: nextY - surface.y,
    };
  }

  function applyContextBoardSurfaceDeltas(
    deltas: Map<string, ContextBoardPosition>,
  ) {
    const templateDeltas = new Map<string, ContextBoardPosition>();
    const explicitCustomDeltas = new Set<string>();
    const templateChildDeltas = new Map<string, ContextBoardPosition>();

    for (const [key, delta] of deltas.entries()) {
      const item = contextBoardSelectionFromKey(key);

      if (!item) {
        continue;
      }

      if (item.itemType === "template") {
        templateDeltas.set(item.id, delta);
        continue;
      }

      if (item.itemType === "custom") {
        explicitCustomDeltas.add(item.id);
      }
    }

    for (const tray of contextBoardTemplateTrays) {
      const delta = templateDeltas.get(tray.id);

      if (!delta) {
        continue;
      }

      for (const itemId of tray.itemIds) {
        if (!explicitCustomDeltas.has(itemId)) {
          templateChildDeltas.set(itemId, delta);
        }
      }
    }

    setContextBoardPositions((positions) => {
      const nextPositions = { ...positions };

      for (const [key, delta] of deltas.entries()) {
        const item = contextBoardSelectionFromKey(key);

        if (item?.itemType === "core" && nextPositions[item.id]) {
          nextPositions[item.id] = {
            x: nextPositions[item.id].x + delta.x,
            y: nextPositions[item.id].y + delta.y,
          };
        }
      }

      return nextPositions;
    });
    setContextBoardTemplateTrays((trays) =>
      trays.map((tray) => {
        const delta = templateDeltas.get(tray.id);

        return delta
          ? {
              ...tray,
              x: tray.x + delta.x,
              y: tray.y + delta.y,
            }
          : tray;
      }),
    );
    setContextBoardCustomItems((items) =>
      items.map((item) => {
        const explicitDelta = deltas.get(
          contextBoardSelectionKey({ id: item.id, itemType: "custom" }),
        );
        const delta = explicitDelta ?? templateChildDeltas.get(item.id);

        return delta
          ? {
              ...item,
              x: item.x + delta.x,
              y: item.y + delta.y,
            }
          : item;
      }),
    );
  }

  function alignContextBoardSelection(action: ContextBoardAlignAction) {
    if (contextBriefReadOnly) {
      return;
    }

    const surfaces = getContextBoardSelectedSurfaceBoxes();

    if (surfaces.length < 2) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const bounds = contextBoardSurfaceBounds(surfaces);
    const groupCenterX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const groupCenterY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
    const deltas = new Map<string, ContextBoardPosition>();

    for (const surface of surfaces) {
      let nextX = surface.x;
      let nextY = surface.y;

      switch (action) {
        case "align-bottom":
          nextY = bounds.maxY - surface.height;
          break;
        case "align-center-x":
          nextX = groupCenterX - surface.width / 2;
          break;
        case "align-center-y":
          nextY = groupCenterY - surface.height / 2;
          break;
        case "align-left":
          nextX = bounds.minX;
          break;
        case "align-right":
          nextX = bounds.maxX - surface.width;
          break;
        case "align-top":
          nextY = bounds.minY;
          break;
      }

      deltas.set(
        contextBoardSelectionKey(surface),
        buildContextBoardSurfaceDelta(surface, { x: nextX, y: nextY }),
      );
    }

    applyContextBoardSurfaceDeltas(deltas);
    markBoardDirty();
  }

  function distributeContextBoardSelection(
    action: ContextBoardDistributeAction,
  ) {
    if (contextBriefReadOnly) {
      return;
    }

    const surfaces = getContextBoardSelectedSurfaceBoxes();

    if (surfaces.length < 3) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const bounds = contextBoardSurfaceBounds(surfaces);
    const deltas = new Map<string, ContextBoardPosition>();

    if (action === "distribute-horizontal") {
      const sorted = [...surfaces].sort((left, right) => left.x - right.x);
      const totalWidth = sorted.reduce((sum, surface) => sum + surface.width, 0);
      const gap = (bounds.maxX - bounds.minX - totalWidth) / (sorted.length - 1);
      let cursorX = bounds.minX;

      for (const surface of sorted) {
        deltas.set(
          contextBoardSelectionKey(surface),
          buildContextBoardSurfaceDelta(surface, { x: cursorX, y: surface.y }),
        );
        cursorX += surface.width + gap;
      }
    } else {
      const sorted = [...surfaces].sort((top, bottom) => top.y - bottom.y);
      const totalHeight = sorted.reduce((sum, surface) => sum + surface.height, 0);
      const gap = (bounds.maxY - bounds.minY - totalHeight) / (sorted.length - 1);
      let cursorY = bounds.minY;

      for (const surface of sorted) {
        deltas.set(
          contextBoardSelectionKey(surface),
          buildContextBoardSurfaceDelta(surface, { x: surface.x, y: cursorY }),
        );
        cursorY += surface.height + gap;
      }
    }

    applyContextBoardSurfaceDeltas(deltas);
    markBoardDirty();
  }

  function layerContextBoardSelection(action: ContextBoardLayerAction) {
    if (contextBriefReadOnly) {
      return;
    }

    const selectedCustomIds = new Set(
      contextBoardSelectedItems
        .filter((item) => item.itemType === "custom")
        .map((item) => item.id),
    );
    const selectedTemplateIds = new Set(
      contextBoardSelectedItems
        .filter((item) => item.itemType === "template")
        .map((item) => item.id),
    );

    if (selectedCustomIds.size === 0 && selectedTemplateIds.size === 0) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    setContextBoardCustomItems((items) =>
      contextBoardReorderBySelection(items, selectedCustomIds, action),
    );
    setContextBoardTemplateTrays((trays) =>
      contextBoardReorderBySelection(trays, selectedTemplateIds, action),
    );
    markBoardDirty();
  }

  function clearContextBoardSelection() {
    setContextBoardSelectedItems([]);
    setContextBoardStyleTarget(null);
    setContextBoardSelectionBox(null);
  }

  function selectAllContextBoardItems() {
    if (contextBriefReadOnly) {
      return;
    }

    const selectedItems = getContextBoardAllSurfaceBoxes().map(
      ({ id, itemType }) => ({ id, itemType }),
    );

    setContextBoardSelectedItems(selectedItems);
    setContextBoardStyleTarget(null);
    setContextBoardTool("select");
  }

  function removeSelectedContextBoardItems() {
    if (contextBriefReadOnly) {
      return;
    }

    if (contextBoardSelectedItems.length === 0) {
      return;
    }

    const selectedTemplate = contextBoardSelectedItems.find(
      (item) => item.itemType === "template",
    );

    if (selectedTemplate) {
      const tray = contextBoardTemplateTrays.find(
        (templateTray) => templateTray.id === selectedTemplate.id,
      );

      if (tray) {
        setContextBoardTemplateTrayDeleteRequest(tray);
      }
      return;
    }

    const selectedCoreIds = new Set(
      contextBoardSelectedItems
        .filter((item) => item.itemType === "core")
        .map((item) => item.id),
    );
    const selectedCustomIds = new Set(
      contextBoardSelectedItems
        .filter((item) => item.itemType === "custom")
        .map((item) => item.id),
    );

    if (selectedCoreIds.size === 0 && selectedCustomIds.size === 0) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    setContextBoardRemovedCoreIds((ids) =>
      Array.from(new Set([...ids, ...selectedCoreIds])),
    );
    setContextBoardCustomItems((items) =>
      items.filter((item) => !selectedCustomIds.has(item.id)),
    );
    setContextBoardTemplateTrays((trays) =>
      trays
        .map((tray) => ({
          ...tray,
          itemIds: tray.itemIds.filter(
            (trayItemId) => !selectedCustomIds.has(trayItemId),
          ),
        }))
        .filter((tray) => tray.manual || tray.itemIds.length > 0),
    );
    setContextBoardConnections((connections) =>
      connections.filter((connection) => {
        if (contextBoardEndpointIsFree(connection.from)) {
          return !contextBoardEndpointHitsSelection(
            connection.to,
            selectedCoreIds,
            selectedCustomIds,
          );
        }

        if (contextBoardEndpointIsFree(connection.to)) {
          return !contextBoardEndpointHitsSelection(
            connection.from,
            selectedCoreIds,
            selectedCustomIds,
          );
        }

        return (
          !contextBoardEndpointHitsSelection(
            connection.from,
            selectedCoreIds,
            selectedCustomIds,
          ) &&
          !contextBoardEndpointHitsSelection(
            connection.to,
            selectedCoreIds,
            selectedCustomIds,
          )
        );
      }),
    );
    clearContextBoardSelection();
    setContextBoardConnectionDraft(null);
    contextBoardConnectionDraftRef.current = null;
    markBoardDirty();
  }

  function duplicateSelectedContextBoardItems() {
    if (contextBriefReadOnly) {
      return;
    }

    const selectedCustomIds = new Set(
      contextBoardSelectedItems
        .filter((item) => item.itemType === "custom")
        .map((item) => item.id),
    );

    if (selectedCustomIds.size === 0) {
      return;
    }

    const sourceItems = contextBoardCustomItems.filter((item) =>
      selectedCustomIds.has(item.id),
    );

    if (sourceItems.length === 0) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const timestamp = Date.now();
    const nextItems = sourceItems.map((sourceItem, index) => {
      const sourceSize = contextBoardCustomItemResolvedSize(sourceItem);
      const nextPosition = contextBoardDuplicatePosition(
        {
          x: sourceItem.x + index * 12,
          y: sourceItem.y + index * 12,
        },
        sourceSize,
      );

      return {
        ...sourceItem,
        id: `${sourceItem.kind}-copy-${timestamp}-${index}`,
        x: nextPosition.x,
        y: nextPosition.y,
      };
    });
    const copyBySourceId = new Map(
      sourceItems.map((sourceItem, index) => [sourceItem.id, nextItems[index].id]),
    );

    setContextBoardCustomItems((items) => [...items, ...nextItems]);
    setContextBoardTemplateTrays((trays) =>
      trays.map((tray) => {
        const copiedItemIds = tray.itemIds
          .map((itemId) => copyBySourceId.get(itemId))
          .filter((itemId): itemId is string => Boolean(itemId));

        return copiedItemIds.length > 0
          ? { ...tray, itemIds: [...tray.itemIds, ...copiedItemIds] }
          : tray;
      }),
    );
    setContextBoardSelectedItems(
      nextItems.map((item) => ({ id: item.id, itemType: "custom" as const })),
    );
    setContextBoardStyleTarget({ id: nextItems[0].id, itemType: "custom" });
    setContextBoardTool("move");
    markBoardDirty();
  }

  function nudgeContextBoardSelection(deltaX: number, deltaY: number) {
    if (contextBriefReadOnly) {
      return;
    }

    const surfaces = getContextBoardSelectedSurfaceBoxes();

    if (surfaces.length === 0) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const deltas = new Map<string, ContextBoardPosition>();

    for (const surface of surfaces) {
      deltas.set(
        contextBoardSelectionKey(surface),
        buildContextBoardSurfaceDelta(surface, {
          x: surface.x + deltaX,
          y: surface.y + deltaY,
        }),
      );
    }

    applyContextBoardSurfaceDeltas(deltas);
    markBoardDirty();
  }

  function requestResetContextBoardLayout() {
    if (contextBriefReadOnly) {
      return;
    }

    setContextBoardResetGuardOpen(true);
  }

  function confirmResetContextBoardLayout() {
    if (contextBriefReadOnly) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    setContextBoardPositions(initialContextBoardPositions());
    setContextBoardCustomItems([]);
    setContextBoardTemplateTrays([]);
    setContextBoardConnections(initialContextBoardConnections());
    setContextBoardSketchStrokes([]);
    setContextBoardStyleTarget(null);
    setContextBoardSelectedItems([]);
    setContextBoardSelectionBox(null);
    contextBoardConnectionDraftRef.current = null;
    contextBoardSketchDraftRef.current = null;
    contextBoardSketchDragRef.current = null;
    setContextBoardConnectionDraft(null);
    setContextBoardSketchDraft(null);
    setContextBoardRemovedCoreIds(initialContextBoardRemovedCoreIds());
    setContextBoardResize(null);
    setContextBoardTool("move");
    setContextBoardStyle(contextBoardDiagramType === "freeform" ? "plain" : "architecture");
    setContextBoardZoom(1);
    setContextBoardCenterRequest((request) => request + 1);
    setContextBoardResetGuardOpen(false);
    markBoardDirty();
  }

  function removeContextBoardItem(
    event: PointerEvent<HTMLButtonElement>,
    itemType: ContextBoardItemType,
    itemId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (contextBriefReadOnly) {
      return;
    }
    commitCurrentContextBoardHistorySnapshot();

    if (itemType === "core") {
      setContextBoardRemovedCoreIds((ids) =>
        ids.includes(itemId) ? ids : [...ids, itemId],
      );
    } else {
      setContextBoardCustomItems((items) =>
        items.filter((item) => item.id !== itemId),
      );
      setContextBoardTemplateTrays((trays) =>
        trays
          .map((tray) => ({
            ...tray,
            itemIds: tray.itemIds.filter((trayItemId) => trayItemId !== itemId),
          }))
          .filter((tray) => tray.manual || tray.itemIds.length > 0),
      );
    }

    setContextBoardStyleTarget((target) => {
      if (!target) {
        return null;
      }

      if (target.itemType === itemType && target.id === itemId) {
        return null;
      }

      return target;
    });
    setContextBoardSelectedItems((items) =>
      items.filter(
        (item) => item.itemType !== itemType || item.id !== itemId,
      ),
    );
    setContextBoardConnections((connections) =>
      connections.filter(
        (connection) =>
          !contextBoardEndpointMatches(connection.from, itemType, itemId) &&
          !contextBoardEndpointMatches(connection.to, itemType, itemId),
      ),
    );
    contextBoardConnectionDraftRef.current = null;
    setContextBoardConnectionDraft(null);
    markBoardDirty();
  }

  function duplicateContextBoardCustomItem(
    event: PointerEvent<HTMLButtonElement>,
    itemId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (contextBriefReadOnly) {
      return;
    }

    const sourceItem = contextBoardCustomItems.find((item) => item.id === itemId);

    if (!sourceItem) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const sourceSize = contextBoardCustomItemResolvedSize(sourceItem);
    const nextPosition = contextBoardDuplicatePosition(sourceItem, sourceSize);
    const nextItem = {
      ...sourceItem,
      id: `${sourceItem.kind}-copy-${Date.now()}-${contextBoardCustomItems.length}`,
      x: nextPosition.x,
      y: nextPosition.y,
    };

    setContextBoardCustomItems((items) => [...items, nextItem]);
    setContextBoardTemplateTrays((trays) =>
      trays.map((tray) =>
        tray.itemIds.includes(itemId)
          ? { ...tray, itemIds: [...tray.itemIds, nextItem.id] }
          : tray,
      ),
    );
    setContextBoardStyleTarget({ id: nextItem.id, itemType: "custom" });
    setContextBoardSelectedItems([{ id: nextItem.id, itemType: "custom" }]);
    setContextBoardTool("move");
    markBoardDirty();
  }

  function requestRemoveContextBoardTemplateTray(
    event: PointerEvent<HTMLButtonElement>,
    trayId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (contextBriefReadOnly) {
      return;
    }

    const tray = contextBoardTemplateTrays.find(
      (templateTray) => templateTray.id === trayId,
    );

    if (!tray) {
      return;
    }

    setContextBoardTemplateTrayDeleteRequest(tray);
  }

  function confirmRemoveContextBoardTemplateTray() {
    if (contextBriefReadOnly) {
      return;
    }

    const tray = contextBoardTemplateTrayDeleteRequest;

    if (!tray) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const trayItemIds = new Set(tray.itemIds);

    setContextBoardTemplateTrays((trays) =>
      trays.filter((templateTray) => templateTray.id !== tray.id),
    );
    setContextBoardStyleTarget((target) =>
      target?.itemType === "template" && target.id === tray.id ? null : target,
    );
    setContextBoardSelectedItems((items) =>
      items.filter((item) => {
        if (item.itemType === "template" && item.id === tray.id) {
          return false;
        }

        if (item.itemType === "custom" && trayItemIds.has(item.id)) {
          return false;
        }

        return true;
      }),
    );
    setContextBoardCustomItems((items) =>
      items.filter((item) => !trayItemIds.has(item.id)),
    );
    setContextBoardConnections((connections) =>
      connections.filter(
        (connection) =>
          !contextBoardEndpointInItemSet(connection.from, trayItemIds) &&
          !contextBoardEndpointInItemSet(connection.to, trayItemIds),
      ),
    );
    setContextBoardTemplateTrayDeleteRequest(null);
    markBoardDirty();
  }

  function removeContextBoardConnection(connectionId: string) {
    if (contextBriefReadOnly) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    setContextBoardConnections((connections) =>
      connections.filter((connection) => connection.id !== connectionId),
    );
    setContextBoardHoveredConnectionId((current) =>
      current === connectionId ? null : current,
    );
    markBoardDirty();
  }

  function duplicateContextBoardConnection(
    event: PointerEvent<HTMLButtonElement>,
    connection: ContextBoardConnection,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (contextBriefReadOnly) {
      return;
    }
    const fromPoint = getContextBoardConnectionPoint(connection.from);
    const toPoint = getContextBoardConnectionPoint(connection.to);

    if (!fromPoint || !toPoint) {
      return;
    }

    commitCurrentContextBoardHistorySnapshot();
    const offset = contextBoardConnectorDuplicateOffset(fromPoint, toPoint);
    const nextConnection: ContextBoardConnection = {
      ...connection,
      from: contextBoardFreeEndpoint(
        {
          x: fromPoint.x + offset.x,
          y: fromPoint.y + offset.y,
        },
        connection.from.side,
      ),
      id: `connector-copy-${Date.now()}-${contextBoardConnections.length}`,
      to: contextBoardFreeEndpoint(
        {
          x: toPoint.x + offset.x,
          y: toPoint.y + offset.y,
        },
        connection.to.side,
      ),
    };

    setContextBoardConnections((connections) => [...connections, nextConnection]);
    setContextBoardHoveredConnectionId(nextConnection.id);
    markBoardDirty();
  }

  function startContextBoardConnection(
    event: PointerEvent<HTMLElement>,
    endpoint: ContextBoardConnectionEndpoint,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (contextBriefReadOnly) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const draft = {
      from: endpoint,
      pointer: clientPointToContextBoardPoint(event.clientX, event.clientY),
      pointerId: event.pointerId,
    };
    setContextBoardTool("connect");
    contextBoardConnectionDraftRef.current = draft;
    setContextBoardConnectionDraft(draft);
  }

  function startContextBoardReconnect(
    event: PointerEvent<SVGCircleElement>,
    connection: ContextBoardConnection,
    side: ContextBoardConnectionSide,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (contextBriefReadOnly) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);

    const fixedEndpoint = side === "from" ? connection.to : connection.from;
    const draft = {
      from: fixedEndpoint,
      pointer: clientPointToContextBoardPoint(event.clientX, event.clientY),
      pointerId: event.pointerId,
      reconnect: {
        connectionId: connection.id,
        originSnapshot: captureContextBoardSnapshot(),
        side,
      },
      pointerSide:
        side === "from" ? connection.from.side : connection.to.side,
      shape: connection.shape,
      startTip: side === "from" ? connection.tip : connection.startTip,
      stroke: connection.stroke,
      tip: side === "from" ? connection.startTip : connection.tip,
      tone: connection.tone,
    };

    setContextBoardTool("connect");
    setContextBoardHoveredConnectionId(connection.id);
    contextBoardConnectionDraftRef.current = draft;
    setContextBoardConnectionDraft(draft);
  }

  function startNearestContextBoardConnection(event: PointerEvent<HTMLElement>) {
    const endpoint = findNearestContextBoardPort(
      clientPointToContextBoardPoint(event.clientX, event.clientY),
    );

    if (!endpoint) {
      return;
    }

    startContextBoardConnection(event, endpoint);
  }

  function moveContextBoardConnection(event: PointerEvent<Element>) {
    if (contextBriefReadOnly) {
      return;
    }

    const draft = contextBoardConnectionDraftRef.current;

    if (!draft || event.pointerId !== draft.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const nextDraft = {
      ...draft,
      pointer: clientPointToContextBoardPoint(event.clientX, event.clientY),
    };
    contextBoardConnectionDraftRef.current = nextDraft;
    setContextBoardConnectionDraft(nextDraft);
  }

  function endContextBoardConnection(event: PointerEvent<Element>) {
    if (contextBriefReadOnly) {
      contextBoardConnectionDraftRef.current = null;
      setContextBoardConnectionDraft(null);
      return;
    }

    const draft = contextBoardConnectionDraftRef.current;

    if (!draft || event.pointerId !== draft.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const target = document.elementFromPoint(event.clientX, event.clientY);
    const targetPort =
      target instanceof Element
        ? target.closest<HTMLElement>("[data-board-port='true']")
        : null;
    const pointer = clientPointToContextBoardPoint(event.clientX, event.clientY);
    const snapEndpoint =
      targetPort
        ? contextBoardEndpointFromPortElement(targetPort)
        : findNearestContextBoardPort(pointer);
    const endpoint =
      snapEndpoint ??
      contextBoardFreeEndpoint(
        pointer,
        draft.pointerSide ?? contextBoardOppositeSide(draft.from.side),
      );

    if (draft.reconnect) {
      const sourceConnection = contextBoardConnections.find(
        (connection) => connection.id === draft.reconnect?.connectionId,
      );
      const fixedEndpoint =
        sourceConnection && draft.reconnect.side === "from"
          ? sourceConnection.to
          : sourceConnection?.from;

      if (
        sourceConnection &&
        fixedEndpoint &&
        endpoint &&
        !contextBoardEndpointsSharePort(fixedEndpoint, endpoint)
      ) {
        const nextConnection =
          draft.reconnect.side === "from"
            ? { ...sourceConnection, from: endpoint }
            : { ...sourceConnection, to: endpoint };
        const duplicateConnectionExists = contextBoardHasConnection(
          contextBoardConnections.filter(
            (connection) => connection.id !== sourceConnection.id,
          ),
          nextConnection,
        );
        const connectionChanged =
          !contextBoardEndpointEqual(sourceConnection.from, nextConnection.from) ||
          !contextBoardEndpointEqual(sourceConnection.to, nextConnection.to);

        if (!duplicateConnectionExists && connectionChanged) {
          commitContextBoardHistorySnapshot(draft.reconnect.originSnapshot);
          setContextBoardConnections((connections) =>
            connections.map((connection) =>
              connection.id === sourceConnection.id ? nextConnection : connection,
            ),
          );
          markBoardDirty();
        }
      }

      contextBoardConnectionDraftRef.current = null;
      setContextBoardConnectionDraft(null);
      return;
    }

    if (
      endpoint &&
      !contextBoardEndpointsSharePort(draft.from, endpoint)
    ) {
      const connection: ContextBoardConnection = {
        from: draft.from,
        id: `connector-${Date.now()}`,
        shape: contextBoardConnectorShape,
        startTip: contextBoardConnectorStartTip,
        stroke: contextBoardConnectorStroke,
        to: endpoint,
        tone: contextBoardConnectorTone,
        tip: contextBoardConnectorTip,
      };
      const duplicateConnection = contextBoardHasConnection(
        contextBoardConnections,
        connection,
      );

      if (!duplicateConnection) {
        commitCurrentContextBoardHistorySnapshot();
        const fromPoint = getContextBoardConnectionPoint(connection.from);
        const toPoint = getContextBoardConnectionPoint(connection.to);
        const connectorLabelItem =
          connection.label && fromPoint && toPoint
            ? contextBoardConnectorLabelItem({
                diagramType: contextBoardDiagramType,
                from: fromPoint,
                fromSide: connection.from.side,
                id: `connector-label-${Date.now()}-${contextBoardCustomItems.length}`,
                label: connection.label,
                shape: connection.shape,
                to: toPoint,
                tone: connection.tone ?? contextBoardConnectorTone,
                toSide: connection.to.side,
              })
            : null;

        if (connectorLabelItem) {
          setContextBoardCustomItems((items) => [...items, connectorLabelItem]);
        }
        setContextBoardConnections((connections) =>
          contextBoardHasConnection(connections, connection)
            ? connections
            : [...connections, connection],
        );
        markBoardDirty();
      }
    }

    contextBoardConnectionDraftRef.current = null;
    setContextBoardConnectionDraft(null);
  }

  function cancelContextBoardConnection(event: PointerEvent<Element>) {
    const draft = contextBoardConnectionDraftRef.current;

    if (!draft || event.pointerId !== draft.pointerId) {
      return;
    }

    contextBoardConnectionDraftRef.current = null;
    setContextBoardConnectionDraft(null);
  }

  function clientPointToContextBoardPoint(clientX: number, clientY: number) {
    const canvas = contextBoardCanvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: (canvas.scrollLeft + clientX - rect.left) / contextBoardZoom,
      y: (canvas.scrollTop + clientY - rect.top) / contextBoardZoom,
    };
  }

  function findNearestContextBoardPort(point: ContextBoardPosition) {
    const endpoints: ContextBoardConnectionEndpoint[] = [
      ...contextBoardCoreNodes.flatMap((node) =>
        (["top", "right", "bottom", "left"] as ContextBoardPortSide[]).map(
          (side) => ({
            itemId: node.id,
            itemType: "core" as const,
            side,
          }),
        ),
      ),
      ...contextBoardCustomItems
        .filter((item) => contextBoardCustomKindHasPorts(item.kind))
        .flatMap((item) =>
          (["top", "right", "bottom", "left"] as ContextBoardPortSide[]).map(
            (side) => ({
              itemId: item.id,
              itemType: "custom" as const,
              side,
            }),
          ),
      ),
    ];
    const nearest = endpoints.reduce<{
      distance: number;
      endpoint: ContextBoardConnectionEndpoint | null;
    }>(
      (current, endpoint) => {
        const portPoint = getContextBoardConnectionPoint(endpoint);
        if (!portPoint) {
          return current;
        }

        const distance = Math.hypot(portPoint.x - point.x, portPoint.y - point.y);
        return distance < current.distance ? { distance, endpoint } : current;
      },
      { distance: Number.POSITIVE_INFINITY, endpoint: null },
    );

    return nearest.distance <= 46 ? nearest.endpoint : null;
  }

  function setContextBoardZoomClamped(value: number) {
    const canvas = contextBoardCanvasRef.current;

    if (!canvas) {
      setContextBoardZoom(clampContextBoardZoom(value));
      return;
    }

    updateContextBoardZoomFromCanvasCenter(canvas, value);
  }

  function updateContextBoardZoomFromCanvasCenter(
    canvas: HTMLDivElement,
    nextZoom: number,
  ) {
    const clampedZoom = clampContextBoardZoom(nextZoom);

    if (clampedZoom === contextBoardZoom) {
      return;
    }

    const offsetX = canvas.clientWidth / 2;
    const offsetY = canvas.clientHeight / 2;
    const boardX = (canvas.scrollLeft + offsetX) / contextBoardZoom;
    const boardY = (canvas.scrollTop + offsetY) / contextBoardZoom;

    contextBoardZoomAnchorRef.current = {
      boardX,
      boardY,
      offsetX,
      offsetY,
    };
    setContextBoardZoom(clampedZoom);
  }

  function startContextBoardPan(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      contextBoardDrag ||
      contextBoardResize ||
      contextBoardSelectionBox
    ) {
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('[data-board-object="true"], [data-board-control="true"], [data-board-template="true"], button, input, textarea')
    ) {
      return;
    }

    blurContextBoardEditor();

    if (contextBriefReadOnly) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setContextBoardPan({
        pointerId: event.pointerId,
        scrollLeft: event.currentTarget.scrollLeft,
        scrollTop: event.currentTarget.scrollTop,
        startX: event.clientX,
        startY: event.clientY,
      });
      return;
    }

    if (contextBoardTool === "sketch") {
      startContextBoardSketch(event);
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (contextBoardTool === "select") {
      const point = clientPointToContextBoardPoint(event.clientX, event.clientY);
      setContextBoardStyleTarget(null);
      setContextBoardSelectedItems([]);
      setContextBoardSelectionBox({
        current: point,
        pointerId: event.pointerId,
        start: point,
      });
      return;
    }

    setContextBoardStyleTarget(null);
    setContextBoardSelectedItems([]);
    setContextBoardPan({
      pointerId: event.pointerId,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
      startX: event.clientX,
      startY: event.clientY,
    });
  }

  function moveContextBoardPan(event: PointerEvent<HTMLDivElement>) {
    if (moveContextBoardSketch(event)) {
      return;
    }

    if (
      contextBoardSelectionBox &&
      event.pointerId === contextBoardSelectionBox.pointerId
    ) {
      event.preventDefault();
      setContextBoardSelectionBox({
        ...contextBoardSelectionBox,
        current: clientPointToContextBoardPoint(event.clientX, event.clientY),
      });
      return;
    }

    if (!contextBoardPan || event.pointerId !== contextBoardPan.pointerId) {
      return;
    }

    event.preventDefault();
    event.currentTarget.scrollLeft =
      contextBoardPan.scrollLeft - (event.clientX - contextBoardPan.startX);
    event.currentTarget.scrollTop =
      contextBoardPan.scrollTop - (event.clientY - contextBoardPan.startY);
  }

  function endContextBoardPan(event: PointerEvent<HTMLDivElement>) {
    if (endContextBoardSketch(event)) {
      return;
    }

    if (
      contextBoardSelectionBox &&
      event.pointerId === contextBoardSelectionBox.pointerId
    ) {
      event.preventDefault();
      const selectedItems = getContextBoardItemsInSelectionBox(
        contextBoardSelectionBox,
      );
      setContextBoardSelectedItems(selectedItems);
      setContextBoardStyleTarget(
        selectedItems.length === 1 &&
          (selectedItems[0].itemType === "custom" ||
            selectedItems[0].itemType === "template")
          ? {
              id: selectedItems[0].id,
              itemType: selectedItems[0].itemType,
            }
          : null,
      );
      setContextBoardSelectionBox(null);
      return;
    }

    if (!contextBoardPan || event.pointerId !== contextBoardPan.pointerId) {
      return;
    }

    setContextBoardPan(null);
  }

  function getContextBoardItemsInSelectionBox(
    selectionBox: ContextBoardSelectionBox,
  ): ContextBoardSelectionItem[] {
    const selectionRect = contextBoardSelectionRect(selectionBox);
    const surfaces: Array<
      ContextBoardSelectionItem & ContextBoardPosition & {
        height: number;
        width: number;
      }
    > = [
      ...contextBoardCoreNodes.map((node) => {
        const position = contextBoardPositions[node.id];
        return {
          height: CONTEXT_BOARD_CORE_CARD_HEIGHT,
          id: node.id,
          itemType: "core" as const,
          width: CONTEXT_BOARD_CORE_CARD_WIDTH,
          x: position.x,
          y: position.y,
        };
      }),
      ...contextBoardTemplateTrays.map((tray) => ({
        height: tray.height,
        id: tray.id,
        itemType: "template" as const,
        width: tray.width,
        x: tray.x,
        y: tray.y,
      })),
      ...contextBoardCustomItems.map((item) => {
        const size = contextBoardCustomItemResolvedSize(item);
        return {
          height: size.height,
          id: item.id,
          itemType: "custom" as const,
          width: size.width,
          x: item.x,
          y: item.y,
        };
      }),
    ];

    return surfaces
      .filter((surface) => contextBoardRectsIntersect(selectionRect, surface))
      .map(({ id, itemType }) => ({ id, itemType }));
  }

  function startContextBoardTemplateResize(
    event: PointerEvent<HTMLButtonElement>,
    tray: ContextBoardTemplateTray,
  ) {
    if (contextBriefReadOnly) {
      return;
    }

    if (contextBoardTool !== "move") {
      return;
    }

    blurContextBoardEditor();
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setContextBoardStyleTarget({ id: tray.id, itemType: "template" });
    setContextBoardResize({
      id: tray.id,
      itemType: "template",
      originHeight: tray.height,
      originSnapshot: captureContextBoardSnapshot(),
      originWidth: tray.width,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    });
  }

  function startContextBoardCustomResize(
    event: PointerEvent<HTMLButtonElement>,
    item: ContextBoardCustomItem,
  ) {
    if (contextBriefReadOnly) {
      return;
    }

    if (contextBoardTool !== "move") {
      return;
    }

    const size = contextBoardCustomItemResolvedSize(item);
    blurContextBoardEditor();
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setContextBoardStyleTarget({ id: item.id, itemType: "custom" });
    setContextBoardResize({
      id: item.id,
      itemType: "custom",
      originHeight: size.height,
      originSnapshot: captureContextBoardSnapshot(),
      originWidth: size.width,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    });
  }

  function blurContextBoardEditor() {
    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      activeElement.blur();
    }
  }

  function moveContextBoardTemplateResize(event: PointerEvent<HTMLButtonElement>) {
    if (!contextBoardResize || event.pointerId !== contextBoardResize.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const deltaX = (event.clientX - contextBoardResize.startX) / contextBoardZoom;
    const deltaY = (event.clientY - contextBoardResize.startY) / contextBoardZoom;

    if (contextBoardResize.itemType === "template") {
      setContextBoardTemplateTrays((trays) =>
        trays.map((tray) => {
          if (tray.id !== contextBoardResize.id) {
            return tray;
          }

          return {
            ...tray,
            height: Math.max(
              180,
              Math.min(
                CONTEXT_BOARD_HEIGHT - tray.y - 16,
                contextBoardResize.originHeight + deltaY,
              ),
            ),
            width: Math.max(
              260,
              Math.min(
                CONTEXT_BOARD_WIDTH - tray.x - 16,
                contextBoardResize.originWidth + deltaX,
              ),
            ),
          };
        }),
      );
      return;
    }

    setContextBoardCustomItems((items) =>
      items.map((item) => {
        if (item.id !== contextBoardResize.id) {
          return item;
        }

        const minimumSize = contextBoardCustomItemMinimumSize(
          item.kind,
          item.diagramType,
        );

        return {
          ...item,
          height: Math.max(
            minimumSize.height,
            Math.min(
              CONTEXT_BOARD_HEIGHT - item.y - 16,
              contextBoardResize.originHeight + deltaY,
            ),
          ),
          width: Math.max(
            minimumSize.width,
            Math.min(
              CONTEXT_BOARD_WIDTH - item.x - 16,
              contextBoardResize.originWidth + deltaX,
            ),
          ),
        };
      }),
    );
  }

  function endContextBoardTemplateResize(event: PointerEvent<HTMLButtonElement>) {
    if (!contextBoardResize || event.pointerId !== contextBoardResize.pointerId) {
      return;
    }

    if (
      !contextBoardSnapshotsEqual(
        contextBoardResize.originSnapshot,
        captureContextBoardSnapshot(),
      )
    ) {
      commitContextBoardHistorySnapshot(contextBoardResize.originSnapshot);
    }
    setContextBoardResize(null);
    markBoardDirty();
  }

  function startContextBoardDrag(
    event: PointerEvent<HTMLElement>,
    itemType: ContextBoardDragState["itemType"],
    id: string,
    position: ContextBoardPosition,
  ) {
    if (contextBriefReadOnly) {
      return;
    }

    if (contextBoardTool !== "move" && contextBoardTool !== "select") {
      return;
    }

    const selectedItem = { id, itemType };
    const selectedKey = contextBoardSelectionKey(selectedItem);
    const itemAlreadySelected = contextBoardSelectedKeys.has(selectedKey);

    if (contextBoardTool === "select" && event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      setContextBoardSelectedItems((items) =>
        contextBoardToggleSelection(items, selectedItem),
      );
      setContextBoardStyleTarget(
        itemType === "custom" || itemType === "template"
          ? { id, itemType }
          : null,
      );
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const draggingSelection =
      itemAlreadySelected && contextBoardSelectedItems.length > 1;
    const nextSelectedItems = draggingSelection
      ? contextBoardSelectedItems
      : [selectedItem];
    const selectedMemberOrigins = draggingSelection
      ? getContextBoardSelectionOrigins(contextBoardSelectedItems)
      : undefined;
    setContextBoardSelectedItems(nextSelectedItems);
    setContextBoardStyleTarget(
      itemType === "custom" || itemType === "template"
        ? { id, itemType }
        : null,
    );
    const memberOrigins =
      selectedMemberOrigins ??
      (itemType === "template"
        ? Object.fromEntries(
            contextBoardCustomItems
              .filter((item) =>
                contextBoardTemplateTrays
                  .find((tray) => tray.id === id)
                  ?.itemIds.includes(item.id),
              )
              .map((item) => [
                contextBoardSelectionKey({ id: item.id, itemType: "custom" }),
                { x: item.x, y: item.y },
              ]),
          )
        : undefined);

    setContextBoardDrag({
      id,
      itemType,
      memberOrigins,
      originX: position.x,
      originY: position.y,
      originSnapshot: captureContextBoardSnapshot(),
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    });
  }

  function getContextBoardSelectionOrigins(
    selectedItems: ContextBoardSelectionItem[],
  ) {
    const origins: Record<string, ContextBoardPosition> = {};

    for (const selectedItem of selectedItems) {
      if (selectedItem.itemType === "core") {
        const position = contextBoardPositions[selectedItem.id];
        if (position) {
          origins[contextBoardSelectionKey(selectedItem)] = position;
        }
        continue;
      }

      if (selectedItem.itemType === "template") {
        const tray = contextBoardTemplateTrays.find(
          (templateTray) => templateTray.id === selectedItem.id,
        );
        if (tray) {
          origins[contextBoardSelectionKey(selectedItem)] = {
            x: tray.x,
            y: tray.y,
          };
        }
        continue;
      }

      const item = contextBoardCustomItems.find(
        (customItem) => customItem.id === selectedItem.id,
      );
      if (item) {
        origins[contextBoardSelectionKey(selectedItem)] = {
          x: item.x,
          y: item.y,
        };
      }
    }

    return origins;
  }

  function moveContextBoardDrag(event: PointerEvent<HTMLElement>) {
    if (!contextBoardDrag || event.pointerId !== contextBoardDrag.pointerId) {
      return;
    }

    const dragDeltaX = (event.clientX - contextBoardDrag.startX) / contextBoardZoom;
    const dragDeltaY = (event.clientY - contextBoardDrag.startY) / contextBoardZoom;
    const dragSelectionKey = contextBoardSelectionKey({
      id: contextBoardDrag.id,
      itemType: contextBoardDrag.itemType,
    });
    const memberOrigins: Record<string, ContextBoardPosition> =
      contextBoardDrag.memberOrigins ?? {};
    const groupOrigin = memberOrigins[dragSelectionKey];

    if (groupOrigin) {
      setContextBoardPositions((positions) => {
        const nextPositions = { ...positions };

        for (const [key, origin] of Object.entries(memberOrigins)) {
          const selectedItem = contextBoardSelectionFromKey(key);
          if (selectedItem?.itemType === "core") {
            nextPositions[selectedItem.id] = {
              x: origin.x + dragDeltaX,
              y: origin.y + dragDeltaY,
            };
          }
        }

        return nextPositions;
      });
      setContextBoardTemplateTrays((trays) =>
        trays.map((tray) => {
          const origin =
            contextBoardDrag.memberOrigins?.[
              contextBoardSelectionKey({ id: tray.id, itemType: "template" })
            ];

          return origin
            ? { ...tray, x: origin.x + dragDeltaX, y: origin.y + dragDeltaY }
            : tray;
        }),
      );
      setContextBoardCustomItems((items) =>
        items.map((item) => {
          const origin =
            contextBoardDrag.memberOrigins?.[
              contextBoardSelectionKey({ id: item.id, itemType: "custom" })
            ];

          return origin
            ? { ...item, x: origin.x + dragDeltaX, y: origin.y + dragDeltaY }
            : item;
        }),
      );
      return;
    }

    const customDragItem =
      contextBoardDrag.itemType === "custom"
        ? contextBoardCustomItems.find((item) => item.id === contextBoardDrag.id)
        : null;
    const templateDragItem =
      contextBoardDrag.itemType === "template"
        ? contextBoardTemplateTrays.find((tray) => tray.id === contextBoardDrag.id)
        : null;
    const customDragSize = customDragItem
      ? contextBoardCustomItemResolvedSize(customDragItem)
      : null;
    const itemWidth =
      contextBoardDrag.itemType === "core"
        ? CONTEXT_BOARD_CORE_CARD_WIDTH + 40
        : contextBoardDrag.itemType === "template"
          ? (templateDragItem?.width ?? 420)
          : (customDragSize?.width ?? CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH) + 16;
    const itemHeight =
      contextBoardDrag.itemType === "core"
        ? CONTEXT_BOARD_CORE_CARD_HEIGHT + 34
        : contextBoardDrag.itemType === "template"
          ? (templateDragItem?.height ?? 260)
          : (customDragSize?.height ?? CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT) + 8;
    const nextPosition = {
      x: Math.max(
        16,
        Math.min(
          CONTEXT_BOARD_WIDTH - itemWidth,
          contextBoardDrag.originX + dragDeltaX,
        ),
      ),
      y: Math.max(
        16,
        Math.min(
          CONTEXT_BOARD_HEIGHT - itemHeight,
          contextBoardDrag.originY + dragDeltaY,
        ),
      ),
    };

    if (contextBoardDrag.itemType === "core") {
      setContextBoardPositions((positions) => ({
        ...positions,
        [contextBoardDrag.id]: nextPosition,
      }));
      return;
    }

    if (contextBoardDrag.itemType === "template") {
      const templateDeltaX = nextPosition.x - contextBoardDrag.originX;
      const templateDeltaY = nextPosition.y - contextBoardDrag.originY;

      setContextBoardTemplateTrays((trays) =>
        trays.map((tray) =>
          tray.id === contextBoardDrag.id ? { ...tray, ...nextPosition } : tray,
        ),
      );
      setContextBoardCustomItems((items) =>
        items.map((item) => {
          const origin =
            contextBoardDrag.memberOrigins?.[
              contextBoardSelectionKey({ id: item.id, itemType: "custom" })
            ];

          if (!origin) {
            return item;
          }

          return {
            ...item,
            x: origin.x + templateDeltaX,
            y: origin.y + templateDeltaY,
          };
        }),
      );
      return;
    }

    setContextBoardCustomItems((items) =>
      items.map((item) =>
        item.id === contextBoardDrag.id ? { ...item, ...nextPosition } : item,
      ),
    );
  }

  function endContextBoardDrag(event: PointerEvent<HTMLElement>) {
    if (!contextBoardDrag || event.pointerId !== contextBoardDrag.pointerId) {
      return;
    }

    if (
      !contextBoardSnapshotsEqual(
        contextBoardDrag.originSnapshot,
        captureContextBoardSnapshot(),
      )
    ) {
      commitContextBoardHistorySnapshot(contextBoardDrag.originSnapshot);
    }
    setContextBoardDrag(null);
    markBoardDragCommitted();
  }

  return {
    contextBoardActiveToolDrawer,
    setContextBoardActiveToolDrawer,
    contextBoardCanvasRef,
    contextBoardCanAlignSelection,
    contextBoardCanDistributeSelection,
    contextBoardCanLayerSelection,
    contextBoardCenterRequest,
    setContextBoardCenterRequest,
    contextBoardComponentKinds,
    contextBoardConnectionDraft,
    setContextBoardConnectionDraft,
    contextBoardConnections,
    setContextBoardConnections,
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
    setContextBoardCustomItems,
    contextBoardDiagramLabelPresets,
    contextBoardDiagramType,
    setContextBoardDiagramType,
    contextBoardDrag,
    contextBoardFloatingSourcesStyle,
    contextBoardHasContent,
    contextBoardHoveredConnectionId,
    setContextBoardHoveredConnectionId,
    contextBoardInputsCollapsed,
    setContextBoardInputsCollapsed,
    contextBoardPan,
    contextBoardPositions,
    setContextBoardPositions,
    contextBoardRedoStack,
    setContextBoardRedoStack,
    contextBoardRemovedCoreIds,
    setContextBoardRemovedCoreIds,
    contextBoardResetGuardOpen,
    setContextBoardResetGuardOpen,
    contextBoardResize,
    contextBoardSelectedItems,
    setContextBoardSelectedItems,
    contextBoardSelectedKeys,
    contextBoardSelectionBox,
    contextBoardSketchDraft,
    contextBoardSketchStrokes,
    setContextBoardSketchStrokes,
    contextBoardSketchTone,
    setContextBoardSketchTone,
    contextBoardSketchTool,
    setContextBoardSketchTool,
    contextBoardStyle,
    setContextBoardStyle,
    contextBoardStyleTarget,
    setContextBoardStyleTarget,
    contextBoardTemplateTrayDeleteRequest,
    setContextBoardTemplateTrayDeleteRequest,
    contextBoardTemplateTrays,
    setContextBoardTemplateTrays,
    contextBoardTool,
    setContextBoardTool,
    contextBoardToolSectionCollapsed,
    contextBoardToolSectionSummary,
    contextBoardToolsCollapsed,
    setContextBoardToolsCollapsed,
    contextBoardUndoStack,
    setContextBoardUndoStack,
    setContextBoardViewportTick,
    contextBoardVisibleConnections,
    contextBoardZoom,
    setContextBoardZoom,
    contextBriefReadOnly,
    contextBriefFingerprint,
    contextBriefLocked,
    contextBriefMetadataReady,
    contextBriefReady,
    contextBriefSaved,
    contextBriefSnapshotReady,
    canRedoContextBoard,
    canUndoContextBoard,
    addContextBoardDiagramLabel,
    addContextBoardItem,
    addContextBoardStarter,
    addContextBoardTray,
    alignContextBoardSelection,
    cancelContextBoardConnection,
    captureContextBoardSnapshot,
    centerContextBoardViewportAt,
    clearContextBoardSelection,
    commitContextBoardHistorySnapshot,
    commitCurrentContextBoardHistorySnapshot,
    confirmRemoveContextBoardTemplateTray,
    confirmResetContextBoardLayout,
    distributeContextBoardSelection,
    duplicateContextBoardConnection,
    duplicateContextBoardCustomItem,
    duplicateSelectedContextBoardItems,
    endContextBoardConnection,
    endContextBoardDrag,
    endContextBoardNavigatorPan,
    endContextBoardPan,
    endContextBoardTemplateResize,
    fitContextBoardContent,
    focusContextBoardBounds,
    focusContextBoardItems,
    focusSelectedContextBoardItems,
    getContextBoardAllSurfaceBoxes,
    getContextBoardConnectionPoint,
    getContextBoardItemBox,
    getContextBoardSelectedSurfaceBoxes,
    getContextBoardSurfaceBox,
    getContextBoardViewportSurface,
    layerContextBoardSelection,
    moveContextBoardConnection,
    moveContextBoardDrag,
    moveContextBoardNavigatorPan,
    moveContextBoardPan,
    moveContextBoardTemplateResize,
    nudgeContextBoardSelection,
    openContextBoardToolDrawer,
    redoContextBoardAction,
    removeContextBoardConnection,
    removeContextBoardItem,
    removeSelectedContextBoardItems,
    requestRemoveContextBoardTemplateTray,
    requestResetContextBoardLayout,
    restoreContextBoardSnapshot,
    selectAllContextBoardItems,
    setContextBoardPrimaryTool,
    setContextBoardZoomClamped,
    startContextBoardConnection,
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
  };
}

export type ContextBoardController = ReturnType<typeof useContextBoardController>;
