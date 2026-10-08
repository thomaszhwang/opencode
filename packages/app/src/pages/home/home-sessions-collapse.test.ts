import { describe, expect, test } from "bun:test"
import type { HomeSessionGroupId } from "./home-session-groups"
import { groupCollapseDefault, resolveGroupCollapsed } from "./home-sessions-collapse"

describe("groupCollapseDefault", () => {
  test("collapses the done group by default", () => {
    expect(groupCollapseDefault("done")).toBe(true)
  })

  test("expands the time groups by default", () => {
    const ids: HomeSessionGroupId[] = ["today", "yesterday", "older"]
    expect(ids.map(groupCollapseDefault)).toEqual([false, false, false])
  })
})

describe("resolveGroupCollapsed", () => {
  test("falls back to the default when no entry is stored", () => {
    expect(resolveGroupCollapsed({}, "done")).toBe(true)
    expect(resolveGroupCollapsed({}, "today")).toBe(false)
  })

  test("a stored true wins over an expanded default", () => {
    expect(resolveGroupCollapsed({ today: true }, "today")).toBe(true)
  })

  test("a stored false wins over a collapsed default", () => {
    expect(resolveGroupCollapsed({ done: false }, "done")).toBe(false)
  })
})
