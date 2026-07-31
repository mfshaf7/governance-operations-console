"use client";

import { Fragment } from "react";
import type { CSSProperties, Ref } from "react";

import styles from "./context-board-workbench.module.css";
import {
  CONTEXT_BOARD_HEIGHT,
  CONTEXT_BOARD_WIDTH,
  contextBoardConnectorPath,
} from "./context-board-core";
import {
  contextBoardConnectionTone,
  contextBoardConnectorMarkerId,
  contextBoardConnectorMarkerStyle,
  contextBoardConnectorPathStyle,
  contextBoardCustomDetailRows,
  contextBoardCustomItemResolvedSize,
  contextBoardCustomKindCopy,
  contextBoardCustomKindHasDetail,
  contextBoardCustomKindHasKicker,
  contextBoardSketchPath,
  contextBoardDiagramCopy,
} from "./context-board-template-helpers";
import type {
  ContextBoardConnectorTone,
  ContextBoardCoreNode,
  ContextBoardSnapshot,
} from "./context-board-model";
import {
  contextBoardSnapshotConnectionPoint,
} from "./context-board-rendering";

export type ContextBoardSnapshotCaptureSurfaceProps = {
  capturePlaneRef: Ref<HTMLDivElement>;
  coreNodes: ContextBoardCoreNode[];
  snapshot: ContextBoardSnapshot;
};

const contextBoardConnectorToneOptions: Array<
  { label: string; title: string; tone: ContextBoardConnectorTone }
> = [
  {
    label: "Amber",
    title: "Use amber connector color",
    tone: "amber",
  },
  {
    label: "Blue",
    title: "Use blue connector color",
    tone: "blue",
  },
  {
    label: "Green",
    title: "Use green connector color",
    tone: "green",
  },
  {
    label: "Red",
    title: "Use red connector color",
    tone: "red",
  },
  {
    label: "Purple",
    title: "Use purple connector color",
    tone: "purple",
  },
  {
    label: "Neutral",
    title: "Use neutral connector color",
    tone: "neutral",
  },
];

export function ContextBoardSnapshotCaptureSurface({
  capturePlaneRef,
  coreNodes,
  snapshot,
}: ContextBoardSnapshotCaptureSurfaceProps) {
  const visibleCoreNodes = coreNodes.filter(
    (node) =>
      !snapshot.removedCoreIds.includes(node.id) &&
      Boolean(snapshot.positions[node.id]),
  );
  const visibleConnections = snapshot.connections.filter(
    (connection) =>
      contextBoardSnapshotConnectionPoint(connection.from, snapshot) &&
      contextBoardSnapshotConnectionPoint(connection.to, snapshot),
  );

  return (
    <div aria-hidden="true" className={styles.contextBoardSnapshotCaptureHost}>
      <div
        className={styles.contextBoardStage}
        data-read-only="true"
        data-style={snapshot.style}
      >
        <div
          className={styles.contextBoardPlaneSizer}
          style={
            {
              "--board-height": `${CONTEXT_BOARD_HEIGHT}px`,
              "--board-scaled-height": `${CONTEXT_BOARD_HEIGHT}px`,
              "--board-scaled-width": `${CONTEXT_BOARD_WIDTH}px`,
              "--board-width": `${CONTEXT_BOARD_WIDTH}px`,
              "--board-zoom": 1,
            } as CSSProperties
          }
        >
          <div
            className={styles.contextBoardPlane}
            data-tool="move"
            ref={capturePlaneRef}
          >
            <svg
              aria-label="Finalized board screenshot connectors"
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
                      id={contextBoardConnectorMarkerId(
                        option.tone,
                        "filled-diamond",
                      )}
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
              {snapshot.sketchStrokes.map((stroke) => (
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
              ))}
              {visibleConnections.map((connection) => {
                const from = contextBoardSnapshotConnectionPoint(
                  connection.from,
                  snapshot,
                );
                const to = contextBoardSnapshotConnectionPoint(
                  connection.to,
                  snapshot,
                );

                if (!from || !to) {
                  return null;
                }

                const connectorTone = contextBoardConnectionTone(connection.tone);

                return (
                  <path
                    className={styles.contextBoardConnectorPath}
                    d={contextBoardConnectorPath(
                      from,
                      to,
                      connection.from.side,
                      connection.to.side,
                      connection.shape,
                    )}
                    data-shape={connection.shape}
                    data-stroke={connection.stroke ?? "solid"}
                    data-tone={connectorTone}
                    data-tip={connection.tip}
                    key={connection.id}
                    markerEnd={
                      connection.tip !== "plain"
                        ? `url(#${contextBoardConnectorMarkerId(
                            connectorTone,
                            connection.tip,
                          )})`
                        : undefined
                    }
                    markerStart={
                      connection.startTip && connection.startTip !== "plain"
                        ? `url(#${contextBoardConnectorMarkerId(
                            connectorTone,
                            connection.startTip,
                          )})`
                        : undefined
                    }
                    style={contextBoardConnectorPathStyle(
                      connectorTone,
                      connection.shape,
                      connection.stroke,
                    )}
                  />
                );
              })}
            </svg>

            {snapshot.templateTrays.map((tray) => (
              <div
                className={styles.contextBoardTemplateTray}
                data-board-object="true"
                data-board-template="true"
                data-diagram-type={tray.diagramType}
                data-manual={tray.manual ? "true" : "false"}
                data-selected="false"
                data-tone={tray.tone ?? "default"}
                key={tray.id}
                role="presentation"
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
              </div>
            ))}

            {visibleCoreNodes.map((node) => {
              const position = snapshot.positions[node.id];

              return (
                <article
                  className={styles.contextBoardNode}
                  data-board-object="true"
                  data-selected="false"
                  data-tone={node.tone}
                  key={node.id}
                  role="presentation"
                  style={
                    {
                      "--board-x": `${position.x}px`,
                      "--board-y": `${position.y}px`,
                    } as CSSProperties
                  }
                >
                  <span>{node.kicker}</span>
                  <strong>{node.label}</strong>
                  <small>{node.detail}</small>
                </article>
              );
            })}

            {snapshot.customItems.map((item) => {
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
                  className={styles.contextBoardCustomItem}
                  data-board-object="true"
                  data-diagram-type={item.diagramType ?? "custom"}
                  data-kind={item.kind}
                  data-selected="false"
                  data-tone={item.tone ?? "default"}
                  key={item.id}
                  role="presentation"
                  style={
                    {
                      "--board-x": `${item.x}px`,
                      "--board-y": `${item.y}px`,
                      height: `${itemSize.height}px`,
                      minHeight: `${itemSize.height}px`,
                      width: `${itemSize.width}px`,
                    } as CSSProperties
                  }
                >
                  {showKicker ? (
                    <span>{contextBoardCustomKindCopy(item.kind).kicker}</span>
                  ) : null}
                  <input
                    aria-label={`${item.label} title`}
                    className={styles.contextBoardCardTitleInput}
                    readOnly
                    value={item.label}
                  />
                  {showDetail ? (
                    <textarea
                      aria-label={`${item.label} detail`}
                      className={styles.contextBoardCardDetailInput}
                      readOnly
                      rows={contextBoardCustomDetailRows(item)}
                      value={item.detail}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
