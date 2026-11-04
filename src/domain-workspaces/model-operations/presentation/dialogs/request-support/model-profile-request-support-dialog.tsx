"use client";

import {
  TerasStatusItem,
  TerasList,
  TerasDialog,
  TerasMetadataList,
} from "@/teras";

import { modelProfileRequestCapability } from "../../../work-model/profile-requests/model-profile-request-capability.ts";
import {
  modelProfileRequestMetadata,
  modelProfileRequestRequirementRows,
} from "./model-profile-request-support-view-model.ts";

export function ModelProfileRequestSupportDialog({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      description="The live request path uses OOS, Platform, and Security authority. The Console does not control profiles or the registry."
      kicker="Model Operations"
      onClose={onClose}
      open={open}
      width="standard"
      title="Model Profile Request Boundary"
    >
      <TerasMetadataList
        items={modelProfileRequestMetadata(modelProfileRequestCapability)}
      />
      <TerasList>
        {modelProfileRequestRequirementRows(modelProfileRequestCapability).map(
          ({ id, ...requirement }) => (
            <TerasStatusItem key={id} {...requirement} />
          ),
        )}
      </TerasList>
    </TerasDialog>
  );
}
