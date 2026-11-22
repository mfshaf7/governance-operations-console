"use client";

import { createContext, useContext } from "react";
import type { PreviewPIPlan } from "../../local-runtime/projections/pi-planning-preview.ts";

export const PIPlanningPreviewContext = createContext<{
  open: (packageId: string) => void;
  plans: Record<string, PreviewPIPlan>;
  preview: boolean;
} | null>(null);

export const usePIPlanningPreview = () => useContext(PIPlanningPreviewContext);
