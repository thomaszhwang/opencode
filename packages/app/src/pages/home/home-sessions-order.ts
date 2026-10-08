import type { HomeSessionGroupId } from "./home-session-groups"

// Mirrors the fixed emission order of groupHomeSessions (top sections, then
// recent, then terminal sections); ids missing from the stored order slot in
// here, so new sections appear at their default position without a migration.
const DEFAULT_GROUP_ORDER: HomeSessionGroupId[] = [
  "initiatives",
  "userRequests",
  "harness",
  "recent",
  "abandoned",
  "done",
]

export function resolveGroupOrder(stored: HomeSessionGroupId[]): HomeSessionGroupId[] {
  const known = stored.filter((id, index) => DEFAULT_GROUP_ORDER.includes(id) && stored.indexOf(id) === index)
  return [...known, ...DEFAULT_GROUP_ORDER.filter((id) => !known.includes(id))]
}

export function orderGroups<T extends { id: HomeSessionGroupId }>(groups: T[], stored: HomeSessionGroupId[]): T[] {
  const order = resolveGroupOrder(stored)
  return [...groups].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
}
