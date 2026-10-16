import type { HomeSessionGroupId } from "./home-session-groups"

// Mirrors the emission order of groupHomeSessions (fixed top sections, then
// label sections in creation order, then recent and terminal); ids missing
// from the stored order slot in here, so new sections appear at their default
// position without a migration.
export function defaultGroupOrder(labels: `label:${string}`[]): HomeSessionGroupId[] {
  return ["initiatives", "userRequests", "harness", ...labels, "recent", "abandoned", "done"]
}

export function resolveGroupOrder(stored: HomeSessionGroupId[], defaults: HomeSessionGroupId[]): HomeSessionGroupId[] {
  const known = stored.filter((id, index) => defaults.includes(id) && stored.indexOf(id) === index)
  return [...known, ...defaults.filter((id) => !known.includes(id))]
}

export function orderGroups<T extends { id: HomeSessionGroupId }>(
  groups: T[],
  stored: HomeSessionGroupId[],
  defaults: HomeSessionGroupId[],
): T[] {
  const order = resolveGroupOrder(stored, defaults)
  return [...groups].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
}
