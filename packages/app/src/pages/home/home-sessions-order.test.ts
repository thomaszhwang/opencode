import { describe, expect, test } from "bun:test"
import type { HomeSessionGroupId } from "./home-session-groups"
import { orderGroups, resolveGroupOrder } from "./home-sessions-order"

const DEFAULT_ORDER: HomeSessionGroupId[] = [
  "initiatives",
  "userRequests",
  "harness",
  "recent",
  "abandoned",
  "done",
]

describe("resolveGroupOrder", () => {
  test("falls back to the default order when nothing is stored", () => {
    expect(resolveGroupOrder([])).toEqual(DEFAULT_ORDER)
  })

  test("honors a full stored permutation", () => {
    const stored = [...DEFAULT_ORDER].reverse()
    expect(resolveGroupOrder(stored)).toEqual(stored)
  })

  test("appends ids missing from a partial stored order in default order", () => {
    expect(resolveGroupOrder(["done", "recent"])).toEqual([
      "done",
      "recent",
      "initiatives",
      "userRequests",
      "harness",
      "abandoned",
    ])
  })

  test("drops unknown and duplicate stored ids", () => {
    const stored = ["recent", "bogus", "recent", "done"] as HomeSessionGroupId[]
    expect(resolveGroupOrder(stored)).toEqual(["recent", "done", "initiatives", "userRequests", "harness", "abandoned"])
  })
})

describe("orderGroups", () => {
  const groups = (ids: HomeSessionGroupId[]) => ids.map((id) => ({ id }))

  test("keeps the rendered order when nothing is stored", () => {
    expect(orderGroups(groups(["recent", "done"]), []).map((group) => group.id)).toEqual(["recent", "done"])
  })

  test("reorders a rendered subset by the stored order", () => {
    const rendered = groups(["initiatives", "recent", "done"])
    expect(orderGroups(rendered, ["done", "recent"]).map((group) => group.id)).toEqual([
      "done",
      "recent",
      "initiatives",
    ])
  })

  test("places groups missing from the stored order at their default position", () => {
    const rendered = groups(["initiatives", "recent"])
    expect(orderGroups(rendered, ["recent"]).map((group) => group.id)).toEqual(["recent", "initiatives"])
  })
})
