"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasChoiceGroup,
  TerasContentTray,
  TerasDraftCloseGuardDialog,
  TerasMetadataList,
  TerasModalShell,
  TerasSelectField,
  TerasList,
  TerasSignalItem,
  TerasTrayStack,
} from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type { ProductListingScope } from "@/domain-workspaces/portfolio/domain/product-portfolio-vocabulary";
import type {
  ProductListingApplyResult,
  ProductListingCommand,
  ProductListingDraft,
  ProductListingPosition,
} from "../../../work-model/listing/product-listing-types.ts";
import {
  createProductListingCommand,
  productCurationAnchorEntries,
  productCurationScopeOptions,
  productListingDraftEquals,
  productListingDraftForEntry,
} from "./curation-view-model.ts";

type ListingStateChoice = "listed" | "unlisted";
type ListingPlacementChoice = "featured" | "standard";
type ListingPositionChoice = ProductListingPosition["kind"];

const listingStateOptions = [
  { id: "listed", label: "Listed", tone: "info" },
  { id: "unlisted", label: "Unlisted", tone: "muted" },
] satisfies Array<{
  id: ListingStateChoice;
  label: string;
  tone: "info" | "muted";
}>;

const listingPlacementOptions = [
  { id: "standard", label: "Standard", tone: "info" },
  { id: "featured", label: "Featured", tone: "warn" },
] satisfies Array<{
  id: ListingPlacementChoice;
  label: string;
  tone: "info" | "warn";
}>;

const listingPositionOptions = [
  { id: "first", label: "First", tone: "info" },
  { id: "last", label: "Last", tone: "info" },
  { id: "after", label: "After Product", tone: "info" },
] satisfies Array<{
  id: ListingPositionChoice;
  label: string;
  tone: "info";
}>;

