import { describe, expect, test } from "bun:test"
import { groupHomeSessions, type FixedGroupId, type HomeSectionDef, type HomeSessionGroupId } from "./home-session-groups"

const titles: Record<FixedGroupId, string> = {
  initiatives: "Initiatives",
  userRequests: "User Requests",
  recent: "Recent sessions",
  abandoned: "Abandoned",
  done: "Done",
}

type Fixture = { id: string; tags: string[] }

function group(records: Fixture[], sections: HomeSectionDef[] = []) {
  return groupHomeSessions(records, {
    tags: (record) => record.tags,
    titles,
    sections,
  })
}

function ids(groups: ReturnType<typeof group>, id: HomeSessionGroupId) {
  return groups.find((group) => group.id === id)?.sessions.map((session) => session.id)
}

describe("groupHomeSessions", () => {
  test("routes section tags into their sections in fixed order", () => {
    const groups = group([
      { id: "done", tags: ["done"] },
      { id: "harness", tags: ["Harness"] },
      { id: "recent", tags: [] },
      { id: "initiative", tags: ["Initiative"] },
      { id: "abandoned", tags: ["Abandoned"] },
      { id: "user-request", tags: ["User-Request"] },
    ])
    expect(groups.map((group) => group.id)).toEqual([
      "initiatives",
      "userRequests",
      "recent",
      "abandoned",
      "done",
    ])
    expect(groups.map((group) => group.title)).toEqual([
      "Initiatives",
      "User Requests",
      "Recent sessions",
      "Abandoned",
      "Done",
    ])
    expect(ids(groups, "initiatives")).toEqual(["initiative"])
    expect(ids(groups, "userRequests")).toEqual(["user-request"])
    expect(ids(groups, "recent")).toEqual(["harness", "recent"])
    expect(ids(groups, "abandoned")).toEqual(["abandoned"])
    expect(ids(groups, "done")).toEqual(["done"])
  })

  test("matches section tags case-insensitively but not by substring", () => {
    const groups = group([
      { id: "a", tags: ["INITIATIVE"] },
      { id: "b", tags: ["user-Request"] },
      { id: "c", tags: ["hArNeSs"] },
      { id: "d", tags: ["user-requested"] },
      { id: "e", tags: ["DONE"] },
    ])
    expect(ids(groups, "initiatives")).toEqual(["a"])
    expect(ids(groups, "userRequests")).toEqual(["b"])
    expect(ids(groups, "done")).toEqual(["e"])
    expect(ids(groups, "recent")).toEqual(["c", "d"])
  })

  test("matches bare and namespaced initiative tags, but not lookalike prefixes", () => {
    const groups = group([
      { id: "bare", tags: ["Initiative"] },
      { id: "namespaced", tags: ["Initiative:PlanetScale"] },
      { id: "namespaced-lower", tags: ["initiative:schema-registry"] },
      { id: "prefixed", tags: ["initiativex:foo"] },
      { id: "hyphenated", tags: ["initiative-foo"] },
    ])
    expect(ids(groups, "initiatives")).toEqual(["bare", "namespaced", "namespaced-lower"])
    expect(ids(groups, "recent")).toEqual(["prefixed", "hyphenated"])
  })

  test("places a session in every top section whose tag it carries", () => {
    const groups = group([{ id: "multi", tags: ["initiative", "user-request"] }])
    expect(ids(groups, "initiatives")).toEqual(["multi"])
    expect(ids(groups, "userRequests")).toEqual(["multi"])
    expect(ids(groups, "recent")).toBeUndefined()
  })

  test("sends sessions carrying none of the section tags to recent sessions", () => {
    const groups = group([
      { id: "untagged", tags: [] },
      { id: "other-tag", tags: ["research"] },
      { id: "initiative", tags: ["initiative"] },
    ])
    expect(ids(groups, "recent")).toEqual(["untagged", "other-tag"])
    expect(ids(groups, "initiatives")).toEqual(["initiative"])
  })

  test("terminal-tagged sessions appear only in their terminal sections", () => {
    const groups = group([
      { id: "done-initiative", tags: ["done", "initiative"] },
      { id: "abandoned-harness", tags: ["abandoned", "harness"] },
    ])
    expect(groups.map((group) => group.id)).toEqual(["abandoned", "done"])
    expect(ids(groups, "abandoned")).toEqual(["abandoned-harness"])
    expect(ids(groups, "done")).toEqual(["done-initiative"])
  })

  test("terminal tags still win over namespaced initiative tags", () => {
    const groups = group([
      { id: "done-namespaced", tags: ["done", "Initiative:PlanetScale"] },
      { id: "abandoned-namespaced", tags: ["abandoned", "initiative:x"] },
    ])
    expect(groups.map((group) => group.id)).toEqual(["abandoned", "done"])
    expect(ids(groups, "abandoned")).toEqual(["abandoned-namespaced"])
    expect(ids(groups, "done")).toEqual(["done-namespaced"])
    expect(ids(groups, "initiatives")).toBeUndefined()
  })

  test("a session with both terminal tags appears in both terminal sections", () => {
    const groups = group([{ id: "both", tags: ["done", "abandoned"] }])
    expect(ids(groups, "abandoned")).toEqual(["both"])
    expect(ids(groups, "done")).toEqual(["both"])
  })

  test("hides empty sections", () => {
    const groups = group([
      { id: "done", tags: ["done"] },
      { id: "recent", tags: [] },
    ])
    expect(groups.map((group) => group.id)).toEqual(["recent", "done"])
  })

  test("preserves input order within sections", () => {
    const groups = group([
      { id: "first", tags: ["initiative"] },
      { id: "second", tags: ["initiative"] },
      { id: "third", tags: [] },
      { id: "fourth", tags: ["done"] },
      { id: "fifth", tags: ["done"] },
    ])
    expect(ids(groups, "initiatives")).toEqual(["first", "second"])
    expect(ids(groups, "recent")).toEqual(["third"])
    expect(ids(groups, "done")).toEqual(["fourth", "fifth"])
  })
})

