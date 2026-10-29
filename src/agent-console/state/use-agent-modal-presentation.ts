"use client";
import { useEffect, useId, useRef } from "react";
export function useAgentModalPresentation(expanded: boolean) {
    const titleId = useId();
    const presentationRef = useRef<HTMLDivElement>(null);
    const wasExpanded = useRef(false);
    useEffect(() => {
        if (wasExpanded.current && !expanded) {
            const frame = requestAnimationFrame(() => presentationRef.current?.querySelector<HTMLButtonElement>(".model-dock-expand")?.focus());
            wasExpanded.current = expanded;
            return () => cancelAnimationFrame(frame);
        }
        wasExpanded.current = expanded;
    }, [expanded]);
    return { titleId, presentationRef };
}
