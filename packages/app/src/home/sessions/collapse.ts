import type { HomeSessionGroupId } from "./groups"

export function resolveGroupCollapsed(
  collapsed: Partial<Record<HomeSessionGroupId, boolean>>,
  id: HomeSessionGroupId,
): boolean {
  return collapsed[id] ?? false
}
