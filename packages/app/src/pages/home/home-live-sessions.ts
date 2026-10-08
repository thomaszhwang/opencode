import type { Session } from "@opencode-ai/sdk/v2/client"

// The home-session index cache lives in a different QueryClient than the one
// session.updated SSE events write to, so index records stay stale until
// reload. The synced per-session store is live by construction: prefer its
// copy whenever it is strictly newer, otherwise keep the index record (the
// store only holds sessions opened or event-seen this run). Same rule as
// DialogSessionTags.
export function preferLiveSession(record: Session, live: Session | undefined): Session {
  if (live && live.time.updated > record.time.updated) return live
  return record
}
