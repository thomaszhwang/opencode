import type { HomeSessionGroupId } from "./home-session-groups"

export type HomeTerminalTag = "done" | "abandoned"
export type HomeTerminalVisibility = Record<HomeTerminalTag, boolean>
export type HomeTerminalVisibilityStore = Partial<
  Record<HomeSessionGroupId, Partial<Record<HomeTerminalTag, boolean>>>
>

// Terminal-tagged sessions are hidden in every section by default; a stored
// per-section value wins over the default, independently per tag.
export function resolveGroupTerminalVisibility(
  stored: HomeTerminalVisibilityStore,
  id: HomeSessionGroupId,
): HomeTerminalVisibility {
  return { done: false, abandoned: false, ...stored[id] }
}