describe("groupHomeSessions label sections", () => {
  const sections: HomeSectionDef[] = [
    { id: "label:q4", title: "Q4", tags: ["q4"] },
    { id: "label:q4-planning", title: "Q4 planning", tags: ["Q4", "Planning"] },
  ]

  test("emits label sections after the fixed top sections and before recent, in input order", () => {
    const groups = group(
      [
        { id: "initiative", tags: ["initiative"] },
        { id: "q4", tags: ["q4"] },
        { id: "plain", tags: [] },
        { id: "done", tags: ["done"] },
      ],
      sections,
    )
    expect(groups.map((group) => group.id)).toEqual([
      "initiatives",
      "label:q4",
      "label:q4-planning",
      "recent",
      "done",
    ])
    expect(groups.find((group) => group.id === "label:q4")).toMatchObject({ title: "Q4", kind: "label" })
    expect(groups.filter((group) => group.kind === "fixed").map((group) => group.id)).toEqual([
      "initiatives",
      "recent",
      "done",
    ])
  })

  test("matches label sections by AND of their tags, case-insensitively", () => {
    const groups = group(
      [
        { id: "both", tags: ["Q4", "planning"] },
        { id: "one", tags: ["q4"] },
      ],
      sections,
    )
    expect(ids(groups, "label:q4")).toEqual(["both", "one"])
    expect(ids(groups, "label:q4-planning")).toEqual(["both"])
  })

  test("a session joins every matching label section and still shows in its fixed top section", () => {
    const groups = group([{ id: "multi", tags: ["initiative", "q4", "planning"] }], sections)
    expect(ids(groups, "initiatives")).toEqual(["multi"])
    expect(ids(groups, "label:q4")).toEqual(["multi"])
    expect(ids(groups, "label:q4-planning")).toEqual(["multi"])
    expect(ids(groups, "recent")).toBeUndefined()
  })

  test("recent excludes sessions matched by a label section", () => {
    const groups = group(
      [
        { id: "sectioned", tags: ["q4"] },
        { id: "plain", tags: ["research"] },
      ],
      sections,
    )
    expect(ids(groups, "recent")).toEqual(["plain"])
    expect(ids(groups, "label:q4")).toEqual(["sectioned"])
  })

  test("terminal sessions never join label sections", () => {
    const groups = group(
      [
        { id: "done-q4", tags: ["done", "q4", "planning"] },
        { id: "abandoned-q4", tags: ["abandoned", "q4"] },
      ],
      sections,
    )
    expect(groups.map((group) => group.id)).toEqual(["label:q4", "label:q4-planning", "abandoned", "done"])
    expect(ids(groups, "label:q4")).toEqual([])
    expect(ids(groups, "abandoned")).toEqual(["abandoned-q4"])
    expect(ids(groups, "done")).toEqual(["done-q4"])
  })

  test("emits label sections even when empty", () => {
    const groups = group([{ id: "plain", tags: [] }], sections)
    expect(groups.map((group) => group.id)).toEqual(["label:q4", "label:q4-planning", "recent"])
    expect(ids(groups, "label:q4")).toEqual([])
    expect(ids(groups, "label:q4-planning")).toEqual([])
  })
})
