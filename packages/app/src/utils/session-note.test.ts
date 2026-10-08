import { describe, expect, test } from "bun:test"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { hasNote, sessionNote, sessionNoteMerge } from "./session-note"

function sessionWithMetadata(metadata: unknown): Session {
  return { metadata } as Session
}

describe("sessionNote", () => {
  test("returns empty for a missing session or metadata", () => {
    expect(sessionNote(undefined)).toBe("")
    expect(sessionNote(sessionWithMetadata(undefined))).toBe("")
    expect(sessionNote(sessionWithMetadata({}))).toBe("")
  })

  test("reads the note key", () => {
    expect(sessionNote(sessionWithMetadata({ note: "remember **this**" }))).toBe("remember **this**")
  })

  test("ignores non-string values", () => {
    expect(sessionNote(sessionWithMetadata({ note: 1 }))).toBe("")
    expect(sessionNote(sessionWithMetadata({ note: ["a"] }))).toBe("")
  })
})

describe("hasNote", () => {
  test("is false without a note", () => {
    expect(hasNote(undefined)).toBe(false)
    expect(hasNote(sessionWithMetadata(undefined))).toBe(false)
    expect(hasNote(sessionWithMetadata({}))).toBe(false)
  })

  test("is false for empty or whitespace-only notes", () => {
    expect(hasNote(sessionWithMetadata({ note: "" }))).toBe(false)
    expect(hasNote(sessionWithMetadata({ note: "  \n " }))).toBe(false)
  })

  test("is true when the note has content", () => {
    expect(hasNote(sessionWithMetadata({ note: "x" }))).toBe(true)
  })
})

describe("sessionNoteMerge", () => {
  test("sets the note while preserving other keys", () => {
    expect(sessionNoteMerge({ tags: ["done"] }, "hello")).toEqual({ tags: ["done"], note: "hello" })
  })

  test("replaces an existing note", () => {
    expect(sessionNoteMerge({ note: "old" }, "new")).toEqual({ note: "new" })
  })

  test("deletes the key for empty or whitespace-only text, keeping other keys", () => {
    expect(sessionNoteMerge({ note: "old", tags: ["done"] }, "")).toEqual({ tags: ["done"] })
    expect(sessionNoteMerge({ note: "old", tags: ["done"] }, "   ")).toEqual({ tags: ["done"] })
  })

  test("does not mutate the input", () => {
    const metadata = { note: "old", tags: ["done"] }
    sessionNoteMerge(metadata, "new")
    expect(metadata).toEqual({ note: "old", tags: ["done"] })
  })
})
