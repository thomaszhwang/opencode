import { describe, expect, test } from "bun:test"
import { DateTime } from "luxon"
import { groupHomeSessions, type HomeSessionGroupId } from "./home-session-groups"

const titles: Record<HomeSessionGroupId | "recent", string> = {
  today: "Today",
  yesterday: "Yesterday",
  older: "Older",
  recent: "Recent sessions",
  done: "Done",
}

type Fixture = { id: string; at: number; tags: string[] }

function group(records: Fixture[]) {
  return groupHomeSessions(records, {
    time: (record) => record.at,
    tags: (record) => record.tags,
    titles,
  })
}

function at(daysAgo: number) {
  return DateTime.local().minus({ days: daysAgo }).toMillis()
}

describe("groupHomeSessions", () => {
  test("partitions done-tagged sessions out of the time groups", () => {
    const done = { id: "done", at: at(0), tags: ["done"] }
    const pending = { id: "pending", at: at(0), tags: [] }
    const groups = group([done, pending])
    expect(groups.find((group) => group.id === "today")?.sessions).toEqual([pending])
    expect(groups.find((group) => group.id === "done")?.sessions).toEqual([done])
  })

  test("matches the done tag case-insensitively", () => {
    const groups = group([
      { id: "a", at: at(0), tags: ["Done"] },
      { id: "b", at: at(0), tags: ["DONE"] },
      { id: "c", at: at(0), tags: ["done"] },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.sessions.map((session) => session.id)).toEqual(["a", "b", "c"])
  })

  test("keeps sessions with other tags in their time group", () => {
    const record = { id: "a", at: at(0), tags: ["research"] }
    const groups = group([record])
    expect(groups.find((group) => group.id === "today")?.sessions).toEqual([record])
    expect(groups.find((group) => group.id === "done")).toBeUndefined()
  })

  test("done sessions from any day join the done group", () => {
    const groups = group([
      { id: "today", at: at(0), tags: ["done"] },
      { id: "yesterday", at: at(1), tags: ["done"] },
      { id: "older", at: at(3), tags: ["done"] },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.id).toBe("done")
    expect(groups[0]?.sessions.map((session) => session.id)).toEqual(["today", "yesterday", "older"])
  })

  test("buckets pending sessions by day and hides empty groups", () => {
    const groups = group([
      { id: "today", at: at(0), tags: [] },
      { id: "yesterday", at: at(1), tags: [] },
      { id: "older", at: at(3), tags: [] },
    ])
    expect(groups.map((group) => group.id)).toEqual(["today", "yesterday", "older"])
    expect(groups.map((group) => group.sessions[0]?.id)).toEqual(["today", "yesterday", "older"])
  })

  test("titles the older group as recent when today and yesterday are empty", () => {
    const groups = group([
      { id: "older", at: at(3), tags: [] },
      { id: "done", at: at(0), tags: ["done"] },
    ])
    expect(groups.map((group) => group.id)).toEqual(["older", "done"])
    expect(groups[0]?.title).toBe("Recent sessions")
  })

  test("titles the older group as older when a pending session is recent", () => {
    const groups = group([
      { id: "older", at: at(3), tags: [] },
      { id: "today", at: at(0), tags: [] },
    ])
    expect(groups.find((group) => group.id === "older")?.title).toBe("Older")
  })
})
