import { sessionMatchesLabel } from "@/utils/session-tags"

export type FixedGroupId = "initiatives" | "userRequests" | "recent" | "abandoned" | "done"
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
  },
): { id: HomeSessionGroupId; title: string; sessions: T[]; kind: "fixed" | "label" }[] {
  const top = [
    { id: "initiatives", matches: (tag: string) => tag === "initiative" || tag.startsWith("initiative:") },
    { id: "userRequests", matches: (tag: string) => tag === "user-request" },
  ] as const
  const terminal = [
    { id: "abandoned", tag: "abandoned" },
    { id: "done", tag: "done" },
  ] as const
  const tags = (record: T) => input.tags(record).map((tag) => tag.toLowerCase())
  const active = records.filter((record) => !terminal.some((section) => tags(record).includes(section.tag)))
  const labels = input.sections.map((section) => ({
    id: section.id as HomeSessionGroupId,
    title: section.title,
    sessions: active.filter((record) => sessionMatchesLabel(tags(record), section.tags)),
    kind: "label" as const,
  }))
  const fixed: { id: HomeSessionGroupId; title: string; sessions: T[]; kind: "fixed" }[] = [
    ...top.map((section) => ({
      id: section.id as HomeSessionGroupId,
      title: input.titles[section.id],
      sessions: active.filter((record) => tags(record).some(section.matches)),
      kind: "fixed" as const,
    })),
    {
      id: "recent",
      title: input.titles.recent,
      sessions: active.filter(
        (record) =>
          !top.some((section) => tags(record).some(section.matches)) &&
          !labels.some((section) => section.sessions.includes(record)),
      ),
      kind: "fixed" as const,
    },
    ...terminal.map((section) => ({
      id: section.id as HomeSessionGroupId,
      title: input.titles[section.id],
      sessions: records.filter((record) => tags(record).includes(section.tag)),
      kind: "fixed" as const,
    })),
  ]
  // Label sections render even when empty (creation would be invisible under
  // the fixed sections' hide-when-empty rule); fixed sections stay filtered.
  return [
    ...fixed.slice(0, top.length).filter((group) => group.sessions.length > 0),
    ...labels,
    ...fixed.slice(top.length).filter((group) => group.sessions.length > 0),
  ]
}
