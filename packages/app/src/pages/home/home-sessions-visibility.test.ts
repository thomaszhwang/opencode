import { describe, expect, test } from "bun:test"
import { resolveGroupTerminalVisibility } from "./home-sessions-visibility"

describe("resolveGroupTerminalVisibility", () => {
  test("hides both terminal tags by default for every group kind", () => {
    expect(resolveGroupTerminalVisibility({}, "initiatives")).toEqual({ done: false, abandoned: false })
    expect(resolveGroupTerminalVisibility({}, "recent")).toEqual({ done: false, abandoned: false })
    expect(resolveGroupTerminalVisibility({}, "label:q4")).toEqual({ done: false, abandoned: false })
  })

  test("a stored value wins per tag, keeping the other tag's default", () => {
    expect(resolveGroupTerminalVisibility({ recent: { done: true } }, "recent")).toEqual({
      done: true,
      abandoned: false,
    })
    expect(resolveGroupTerminalVisibility({ recent: { abandoned: true } }, "recent")).toEqual({
      done: false,
      abandoned: true,
    })
  })

  test("a stored false wins over a stored true from another group", () => {
    const stored = { initiatives: { done: true }, userRequests: { done: false } }
    expect(resolveGroupTerminalVisibility(stored, "initiatives")).toEqual({ done: true, abandoned: false })
    expect(resolveGroupTerminalVisibility(stored, "userRequests")).toEqual({ done: false, abandoned: false })
  })

  test("stored values are independent per group", () => {
    const stored = { "label:q4": { done: true, abandoned: true } }
    expect(resolveGroupTerminalVisibility(stored, "label:q4")).toEqual({ done: true, abandoned: true })
    expect(resolveGroupTerminalVisibility(stored, "label:other")).toEqual({ done: false, abandoned: false })
  })
})
