import { describe, expect, test } from "bun:test"
import type { HomeSessionGroupId } from "./home-session-groups"
import { defaultGroupOrder, orderGroups, resolveGroupOrder } from "./home-sessions-order"

const DEFAULT_ORDER: HomeSessionGroupId[] = [
  "initiatives",
  "userRequests",
  "recent",
  "abandoned",
  "done",
]

const LABEL_ORDER: HomeSessionGroupId[] = [
  "initiatives",
  "userRequests",
  "label:q4",
  "label:q4-planning",
  "recent",
  "abandoned",
  "done",
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
    expect(resolveGroupOrder(["done", "recent"], DEFAULT_ORDER)).toEqual([
      "done",
      "recent",
      "initiatives",
      "userRequests",
      "abandoned",
    ])
  })

  test("drops unknown and duplicate stored ids", () => {
    const stored = ["recent", "bogus", "recent", "done"] as HomeSessionGroupId[]
    expect(resolveGroupOrder(stored, DEFAULT_ORDER)).toEqual([
      "recent",
      "done",
      "initiatives",
      "userRequests",
      "abandoned",
    ])
  })

  test("drops a deleted label's stored id", () => {
    const stored = ["label:gone", "recent"] as HomeSessionGroupId[]
    expect(resolveGroupOrder(stored, DEFAULT_ORDER)).toEqual([
      "recent",
      "initiatives",
      "userRequests",
      "abandoned",
      "done",
    ])
  })

  test("appends a new label at its default position", () => {
    const stored = ["done", "recent"] as HomeSessionGroupId[]
    expect(resolveGroupOrder(stored, LABEL_ORDER)).toEqual([
      "done",
      "recent",
      "initiatives",
      "userRequests",
      "label:q4",
      "label:q4-planning",
      "abandoned",
    ])
  })
})

describe("orderGroups", () => {
  const groups = (ids: HomeSessionGroupId[]) => ids.map((id) => ({ id }))

  test("keeps the rendered order when nothing is stored", () => {
    expect(orderGroups(groups(["recent", "done"]), [], DEFAULT_ORDER).map((group) => group.id)).toEqual([
      "recent",
      "done",
    ])
  })

  test("reorders a rendered subset by the stored order", () => {
    const rendered = groups(["initiatives", "recent", "done"])
    expect(orderGroups(rendered, ["done", "recent"], DEFAULT_ORDER).map((group) => group.id)).toEqual([
      "done",
      "recent",
      "initiatives",
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
