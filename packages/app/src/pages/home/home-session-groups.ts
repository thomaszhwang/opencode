export type HomeSessionGroupId = "initiatives" | "userRequests" | "harness" | "recent" | "abandoned" | "done"

export function groupHomeSessions<T>(
  records: T[],
  input: {
    tags: (record: T) => string[]
    titles: Record<HomeSessionGroupId, string>
  },
): { id: HomeSessionGroupId; title: string; sessions: T[] }[] {
  const top = [
    { id: "initiatives", matches: (tag: string) => tag === "initiative" || tag.startsWith("initiative:") },
    { id: "userRequests", matches: (tag: string) => tag === "user-request" },
    { id: "harness", matches: (tag: string) => tag === "harness" },
  ] as const
  const terminal = [
    { id: "abandoned", tag: "abandoned" },
    { id: "done", tag: "done" },
  ] as const
  const tags = (record: T) => input.tags(record).map((tag) => tag.toLowerCase())
  const active = records.filter((record) => !terminal.some((section) => tags(record).includes(section.tag)))
  return [
    ...top.map((section) => ({
      id: section.id,
      title: input.titles[section.id],
      sessions: active.filter((record) => tags(record).some(section.matches)),
    })),
    {
      id: "recent" as const,
      title: input.titles.recent,
      sessions: active.filter((record) => !top.some((section) => tags(record).some(section.matches))),
    },
    ...terminal.map((section) => ({
      id: section.id,
      title: input.titles[section.id],
      sessions: records.filter((record) => tags(record).includes(section.tag)),
    })),
  ].filter((group) => group.sessions.length > 0)
}
