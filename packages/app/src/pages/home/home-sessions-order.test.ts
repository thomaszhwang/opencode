import { describe, expect, test } from "bun:test"
import type { HomeSessionGroupId } from "./home-session-groups"
import { defaultGroupOrder, orderGroups, resolveGroupOrder } from "./home-sessions-order"

const DEFAULT_ORDER: HomeSessionGroupId[] = ["initiatives", "userRequests", "recent"]

const LABEL_ORDER: HomeSessionGroupId[] = [
  "initiatives",
  "userRequests",
  "label:q4",
  "label:q4-planning",
  "recent",
]

describe("defaultGroupOrder", () => {
  test("places label ids after the fixed top sections and before recent", () => {
    expect(defaultGroupOrder(["label:q4", "label:q4-planning"])).toEqual(LABEL_ORDER)
  })

  test("falls back to the fixed order with no labels", () => {
    expect(defaultGroupOrder([])).toEqual(DEFAULT_ORDER)
  })
})

describe("resolveGroupOrder", () => {
  test("falls back to the default order when nothing is stored", () => {
    expect(resolveGroupOrder([], DEFAULT_ORDER)).toEqual(DEFAULT_ORDER)
  })

  test("honors a full stored permutation", () => {
    const stored = [...DEFAULT_ORDER].reverse()
    expect(resolveGroupOrder(stored, DEFAULT_ORDER)).toEqual(stored)
  })

  test("appends ids missing from a partial stored order in default order", () => {
    expect(resolveGroupOrder(["label:q4", "recent"], LABEL_ORDER)).toEqual([
      "label:q4",
      "recent",
      "initiatives",
      "userRequests",
      "label:q4-planning",
    ])
  })

  test("drops unknown and duplicate stored ids", () => {
    const stored = ["recent", "bogus", "recent", "label:q4"] as HomeSessionGroupId[]
    expect(resolveGroupOrder(stored, LABEL_ORDER)).toEqual([
      "recent",
      "label:q4",
      "initiatives",
      "userRequests",
      "label:q4-planning",
    ])
  })

  test("drops a deleted label's stored id", () => {
    const stored = ["label:gone", "recent"] as HomeSessionGroupId[]
    expect(resolveGroupOrder(stored, DEFAULT_ORDER)).toEqual(["recent", "initiatives", "userRequests"])
  })

  test("drops stored ids of removed sections", () => {
    const stored = ["done", "abandoned", "harness", "recent"] as HomeSessionGroupId[]
    expect(resolveGroupOrder(stored, DEFAULT_ORDER)).toEqual(["recent", "initiatives", "userRequests"])
  })

  test("appends a new label at its default position", () => {
    const stored = ["recent"] as HomeSessionGroupId[]
    expect(resolveGroupOrder(stored, LABEL_ORDER)).toEqual([
      "recent",
      "initiatives",
      "userRequests",
      "label:q4",
      "label:q4-planning",
    ])
  })
})

describe("orderGroups", () => {
  const groups = (ids: HomeSessionGroupId[]) => ids.map((id) => ({ id }))

  test("keeps the rendered order when nothing is stored", () => {
    expect(orderGroups(groups(["label:q4", "recent"]), [], LABEL_ORDER).map((group) => group.id)).toEqual([
      "label:q4",
      "recent",
    ])
  })

  test("reorders a rendered subset by the stored order", () => {
    const rendered = groups(["initiatives", "recent", "label:q4"])
    expect(orderGroups(rendered, ["recent", "initiatives"], LABEL_ORDER).map((group) => group.id)).toEqual([
      "recent",
      "initiatives",
      "label:q4",
    ])
  })

  test("places groups missing from the stored order at their default position", () => {
    const rendered = groups(["initiatives", "recent"])
    expect(orderGroups(rendered, ["recent"], DEFAULT_ORDER).map((group) => group.id)).toEqual([
      "recent",
      "initiatives",
    ])
  })

  test("a dragged label section keeps its stored position", () => {
    const rendered = groups(["initiatives", "label:q4", "recent"])
    const stored = ["label:q4", "initiatives"] as HomeSessionGroupId[]
    expect(orderGroups(rendered, stored, LABEL_ORDER).map((group) => group.id)).toEqual([
      "label:q4",
      "initiatives",
      "recent",
    ])
  })
})