export function ProductListingEditDialog({
  entries,
  entry,
  onApply,
  onClose,
  submittedByRef = "operator://portfolio-console/local",
}: {
  entries: ProductPortfolioEntry[];
  entry: ProductPortfolioEntry;
  onApply: (
    command: ProductListingCommand,
  ) => Promise<ProductListingApplyResult>;
  onClose: () => void;
  submittedByRef?: string;
}) {
  const initialDraft = productListingDraftForEntry(entries, entry);
  const [anchorProductId, setAnchorProductId] = useState(
    initialDraft.state === "listed" && initialDraft.position.kind === "after"
      ? initialDraft.position.productId
      : "",
  );
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [featured, setFeatured] = useState(
    initialDraft.state === "listed" && initialDraft.featured,
  );
  const [listingState, setListingState] = useState<ListingStateChoice>(
    initialDraft.state,
  );
  const [positionKind, setPositionKind] = useState<ListingPositionChoice>(
    initialDraft.state === "listed" ? initialDraft.position.kind : "last",
  );
  const [scope, setScope] = useState<ProductListingScope>(initialDraft.scope);
  const currentDraft = useMemo(
    () => productListingDraftForEntry(entries, entry),
    [entries, entry],
  );
  const anchorEntries = productCurationAnchorEntries(entries, entry, featured);
  const selectedAnchor =
    anchorEntries.find(
      (candidate) => candidate.identity.productId === anchorProductId,
    ) ??
    anchorEntries[0] ??
    null;
  const effectivePositionKind =
    positionKind === "after" && selectedAnchor === null ? "last" : positionKind;
  const listingPosition: ProductListingPosition =
    effectivePositionKind === "after" && selectedAnchor
      ? {
          kind: "after",
          productId: selectedAnchor.identity.productId,
        }
      : effectivePositionKind === "first"
        ? { kind: "first" }
        : { kind: "last" };
  const draft: ProductListingDraft =
    listingState === "unlisted"
      ? {
          featured: false,
          position: null,
          scope,
          state: "unlisted",
        }
      : {
          featured,
          position: listingPosition,
          scope,
          state: "listed",
        };
  const dirty = !productListingDraftEquals(currentDraft, draft);
  const scopeOptions = productCurationScopeOptions(entry);
  const anchorOptions = anchorEntries.map((candidate) => ({
    label: candidate.identity.displayName,
    value: candidate.identity.productId,
  }));

  useEffect(() => {
    const initialDraft = productListingDraftForEntry(entries, entry);
    setListingState(initialDraft.state);
    setScope(initialDraft.scope);
    setFeatured(initialDraft.state === "listed" && initialDraft.featured);
    setPositionKind(
      initialDraft.state === "listed" ? initialDraft.position.kind : "last",
    );
    setAnchorProductId(
      initialDraft.state === "listed" && initialDraft.position.kind === "after"
        ? initialDraft.position.productId
        : "",
    );
    setApplyError(null);
    setApplying(false);
    setCloseGuardOpen(false);
  }, [entries, entry]);

  function requestClose() {
    if (dirty) {
      setCloseGuardOpen(true);
      return;
    }
    onClose();
  }

  async function applyDraft() {
    setApplyError(null);
    setApplying(true);
    try {
      await onApply(
        createProductListingCommand({
          draft,
          entry,
          submittedAt: new Date().toISOString(),
          submittedByRef,
        }),
      );
      onClose();
    } catch (error) {
      setApplyError(
        error instanceof Error
          ? error.message
          : "The listing update could not be applied.",
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <TerasModalShell
        bodyLayout="scroll"
        height="content"
        width="standard"
        description="Set catalog visibility, permitted scope, placement, and relative position."
        footer={
          <>
            <TerasActionButton onClick={requestClose} emphasis="secondary">
              Cancel
            </TerasActionButton>
            <TerasActionButton
              disabled={applying || !dirty || scopeOptions.length === 0}
              onClick={applyDraft}
              emphasis="primary"
            >
              {applying ? "Applying..." : "Apply Listing"}
            </TerasActionButton>
          </>
        }
        kicker="Portfolio Curation"
        onClose={requestClose}
        surfaceId="product-listing-edit"
        title="Edit Listing"
      >
        <TerasMetadataList
          items={[
            { label: "Product", value: entry.identity.displayName },
            { label: "Product ID", value: entry.identity.productId },
          ]}
          shape="line"
          treatment="chip"
          wrap
        />

        {applyError ? (
          <TerasList frame="contained">
            <TerasSignalItem
              detail={applyError}
              label="Listing Command"
              title="Apply failed"
              tone="danger"
            />
          </TerasList>
        ) : null}

        <TerasTrayStack columns={2} topOffset="normal">
          <TerasChoiceGroup
            ariaLabel="Select listing state"
            frame="tray"
            label="Listing State"
            onSelect={setListingState}
            options={listingStateOptions}
            selectedId={listingState}
          />

          <TerasChoiceGroup
            ariaLabel="Select listing scope"
            frame="tray"
            label="Listing Scope"
            onSelect={setScope}
            options={scopeOptions.map((option) => ({
              id: option.value,
              label: option.label,
              tone: "info" as const,
            }))}
            selectedId={scope}
          />

          {listingState === "listed" ? (
            <>
              <TerasChoiceGroup
                ariaLabel="Select listing placement"
                frame="tray"
                label="Placement"
                onSelect={(placement) => setFeatured(placement === "featured")}
                options={listingPlacementOptions}
                selectedId={featured ? "featured" : "standard"}
              />

              <TerasChoiceGroup
                ariaLabel="Select relative listing position"
                frame="tray"
                label="Position"
                onSelect={setPositionKind}
                options={listingPositionOptions.map((option) => ({
                  ...option,
                  disabled: option.id === "after" && anchorEntries.length === 0,
                  disabledReason:
                    option.id === "after" && anchorEntries.length === 0
                      ? "No other product exists in this placement group."
                      : undefined,
                }))}
                selectedId={effectivePositionKind}
              />

              {effectivePositionKind === "after" && selectedAnchor ? (
                <TerasContentTray kicker="Relative Anchor">
                  <TerasSelectField
                    label="Place after"
                    onValueChange={setAnchorProductId}
                    options={anchorOptions}
                    value={selectedAnchor.identity.productId}
                  />
                </TerasContentTray>
              ) : null}
            </>
          ) : null}
        </TerasTrayStack>
      </TerasModalShell>

      <TerasDraftCloseGuardDialog
        description="The listing changes in this dialog have not been applied."
        kicker="Unsaved Listing"
        leaveLabel="Discard Changes"
        onKeepEditing={() => setCloseGuardOpen(false)}
        onLeave={() => {
          setCloseGuardOpen(false);
          onClose();
        }}
        open={closeGuardOpen}
        title="Discard listing changes?"
      />
    </>
  );
}
