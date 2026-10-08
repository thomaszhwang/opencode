import { DateTime } from "luxon"

export type HomeSessionGroupId = "today" | "yesterday" | "older" | "done"

// Sessions tagged "done" (the well-known status tag, matched case-insensitively)
// leave the time-based groups and sink into a dedicated group at the bottom.
export function groupHomeSessions<T>(
  records: T[],
  input: {
    time: (record: T) => number
    tags: (record: T) => string[]
    titles: Record<HomeSessionGroupId | "recent", string>
  },
): { id: HomeSessionGroupId; title: string; sessions: T[] }[] {
  const now = DateTime.local()
  const yesterday = now.minus({ days: 1 })
  const isDone = (record: T) => input.tags(record).some((tag) => tag.toLowerCase() === "done")
  const doneSessions = records.filter(isDone)
  const pending = records.filter((record) => !isDone(record))
  const todaySessions = pending.filter((record) => DateTime.fromMillis(input.time(record)).hasSame(now, "day"))
  const yesterdaySessions = pending.filter((record) =>
    DateTime.fromMillis(input.time(record)).hasSame(yesterday, "day"),
  )
  const olderSessions = pending.filter((record) => {
    const time = DateTime.fromMillis(input.time(record))
    return !time.hasSame(now, "day") && !time.hasSame(yesterday, "day")
  })
  const olderTitle =
    todaySessions.length === 0 && yesterdaySessions.length === 0 ? input.titles.recent : input.titles.older
  return [
    { id: "today" as const, title: input.titles.today, sessions: todaySessions },
    { id: "yesterday" as const, title: input.titles.yesterday, sessions: yesterdaySessions },
    { id: "older" as const, title: olderTitle, sessions: olderSessions },
    { id: "done" as const, title: input.titles.done, sessions: doneSessions },
  ].filter((group) => group.sessions.length > 0)
}
