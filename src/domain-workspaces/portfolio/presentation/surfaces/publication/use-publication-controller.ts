"use client";

import { useEffect, useState } from "react";

import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type { ProductPortfolioScenarioProjection } from "../../../read-model/types/product-portfolio-fixture-types.ts";
import type { ProductPublicationDecisionReceipt } from "../../../work-model/publication/product-publication-decision-types.ts";
import {
  productPublicationAvailableSources,
  type ProductPublicationCaptureSubmitHandler,
} from "./capture/publication-capture-view-model.ts";
import {
  productPublicationRecordIsOpen,
  productPublicationRecordCanOpenProduct,
  productPublicationRecordsForRegister,
  type ProductPublicationRegisterViewId,
} from "./publication-view-model.ts";

export function useProductPortfolioPublicationController({
  publicationSources,
  capturedByRef,
  decisionReceipts,
  focusProductId,
  onCapturePublication,
  onOpenProduct,
  records,
}: {
  publicationSources: ProductPortfolioScenarioProjection[];
  capturedByRef: string;
  decisionReceipts: ProductPublicationDecisionReceipt[];
  focusProductId: string | null;
  onCapturePublication: ProductPublicationCaptureSubmitHandler;
  onOpenProduct: (entry: ProductPortfolioEntry) => void;
  records: ProductPortfolioScenarioProjection[];
}) {
  const [activeSessionRecord, setActiveSessionRecord] =
    useState<ProductPortfolioScenarioProjection | null>(null);
  const [captureApplying, setCaptureApplying] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureSourceId, setCaptureSourceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [viewId, setViewId] = useState<ProductPublicationRegisterViewId>("open");
  const availablePublicationSources = productPublicationAvailableSources(
    publicationSources,
    records,
  );
  const visibleRecords = productPublicationRecordsForRegister(
    records,
    viewId,
    query,
  );
  const selectedRecord =
    visibleRecords.find((record) => record.scenarioId === selectedScenarioId) ??
    visibleRecords[0] ??
    null;
  const sessionReceipt = activeSessionRecord
    ? (decisionReceipts.find(
        (receipt) =>
          receipt.packetId === activeSessionRecord.publicationPacket.packetId,
      ) ?? null)
    : null;

  useEffect(() => {
    if (!focusProductId) {
      return;
    }

    const focusedRecord = records.find(
      (record) => record.publicationPacket.product.productId === focusProductId,
    );
    if (!focusedRecord) {
      return;
    }

    setQuery("");
    setViewId(
      productPublicationRecordIsOpen(focusedRecord) ? "open" : "resolved",
    );
    setSelectedScenarioId(focusedRecord.scenarioId);
  }, [focusProductId, records]);

  function openRecord(record: ProductPortfolioScenarioProjection) {
    if (
      productPublicationRecordCanOpenProduct(record) &&
      record.projection.entry
    ) {
      onOpenProduct(record.projection.entry);
      return;
    }

    setActiveSessionRecord(record);
  }

  function openCapture() {
    setCaptureError(null);
    setCaptureSourceId(availablePublicationSources[0]?.scenarioId ?? null);
    setCaptureOpen(true);
  }

  function closeCapture() {
    if (captureApplying) {
      return;
    }

    setCaptureError(null);
    setCaptureOpen(false);
  }

  async function submitCapture() {
    const source = availablePublicationSources.find(
      (candidate) => candidate.scenarioId === captureSourceId,
    );
    if (!source) {
      setCaptureError("Select an available publication source.");
      return;
    }

    setCaptureApplying(true);
    setCaptureError(null);

    try {
      const result = await onCapturePublication({
        capturedAt: new Date().toISOString(),
        capturedByRef,
        expectedPublicationReceiptRef:
          source.projection.receipt.receiptRef,
        sourceId: source.scenarioId,
      });

      setQuery("");
      setViewId("open");
      setSelectedScenarioId(result.source.scenarioId);
      setCaptureOpen(false);
    } catch (error) {
      setCaptureError(
        error instanceof Error
          ? error.message
          : "The product publication could not be captured.",
      );
    } finally {
      setCaptureApplying(false);
    }
  }

  return {
    activeSessionRecord,
    capture: {
      applying: captureApplying,
      availableSources: availablePublicationSources,
      close: closeCapture,
      error: captureError,
      open: captureOpen,
      openDialog: openCapture,
      selectSource: (sourceId: string) => {
        setCaptureError(null);
        setCaptureSourceId(sourceId);
      },
      selectedSourceId: captureSourceId,
      submit: submitCapture,
    },
    closeSession: () => setActiveSessionRecord(null),
    openRecord,
    query,
    selectedRecord,
    selectedScenarioId: selectedRecord?.scenarioId ?? null,
    selectRecord: (record: ProductPortfolioScenarioProjection) =>
      setSelectedScenarioId(record.scenarioId),
    sessionReceipt,
    setQuery,
    setViewId,
    viewId,
    visibleRecords,
  };
}
