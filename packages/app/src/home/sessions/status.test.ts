import { describe, expect, test } from "bun:test"
import { countHomeSessionBadges, resolveHomeSessionBadge, type HomeSessionBadge, type HomeSessionBadgeInput } from "./status"

describe("resolveHomeSessionBadge", () => {
  const cases: [HomeSessionBadgeInput, HomeSessionBadge][] = [
    [{ needsAttention: true, working: true, unseen: true }, "waiting"],
    [{ needsAttention: true, working: true, unseen: false }, "waiting"],
    [{ needsAttention: true, working: false, unseen: true }, "waiting"],
    [{ needsAttention: true, working: false, unseen: false }, "waiting"],
    [{ needsAttention: false, working: true, unseen: true }, "running"],
    [{ needsAttention: false, working: true, unseen: false }, "running"],
    [{ needsAttention: false, working: false, unseen: true }, "waiting"],
    [{ needsAttention: false, working: false, unseen: false }, "none"],
  ]
  for (const [input, badge] of cases) {
    test(`needsAttention=${input.needsAttention} working=${input.working} unseen=${input.unseen} is ${badge}`, () => {
      expect(resolveHomeSessionBadge(input)).toBe(badge)
    })
  }
})

describe("countHomeSessionBadges", () => {
  test("counts waiting and running badges", () => {
    expect(countHomeSessionBadges(["waiting", "running", "waiting", "none", "running"])).toEqual({
      waiting: 2,
      running: 2,
    })
  })

  test("returns zeros when nothing needs a badge", () => {
    expect(countHomeSessionBadges(["none", "none"])).toEqual({ waiting: 0, running: 0 })
    expect(countHomeSessionBadges([])).toEqual({ waiting: 0, running: 0 })
  })
})
