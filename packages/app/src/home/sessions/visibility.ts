import type { HomeSessionGroupId } from "./groups"

export type HomeTerminalTag = "done" | "abandoned"
export type HomeTerminalVisibility = Record<HomeTerminalTag, boolean>
export type HomeTerminalVisibilityStore = Partial<
  Record<HomeSessionGroupId, Partial<Record<HomeTerminalTag, boolean>>>
>

export function resolveGroupTerminalVisibility(
  stored: HomeTerminalVisibilityStore,
  id: HomeSessionGroupId,
): HomeTerminalVisibility {
  return { done: false, abandoned: false, ...stored[id] }
}
