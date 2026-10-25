import { describe, expect, test } from "bun:test"
import { activeStatusFilters, HOME_SESSION_FILTER_TAGS, sessionMatchesLabel, statusFilterMatches } from "./filter"

describe("sessionMatchesLabel", () => {
  test("an empty label matches every session", () => {
    expect(sessionMatchesLabel([], [])).toBe(true)
    expect(sessionMatchesLabel(["q4"], [])).toBe(true)
  })

  test("matches when the session carries every label tag, case-insensitively", () => {
    expect(sessionMatchesLabel(["Q4", "PLANNING"], ["q4", "Planning"])).toBe(true)
    expect(sessionMatchesLabel(["q4", "extra"], ["Q4"])).toBe(true)
  })

  test("rejects when any label tag is missing", () => {
    expect(sessionMatchesLabel(["q4"], ["q4", "planning"])).toBe(false)
    expect(sessionMatchesLabel([], ["q4"])).toBe(false)
  })

  test("does not match by substring", () => {
    expect(sessionMatchesLabel(["user-requested"], ["user-request"])).toBe(false)
  })
})

describe("activeStatusFilters", () => {
  test("is empty when nothing is stored", () => {
    expect(activeStatusFilters({})).toEqual([])
  })

  test("lists stored tags in HOME_SESSION_FILTER_TAGS order", () => {
    expect(activeStatusFilters({ urgent: true, important: true })).toEqual([...HOME_SESSION_FILTER_TAGS])
    expect(activeStatusFilters({ urgent: true })).toEqual(["urgent"])
  })

  test("drops tags stored false and tags outside the filter set", () => {
    expect(activeStatusFilters({ important: false, urgent: true, done: true })).toEqual(["urgent"])
  })
})

describe("statusFilterMatches", () => {
  test("passes every session when no filter is active", () => {
    expect(statusFilterMatches([], [])).toBe(true)
    expect(statusFilterMatches(["research"], [])).toBe(true)
  })

  test("passes only sessions carrying every active filter tag", () => {
    expect(statusFilterMatches(["Important"], ["important"])).toBe(true)
    expect(statusFilterMatches(["urgent"], ["important"])).toBe(false)
    expect(statusFilterMatches(["important", "urgent"], ["important", "urgent"])).toBe(true)
    expect(statusFilterMatches(["important"], ["important", "urgent"])).toBe(false)
  })
})
