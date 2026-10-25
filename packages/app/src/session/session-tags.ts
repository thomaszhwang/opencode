import type { SessionInfo, SessionMetadata } from "@opencode/client/promise"

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

// Initiative membership is the `Initiative:<Name>` tag, matched case-insensitively.
export function isInitiativeMember(session: SessionInfo, name: string) {
  const target = `initiative:${name.toLowerCase()}`
  return sessionTagsFromMetadata(session).some((tag) => tag.toLowerCase() === target)
}

// Session tags are stored server-side in the session's metadata record and
// reach the app through the synced session info cache.
export function sessionTagsFromMetadata(session: SessionInfo | undefined): string[] {
  const raw = session?.metadata?.["tags"]
  if (!Array.isArray(raw)) return []
  return normalizeSessionTags(raw.filter((tag): tag is string => typeof tag === "string"))
}

// Tags share the metadata record with other keys (e.g. "note"), so writes
// merge into the existing object — never wholesale-replace it. An empty list
// removes the key.
export function sessionTagsMerge(metadata: SessionMetadata | undefined, tags: string[]): SessionMetadata {
  const next = { ...metadata }
  if (tags.length === 0) {
    delete next["tags"]
    return next
  }
  next["tags"] = tags
  return next
}
