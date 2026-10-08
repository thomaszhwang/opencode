import type { Session } from "@opencode-ai/sdk/v2/client"

export function normalizeSessionTags(input: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of input) {
    const tag = value.trim().replace(/\s+/g, " ")
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

export function sessionMatchesLabel(sessionTags: string[], labelTags: string[]): boolean {
  if (labelTags.length === 0) return true
  const have = new Set(sessionTags.map((tag) => tag.toLowerCase()))
  return labelTags.every((tag) => have.has(tag.toLowerCase()))
}

export function toggleSessionTag(tags: string[], tag: string): string[] {
  const key = tag.toLowerCase()
  if (tags.some((value) => value.toLowerCase() === key)) {
    return normalizeSessionTags(tags.filter((value) => value.toLowerCase() !== key))
  }
  return normalizeSessionTags([...tags, key])
}

// Session tags are stored server-side in the session's metadata record and
// reach the app through the synced session info cache.
export function sessionTagsFromMetadata(session: Session | undefined): string[] {
  const raw = session?.metadata?.["tags"]
  if (!Array.isArray(raw)) return []
  return normalizeSessionTags(raw.filter((tag): tag is string => typeof tag === "string"))
}
