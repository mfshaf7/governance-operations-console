// The same completeness rule applies to the workspace and its primary-console
// attention adapter. A fresh page is not necessarily a complete collection.
export function prototypeSummaryComplete(value: unknown): boolean {
  const body = value as { coverage?: { complete?: boolean }; page?: { next_cursor?: unknown };
    projection?: { coverage?: { complete?: boolean }; ownerPage?: { next_cursor?: unknown } } } | null;
  return Boolean(body && body.coverage?.complete !== false && body.projection?.coverage?.complete !== false &&
    !body.page?.next_cursor && !body.projection?.ownerPage?.next_cursor);
}
