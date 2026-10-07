import { describe, expect, test } from "bun:test"
import { normalizeSessionTags, sessionMatchesLabel } from "./session-tags"

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
