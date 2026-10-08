import { describe, expect, test } from "bun:test"
import type { Session } from "@opencode-ai/sdk/v2/client"
import {
  isInitiativeMember,
  normalizeSessionTags,
  sessionMatchesLabel,
  sessionTagsFromMetadata,
  toggleSessionTag,
} from "./session-tags"

function sessionWithMetadata(metadata: unknown): Session {
  return { metadata } as Session
}

describe("normalizeSessionTags", () => {
  test("trims and collapses whitespace", () => {
    expect(normalizeSessionTags(["  fleet   plans ", "incident"])).toEqual(["fleet plans", "incident"])
  })

  test("drops empty tags", () => {
    expect(normalizeSessionTags(["", "   "])).toEqual([])
  })

  test("dedupes case-insensitively, keeping the first spelling", () => {
    expect(normalizeSessionTags(["Fleet", "fleet", "FLEET"])).toEqual(["Fleet"])
  })
})

describe("sessionMatchesLabel", () => {
  test("empty label tags match everything", () => {
    expect(sessionMatchesLabel([], [])).toBe(true)
    expect(sessionMatchesLabel(["fleet"], [])).toBe(true)
  })

  test("matches only when the session carries all of the label's tags", () => {
    expect(sessionMatchesLabel(["fleet", "plan"], ["fleet"])).toBe(true)
    expect(sessionMatchesLabel(["fleet", "plan"], ["fleet", "plan"])).toBe(true)
    expect(sessionMatchesLabel(["fleet"], ["fleet", "plan"])).toBe(false)
    expect(sessionMatchesLabel([], ["fleet"])).toBe(false)
  })

  test("matching is case-insensitive", () => {
    expect(sessionMatchesLabel(["Fleet"], ["fleet"])).toBe(true)
  })
})

describe("toggleSessionTag", () => {
  test("appends a missing tag in canonical lowercase", () => {
    expect(toggleSessionTag(["fleet"], "Done")).toEqual(["fleet", "done"])
  })

  test("removes a present tag", () => {
    expect(toggleSessionTag(["done", "fleet"], "done")).toEqual(["fleet"])
  })

  test("removes every case variant of the tag", () => {
    expect(toggleSessionTag(["Done", "fleet", "DONE"], "done")).toEqual(["fleet"])
  })

  test("toggling twice from empty returns to empty", () => {
    expect(toggleSessionTag(toggleSessionTag([], "done"), "done")).toEqual([])
  })
})

describe("sessionTagsFromMetadata", () => {
  test("returns no tags for a missing session or metadata", () => {
    expect(sessionTagsFromMetadata(undefined)).toEqual([])
    expect(sessionTagsFromMetadata(sessionWithMetadata(undefined))).toEqual([])
    expect(sessionTagsFromMetadata(sessionWithMetadata({}))).toEqual([])
  })

  test("reads and normalizes the tags key", () => {
    expect(sessionTagsFromMetadata(sessionWithMetadata({ tags: ["  fleet  plans ", "incident"] }))).toEqual([
      "fleet plans",
      "incident",
    ])
  })

  test("ignores non-array and non-string values", () => {
    expect(sessionTagsFromMetadata(sessionWithMetadata({ tags: "fleet" }))).toEqual([])
    expect(sessionTagsFromMetadata(sessionWithMetadata({ tags: ["fleet", 1, null] }))).toEqual(["fleet"])
  })
})

describe("isInitiativeMember", () => {
  test("matches the namespaced tag stored as written, case-insensitively", () => {
    expect(isInitiativeMember(sessionWithMetadata({ tags: ["Initiative:PlanetScale"] }), "PlanetScale")).toBe(true)
    expect(isInitiativeMember(sessionWithMetadata({ tags: ["initiative:planetscale"] }), "PlanetScale")).toBe(true)
    expect(isInitiativeMember(sessionWithMetadata({ tags: ["INITIATIVE:PLANETSCALE"] }), "planetscale")).toBe(true)
  })

  test("ignores other tags, the bare initiative tag, and near-miss prefixes", () => {
    expect(isInitiativeMember(sessionWithMetadata({ tags: ["fleet"] }), "PlanetScale")).toBe(false)
    expect(isInitiativeMember(sessionWithMetadata({ tags: ["initiative"] }), "PlanetScale")).toBe(false)
    expect(isInitiativeMember(sessionWithMetadata({ tags: ["initiativex:PlanetScale"] }), "PlanetScale")).toBe(false)
    expect(isInitiativeMember(sessionWithMetadata({ tags: ["initiative-PlanetScale"] }), "PlanetScale")).toBe(false)
    expect(isInitiativeMember(sessionWithMetadata({ tags: ["initiative:Other"] }), "PlanetScale")).toBe(false)
  })

  test("returns false for a session without tags", () => {
    expect(isInitiativeMember(sessionWithMetadata(undefined), "PlanetScale")).toBe(false)
    expect(isInitiativeMember(sessionWithMetadata({ tags: [] }), "PlanetScale")).toBe(false)
  })
})
