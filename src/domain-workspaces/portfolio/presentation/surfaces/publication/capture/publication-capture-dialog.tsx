"use client";

import {
  TerasActionButton,
  TerasContentTray,
  TerasEmptyState,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectableRow,
  TerasSignalItem,
  TerasStatusPill,
  TerasTrayStack,
} from "@/teras";

import type { ProductPortfolioScenarioProjection } from "../../../../read-model/types/product-portfolio-fixture-types.ts";
import {
  productPublicationCaptureSourceDescription,
  productPublicationCaptureSourceFacts,
  productPublicationCaptureSourceName,
} from "./publication-capture-view-model.ts";

export function ProductPublicationCaptureDialog({
  applying,
  error,
  onClose,
  onSelectSource,
  onSubmit,
  open,
  selectedSourceId,
  sources,
}: {
  applying: boolean;
  error: string | null;
  onClose: () => void;
  onSelectSource: (sourceId: string) => void;
  onSubmit: () => void;
  open: boolean;
  selectedSourceId: string | null;
  sources: ProductPortfolioScenarioProjection[];
}) {
  if (!open) {
    return null;
  }

  const selectedSource =
    sources.find((source) => source.scenarioId === selectedSourceId) ??
    sources[0] ??
    null;

  return (
    <TerasModalShell
      bodyLayout="scroll"
      description="Select one product-owner packet and place it in the Publication register."
      footer={
        <>
          <TerasActionButton
            disabled={applying}
            emphasis="secondary"
            onClick={onClose}
          >
            Back to Publication
          </TerasActionButton>
          <TerasActionButton
            disabled={applying || selectedSource === null}
            onClick={onSubmit}
          >
            {applying ? "Capturing..." : "Capture Candidate"}
          </TerasActionButton>
        </>
      }
      height="content"
      kicker="Publication Ingress"
      onClose={onClose}
      surfaceId="product-publication-capture"
      title="Capture Product Publication"
      width="standard"
    >
      <TerasPanel
        fit="content"
        frame="padded"
        spacing="normal"
        treatment="neutral"
      >
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={sources.length > 0 ? "info" : "muted"}>
              {sources.length} available
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Only active Workspace products with a structured owner packet can enter this capture path."
          kicker="Publication Packets"
          title="Choose a product"
        />

        <TerasTrayStack spacing="normal">
          {sources.length > 0 ? (
            <TerasList
              ariaLabel="Available Product Portfolio publication sources"
              frame="contained"
              scrollHeight="short"
            >
              {sources.map((source) => {
                const selected = source.scenarioId === selectedSource?.scenarioId;

                return (
                  <TerasSelectableRow
                    ariaLabel={`Select ${productPublicationCaptureSourceName(source)}`}
                    detail={productPublicationCaptureSourceDescription(source)}
                    key={source.scenarioId}
                    label={productPublicationCaptureSourceName(source)}
                    onSelect={() => onSelectSource(source.scenarioId)}
                    selected={selected}
                    status={
                      <TerasStatusPill size="compact" tone="ok">
                        Available
                      </TerasStatusPill>
                    }
                    tone={selected ? "info" : "muted"}
                  />
                );
              })}
            </TerasList>
          ) : (
            <TerasEmptyState>
              No uncaptured publication source is currently available.
            </TerasEmptyState>
          )}

          {selectedSource ? (
            <TerasContentTray
              description="These source facts are retained with the captured candidate."
              kicker="Selected Source"
              title={productPublicationCaptureSourceName(selectedSource)}
            >
              <TerasMetadataList
                columns={2}
                items={productPublicationCaptureSourceFacts(selectedSource)}
                shape="grid"
              />
            </TerasContentTray>
          ) : null}

          {error ? (
            <TerasList frame="contained">
              <TerasSignalItem
                detail={error}
                label="Capture Command"
                title="Capture failed"
                tone="danger"
              />
            </TerasList>
          ) : null}
        </TerasTrayStack>
      </TerasPanel>
    </TerasModalShell>
  );
}
