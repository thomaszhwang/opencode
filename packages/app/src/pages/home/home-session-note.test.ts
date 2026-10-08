import { describe, expect, test } from "bun:test"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { homeSessionNotePinned } from "./home-session-note"

function sessionWithMetadata(metadata: unknown): Session {
  return { metadata } as Session
}

describe("homeSessionNotePinned", () => {
  test("pins the icon when the session carries a note", () => {
    expect(homeSessionNotePinned(sessionWithMetadata({ note: "remember this" }))).toBe(true)
    expect(homeSessionNotePinned(sessionWithMetadata({ note: "x", tags: ["done"] }))).toBe(true)
  })

  test("leaves the icon hover-only when no note exists", () => {
    expect(homeSessionNotePinned(undefined)).toBe(false)
    expect(homeSessionNotePinned(sessionWithMetadata(undefined))).toBe(false)
    expect(homeSessionNotePinned(sessionWithMetadata({}))).toBe(false)
    expect(homeSessionNotePinned(sessionWithMetadata({ tags: ["done"] }))).toBe(false)
    expect(homeSessionNotePinned(sessionWithMetadata({ note: "" }))).toBe(false)
    expect(homeSessionNotePinned(sessionWithMetadata({ note: "  \n " }))).toBe(false)
    expect(homeSessionNotePinned(sessionWithMetadata({ note: 1 }))).toBe(false)
  })
})
