import { sessionMatchesLabel } from "./filter"

export type FixedGroupId = "initiatives" | "userRequests" | "recent"
export type HomeSessionGroupId = FixedGroupId | `label:${string}`

export interface HomeSectionDef {
  id: `label:${string}`
  title: string
  tags: string[]
}

export function groupHomeSessions<T>(
  records: T[],
  input: {
    tags: (record: T) => string[]
    titles: Record<FixedGroupId, string>
    sections: HomeSectionDef[]
    visibility: (id: HomeSessionGroupId) => { done: boolean; abandoned: boolean }
  },
): { id: HomeSessionGroupId; title: string; sessions: T[]; kind: "fixed" | "label" }[] {
  const top = [
    { id: "initiatives", matches: (tag: string) => tag === "initiative" || tag.startsWith("initiative:") },
    { id: "userRequests", matches: (tag: string) => tag === "user-request" },
  ] as const
  const tags = (record: T) => input.tags(record).map((tag) => tag.toLowerCase())
  const visible = (id: HomeSessionGroupId, record: T) => {
    const terminal = tags(record).filter((tag): tag is "done" | "abandoned" => tag === "done" || tag === "abandoned")
    if (terminal.length === 0) return true
    const state = input.visibility(id)
    return terminal.some((tag) => state[tag])
  }
  const labels = input.sections.map((section) => ({
    id: section.id as HomeSessionGroupId,
    title: section.title,
    sessions: records.filter((record) => sessionMatchesLabel(tags(record), section.tags) && visible(section.id, record)),
    kind: "label" as const,
  }))
  const fixed: { id: HomeSessionGroupId; title: string; sessions: T[]; kind: "fixed" }[] = [
    ...top.map((section) => ({
      id: section.id as HomeSessionGroupId,
      title: input.titles[section.id],
      sessions: records.filter((record) => tags(record).some(section.matches) && visible(section.id, record)),
      kind: "fixed" as const,
    })),
    {
      id: "recent",
      title: input.titles.recent,
      sessions: records.filter(
        (record) =>
          !top.some((section) => tags(record).some(section.matches)) &&
          !input.sections.some((section) => sessionMatchesLabel(tags(record), section.tags)) &&
          visible("recent", record),
      ),
      kind: "fixed" as const,
    },
  ]
  return [
    ...fixed.slice(0, top.length).filter((group) => group.sessions.length > 0),
    ...labels,
    ...fixed.slice(top.length).filter((group) => group.sessions.length > 0),
  ]
}
