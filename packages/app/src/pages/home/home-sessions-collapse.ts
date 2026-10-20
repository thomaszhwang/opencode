import type { HomeSessionGroupId } from "./home-session-groups"

// Every group starts expanded; a stored value always wins over the default.
// Orphaned stored entries for the removed terminal sections are never read.
export function resolveGroupCollapsed(
  collapsed: Partial<Record<HomeSessionGroupId, boolean>>,
  id: HomeSessionGroupId,
): boolean {
  return collapsed[id] ?? false
}
