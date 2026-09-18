"use client";
import { useEffect, useRef } from "react";
import type { Expert } from "./experts";
type Snapshot = { expertise: string; region: string; experts: Expert[] };
type ToolContext = { registerTool: (tool: { name: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void | Promise<void> };
export function useDirectoryTools(snapshot: Snapshot) {
  const latest = useRef(snapshot);
  latest.current = snapshot;
  useEffect(() => {
    const context = (document as Document & { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: "read_visible_marine_experts",
        description: "Read the marine experts currently shown in the list, with the active expertise and region filters. Does not change the view.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("Expected an empty object.");
          return { ...latest.current, count: latest.current.experts.length };
        },
      }, { signal: lifecycle.signal })).catch(() => { /* Optional browser capability. */ });
    } catch { /* Unsupported implementations do not affect the directory. */ }
    return () => lifecycle.abort();
  }, []);
}
