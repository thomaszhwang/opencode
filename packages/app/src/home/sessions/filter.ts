export const HOME_SESSION_FILTER_TAGS = ["important", "urgent"] as const

export function sessionMatchesLabel(sessionTags: string[], labelTags: string[]): boolean {
  if (labelTags.length === 0) return true
  const have = new Set(sessionTags.map((tag) => tag.toLowerCase()))
  return labelTags.every((tag) => have.has(tag.toLowerCase()))
}

export function activeStatusFilters(stored: Partial<Record<string, boolean>>): string[] {
  return HOME_SESSION_FILTER_TAGS.filter((tag) => stored[tag])
}

export function statusFilterMatches(sessionTags: string[], active: string[]): boolean {
  if (active.length === 0) return true
  return sessionMatchesLabel(sessionTags, active)
}
