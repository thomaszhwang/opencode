import type { HomeSessionGroupId } from "./home-session-groups"

// The done group starts collapsed (a long done list pushes recent sessions
// down the page); a stored value always wins over these defaults.
export function groupCollapseDefault(id: HomeSessionGroupId): boolean {
  return id === "done"
}

export function resolveGroupCollapsed(
  collapsed: Partial<Record<HomeSessionGroupId, boolean>>,
  id: HomeSessionGroupId,
): boolean {
  return collapsed[id] ?? groupCollapseDefault(id)
}
