import type { SessionInfo, SessionMetadata } from "@opencode/client/promise"

// A session note is a single markdown string stored server-side in the
// session's metadata record under the "note" key and reaches the app through
// the synced session info cache. Absent key or whitespace-only text = no note.
export function sessionNote(session: SessionInfo | undefined): string {
  const raw = session?.metadata?.["note"]
  if (typeof raw !== "string") return ""
  return raw
}

export function hasNote(session: SessionInfo | undefined): boolean {
  return sessionNote(session).trim() !== ""
}

// Notes share the metadata record with other keys (e.g. "tags"), so writes
// merge into the existing object — never wholesale-replace it. Clearing the
// text removes the key.
export function sessionNoteMerge(metadata: SessionMetadata | undefined, text: string): SessionMetadata {
  const next = { ...metadata }
  if (text.trim() === "") {
    delete next["note"]
    return next
  }
  next["note"] = text
  return next
}
