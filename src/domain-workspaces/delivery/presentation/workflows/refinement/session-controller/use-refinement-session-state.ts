"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
} from "../../../../read-model/index.ts";

import { refinementMetadataTargets } from "../view-model/refinement-metadata-model.ts";
import {
  loadRefinementSessionDraft,
  refinementSessionHasUnappliedChanges,
  saveRefinementSessionDraft,
} from "../../../../local-runtime/index.ts";
import type {
  DeliveryRefinementModalStep,
  RefinementMetadataFieldResolution,
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
  RefinementPersistedSession,
} from "../model/refinement-model.ts";

function initialMetadataDraftValues(packet: DeliveryRefinementPacket | null) {
  const values: Record<string, string> = {};

  if (packet) {
    refinementMetadataTargets(packet).forEach((target) => {
      values[target.key] = target.sourceValue;
    });
  }

  return values;
}

function initialSelectedMetadataFieldKey(
  packet: DeliveryRefinementPacket | null,
) {
  const fields = packet ? refinementMetadataTargets(packet) : [];
  const selected =
    fields.find(({ status }) => status !== "complete") ?? fields[0];

  return selected?.key ?? "";
}

export function useRefinementSessionState(
  packageId: string,
  packet: DeliveryRefinementPacket | null,
) {
  const initialDraftValues = useMemo(
    () => initialMetadataDraftValues(packet),
    [packet],
  );
  const [activeStep, setActiveStep] =
    useState<DeliveryRefinementModalStep>("hub");
  const [localReceipt, setLocalReceipt] =
    useState<DeliveryRefinementApplyReceipt | null>(null);
  const [metadataDraftValues, setMetadataDraftValues] = useState(() =>
    initialMetadataDraftValues(packet),
  );
  const [metadataFieldResolutions, setMetadataFieldResolutions] =
    useState<RefinementMetadataFieldResolutionMap>({});
  const [metadataSelectionMode, setMetadataSelectionMode] =
    useState<RefinementMetadataSelectionMode>("single");
  const [selectedMetadataBulkNodeIds, setSelectedMetadataBulkNodeIds] =
    useState<string[]>([]);
  const [selectedMetadataFieldKey, setSelectedMetadataFieldKey] = useState(() =>
    initialSelectedMetadataFieldKey(packet),
  );
  const [persistenceLoaded, setPersistenceLoaded] = useState(false);
  const activeReceipt = localReceipt ?? packet?.receipt ?? null;
  const hasUnappliedSessionChanges = refinementSessionHasUnappliedChanges({
    draftValues: metadataDraftValues,
    fieldResolutions: metadataFieldResolutions,
    initialDraftValues,
    receipt: activeReceipt,
  });

  useEffect(() => {
    setPersistenceLoaded(false);

    const nextDraftValues = initialMetadataDraftValues(packet);
    const nextSelectedFieldKey = initialSelectedMetadataFieldKey(packet);
    const persistedSession =
      packet && packageId ? loadRefinementSessionDraft(packageId) : null;
    const matchingSession =
      persistedSession?.packetId === packet?.packet_id
        ? persistedSession
        : null;

    setActiveStep("hub");
    setLocalReceipt(matchingSession?.apply.receipt ?? null);
    setMetadataDraftValues({
      ...nextDraftValues,
      ...(matchingSession?.metadata.draftValues ?? {}),
    });
    setMetadataFieldResolutions(
      matchingSession?.metadata.fieldResolutions ?? {},
    );
    setMetadataSelectionMode(
      matchingSession?.metadata.selectionMode ?? "single",
    );
    setSelectedMetadataBulkNodeIds(
      matchingSession?.metadata.selectedBulkNodeIds ?? [],
    );
    setSelectedMetadataFieldKey(
      matchingSession?.metadata.selectedFieldKey || nextSelectedFieldKey,
    );
    setPersistenceLoaded(true);
  }, [packageId, packet?.packet_id]);

  useEffect(() => {
    if (!persistenceLoaded || !packet || !packageId) {
      return;
    }

    const lastSavedAt = new Date().toISOString();
    const persistedSession: RefinementPersistedSession = {
      activeStep,
      apply: {
        receipt: activeReceipt,
      },
      lastSavedAt,
      metadata: {
        draftValues: metadataDraftValues,
        fieldResolutions: metadataFieldResolutions,
        selectedBulkNodeIds: selectedMetadataBulkNodeIds,
        selectedFieldKey: selectedMetadataFieldKey,
        selectionMode: metadataSelectionMode,
      },
      packageId,
      packetId: packet.packet_id,
      refinementSessionId: `refinement-session-${packageId}`,
      schemaVersion: 1,
    };

    saveRefinementSessionDraft(packageId, persistedSession);
  }, [
    activeReceipt,
    activeStep,
    metadataDraftValues,
    metadataFieldResolutions,
    metadataSelectionMode,
    packageId,
    packet,
    persistenceLoaded,
    selectedMetadataBulkNodeIds,
    selectedMetadataFieldKey,
  ]);

  function markMetadataFieldResolution(
    fieldKey: string,
    resolution: RefinementMetadataFieldResolution,
  ) {
    setMetadataFieldResolutions((current) => ({
      ...current,
      [fieldKey]: resolution,
    }));
  }

  function resetMetadataDraftValue(fieldKey: string, value: string) {
    setMetadataDraftValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
    setMetadataFieldResolutions((current) => {
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  }

  function updateMetadataDraftValue(fieldKey: string, value: string) {
    setMetadataDraftValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
    setMetadataFieldResolutions((current) => {
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  }

  function updateMetadataDraftValues(fieldKeys: string[], value: string) {
    setMetadataDraftValues((current) => ({
      ...current,
      ...Object.fromEntries(fieldKeys.map((fieldKey) => [fieldKey, value])),
    }));
    setMetadataFieldResolutions((current) => {
      const next = { ...current };
      fieldKeys.forEach((fieldKey) => {
        delete next[fieldKey];
      });
      return next;
    });
  }

  function markMetadataFieldResolutions(
    fieldKeys: string[],
    resolution: RefinementMetadataFieldResolution,
  ) {
    setMetadataFieldResolutions((current) => ({
      ...current,
      ...Object.fromEntries(
        fieldKeys.map((fieldKey) => [fieldKey, resolution]),
      ),
    }));
  }

  function resetMetadataDraftValues(values: Record<string, string>) {
    const fieldKeys = Object.keys(values);

    setMetadataDraftValues((current) => ({
      ...current,
      ...values,
    }));
    setMetadataFieldResolutions((current) => {
      const next = { ...current };
      fieldKeys.forEach((fieldKey) => {
        delete next[fieldKey];
      });
      return next;
    });
  }

  function toggleMetadataBulkNode(nodeId: string) {
    setSelectedMetadataBulkNodeIds((current) =>
      current.includes(nodeId)
        ? current.filter((currentNodeId) => currentNodeId !== nodeId)
        : [...current, nodeId],
    );
  }

  return {
    activeReceipt,
    activeStep,
    hasUnappliedSessionChanges,
    markMetadataFieldResolutions,
    markMetadataFieldResolution,
    metadataDraftValues,
    metadataFieldResolutions,
    metadataSelectionMode,
    persistenceLoaded,
    resetMetadataDraftValue,
    resetMetadataDraftValues,
    selectedMetadataBulkNodeIds,
    setActiveStep,
    setLocalReceipt,
    setMetadataSelectionMode,
    setSelectedMetadataBulkNodeIds,
    selectedMetadataFieldKey,
    setSelectedMetadataFieldKey,
    toggleMetadataBulkNode,
    updateMetadataDraftValues,
    updateMetadataDraftValue,
  };
}
