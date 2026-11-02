"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceRegistryRecord } from "../model/workspace-registry-types";
import { assertWorkspaceInventoryLifecyclePreparation } from "../workspace-registry-contract";
import { workspaceInventoryLifecyclePreparationFixture } from "../fixtures/workspace-registry.fixture";
import { intakeOwnerSetup, type IntakeOwnerSetup } from "../model/workspace-intake-guidance";

export function useIntakeOwnerSetup(record: WorkspaceRegistryRecord | null, fixtureMode: boolean) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "current" | "preview" | "unavailable"; setup: IntakeOwnerSetup | null; error: string | null }>({ status: "idle", setup: null, error: null });
  const generation = useRef(0);
  const name = record?.name ?? "";
  const load = useCallback(async (): Promise<IntakeOwnerSetup | null> => {
    const sequence = ++generation.current;
    if (!name) { setState({ status: "idle", setup: null, error: null }); return null; }
    setState({ status: "loading", setup: null, error: null });
    try {
      let setup: IntakeOwnerSetup;
      if (fixtureMode && record) setup = intakeOwnerSetup(workspaceInventoryLifecyclePreparationFixture(record), name);
      else {
        const response = await fetch("/api/workspace-registry/lifecycle/preparations", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: { kind: "repo", name, record_id: `repo:${name}` } }) });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error("The repository's current validation setup could not be read. Your draft is kept; refresh its setup to continue.");
        setup = intakeOwnerSetup(assertWorkspaceInventoryLifecyclePreparation(body), name);
      }
      if (sequence !== generation.current) return null;
      setState({ status: fixtureMode ? "preview" : "current", setup, error: null });
      return setup;
    } catch (error) {
      if (sequence === generation.current) setState({ status: "unavailable", setup: null, error: error instanceof Error ? error.message : "Owner setup unavailable." });
      return null;
    }
  }, [name, fixtureMode, record]);
  useEffect(() => { void load(); return () => { generation.current += 1; }; }, [load]);
  return { ...state, load, current: state.setup?.repository === name && (state.status === "current" || state.status === "preview") };
}
