import type { HomeSessionGroupId } from "./groups"

export function defaultGroupOrder(labels: `label:${string}`[]): HomeSessionGroupId[] {
  return ["initiatives", "userRequests", ...labels, "recent"]
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
