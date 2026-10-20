import { describe, expect, test } from "bun:test"
import { groupHomeSessions, type FixedGroupId, type HomeSectionDef, type HomeSessionGroupId } from "./home-session-groups"

const titles: Record<FixedGroupId, string> = {
  initiatives: "Initiatives",
  userRequests: "User Requests",
  recent: "Recent sessions",
}

type Fixture = { id: string; tags: string[] }
type Visibility = Partial<Record<HomeSessionGroupId, Partial<Record<"done" | "abandoned", boolean>>>>

function group(records: Fixture[], sections: HomeSectionDef[] = [], visibility: Visibility = {}) {
  return groupHomeSessions(records, {
    tags: (record) => record.tags,
    titles,
    sections,
    visibility: (id) => ({ done: false, abandoned: false, ...visibility[id] }),
  })
}

function ids(groups: ReturnType<typeof group>, id: HomeSessionGroupId) {
  return groups.find((group) => group.id === id)?.sessions.map((session) => session.id)
}

describe("groupHomeSessions", () => {
  test("routes section tags into their sections in fixed order", () => {
    const groups = group([
      { id: "harness", tags: ["Harness"] },
      { id: "recent", tags: [] },
      { id: "initiative", tags: ["Initiative"] },
      { id: "user-request", tags: ["User-Request"] },
    ])
    expect(groups.map((group) => group.id)).toEqual(["initiatives", "userRequests", "recent"])
    expect(groups.map((group) => group.title)).toEqual(["Initiatives", "User Requests", "Recent sessions"])
    expect(ids(groups, "initiatives")).toEqual(["initiative"])
    expect(ids(groups, "userRequests")).toEqual(["user-request"])
    expect(ids(groups, "recent")).toEqual(["harness", "recent"])
  })

  test("matches section tags case-insensitively but not by substring", () => {
    const groups = group([
      { id: "a", tags: ["INITIATIVE"] },
      { id: "b", tags: ["user-Request"] },
      { id: "c", tags: ["hArNeSs"] },
      { id: "d", tags: ["user-requested"] },
    ])
    expect(ids(groups, "initiatives")).toEqual(["a"])
    expect(ids(groups, "userRequests")).toEqual(["b"])
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

  test("hides empty sections", () => {
    const groups = group([
      { id: "hidden", tags: ["done"] },
      { id: "recent", tags: [] },
    ])
    expect(groups.map((group) => group.id)).toEqual(["recent"])
    expect(ids(groups, "recent")).toEqual(["recent"])
  })

  test("preserves input order within sections", () => {
    const groups = group([
      { id: "first", tags: ["initiative"] },
      { id: "second", tags: ["initiative"] },
      { id: "third", tags: [] },
    ])
    expect(ids(groups, "initiatives")).toEqual(["first", "second"])
    expect(ids(groups, "recent")).toEqual(["third"])
  })
})

describe("groupHomeSessions terminal visibility", () => {
  test("terminal-tagged sessions stay members of their sections, hidden by default", () => {
    const groups = group([
      { id: "done-initiative", tags: ["done", "initiative"] },
      { id: "plain-initiative", tags: ["initiative"] },
    ])
    expect(ids(groups, "initiatives")).toEqual(["plain-initiative"])
  })

  test("a section's done toggle reveals its done sessions in place", () => {
    const groups = group(
      [
        { id: "done-initiative", tags: ["done", "initiative"] },
        { id: "plain-initiative", tags: ["initiative"] },
      ],
      [],
      { initiatives: { done: true } },
    )
    expect(ids(groups, "initiatives")).toEqual(["done-initiative", "plain-initiative"])
  })

  test("a fixed section whose members are all hidden disappears entirely", () => {
    const groups = group([
      { id: "done-initiative", tags: ["done", "initiative"] },
      { id: "recent", tags: [] },
    ])
    expect(groups.map((group) => group.id)).toEqual(["recent"])
  })

  test("a session carrying both terminal tags appears when either toggle is on", () => {
    const record = { id: "both", tags: ["done", "abandoned"] }
    expect(ids(group([record], [], { recent: { done: true } }), "recent")).toEqual(["both"])
    expect(ids(group([record], [], { recent: { abandoned: true } }), "recent")).toEqual(["both"])
    expect(ids(group([record]), "recent")).toBeUndefined()
  })

  test("toggles are independent per section", () => {
    const records = [
      { id: "done-multi", tags: ["done", "initiative", "user-request"] },
      { id: "plain-multi", tags: ["initiative", "user-request"] },
    ]
    const groups = group(records, [], { initiatives: { done: true } })
    expect(ids(groups, "initiatives")).toEqual(["done-multi", "plain-multi"])
    expect(ids(groups, "userRequests")).toEqual(["plain-multi"])
  })

  test("an abandoned session with no other matching tags is a hidden recent member", () => {
    const record = { id: "abandoned", tags: ["abandoned"] }
    expect(ids(group([record]), "recent")).toBeUndefined()
    expect(ids(group([record], [], { recent: { abandoned: true } }), "recent")).toEqual(["abandoned"])
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
    expect(groups.map((group) => group.id)).toEqual(["initiatives", "label:q4", "label:q4-planning", "recent"])
    expect(groups.find((group) => group.id === "label:q4")).toMatchObject({ title: "Q4", kind: "label" })
    expect(groups.filter((group) => group.kind === "fixed").map((group) => group.id)).toEqual([
      "initiatives",
      "recent",
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

  test("terminal sessions join label sections, hidden until that section's toggle is on", () => {
    const records = [
      { id: "done-q4", tags: ["done", "q4", "planning"] },
      { id: "abandoned-q4", tags: ["abandoned", "q4"] },
    ]
    const hidden = group(records, sections)
    expect(ids(hidden, "label:q4")).toEqual([])
    expect(ids(hidden, "label:q4-planning")).toEqual([])
    expect(ids(hidden, "recent")).toBeUndefined()
    const shown = group(records, sections, { "label:q4": { done: true, abandoned: true } })
    expect(ids(shown, "label:q4")).toEqual(["done-q4", "abandoned-q4"])
    expect(ids(shown, "label:q4-planning")).toEqual([])
  })

  test("a terminal session matched by a label section is not a recent member", () => {
    const groups = group([{ id: "done-q4", tags: ["done", "q4"] }], sections, { recent: { done: true } })
    expect(ids(groups, "recent")).toBeUndefined()
  })

  test("emits label sections even when empty", () => {
    const groups = group([{ id: "plain", tags: [] }], sections)
    expect(groups.map((group) => group.id)).toEqual(["label:q4", "label:q4-planning", "recent"])
    expect(ids(groups, "label:q4")).toEqual([])
    expect(ids(groups, "label:q4-planning")).toEqual([])
  })
})
