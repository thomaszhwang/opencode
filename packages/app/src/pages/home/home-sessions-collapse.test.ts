import { describe, expect, test } from "bun:test"
import { resolveGroupCollapsed } from "./home-sessions-collapse"

describe("resolveGroupCollapsed", () => {
  test("every group expands by default when no entry is stored", () => {
    expect(resolveGroupCollapsed({}, "initiatives")).toBe(false)
    expect(resolveGroupCollapsed({}, "recent")).toBe(false)
    expect(resolveGroupCollapsed({}, "label:q4")).toBe(false)
  })

  test("a stored true wins over the expanded default", () => {
    expect(resolveGroupCollapsed({ recent: true }, "recent")).toBe(true)
  })

  test("a stored false wins", () => {
    expect(resolveGroupCollapsed({ recent: false }, "recent")).toBe(false)
  })
})
