"use client";

import { useWorkspaceViewState } from "../console-integration/registers/workspace-view-state.ts";
import {useRegisterPageSize} from "../console-integration/registers/use-register-page-size.ts";

// Presentation paging for an already loaded collection. Source coverage and
// owner continuation remain the caller's responsibility.
export function useRegisterPage<Row>(rows: readonly Row[], scope: string, register: string) {
  const {pageSize}=useRegisterPageSize(register);
  scope=JSON.stringify([scope,pageSize]);
  const [position, setPosition] = useWorkspaceViewState(`register-page:${register}`, { scope, offset: 0 });
  if (position.scope !== scope) setPosition({ scope, offset: 0 });
  const lastOffset = Math.max(0, Math.ceil(rows.length / pageSize) - 1) * pageSize;
  const offset = position.scope === scope ? Math.min(position.offset, lastOffset) : 0;
  return {
    rows: rows.slice(offset, offset + pageSize),
    offset,
    page: Math.floor(offset / pageSize) + 1,
    hasPrevious: offset > 0,
    hasNext: offset + pageSize < rows.length,
    first: () => setPosition({ scope, offset: 0 }),
    previous: () => setPosition({ scope, offset: Math.max(0, offset - pageSize) }),
    next: () => setPosition({ scope, offset: offset + pageSize }),
  };
}
