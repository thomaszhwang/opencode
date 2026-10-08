import { describe, expect, test } from "bun:test"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { preferLiveSession } from "./home-live-sessions"

function session(id: string, updated: number, metadata?: Record<string, unknown>): Session {
  return {
    id,
    slug: id,
    projectID: "project",
    directory: "/tmp/project",
    title: `Session ${id}`,
    version: "1",
    metadata,
    time: { created: 1, updated },
  }
}

describe("preferLiveSession", () => {
  test("prefers the live session when it is strictly newer", () => {
    const record = session("a", 100, { tags: ["old"] })
    const live = session("a", 200, { tags: ["new"] })
    expect(preferLiveSession(record, live)).toBe(live)
  })

  test("keeps the record when there is no live copy", () => {
    const record = session("a", 100)
    expect(preferLiveSession(record, undefined)).toBe(record)
  })

  test("keeps the record when the live copy is older", () => {
    const record = session("a", 200, { tags: ["new"] })
    const live = session("a", 100, { tags: ["old"] })
    expect(preferLiveSession(record, live)).toBe(record)
  })

  test("keeps the record when timestamps are equal", () => {
    const record = session("a", 100)
    const live = session("a", 100)
    expect(preferLiveSession(record, live)).toBe(record)
  })
})
