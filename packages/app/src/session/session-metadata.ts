import { createMemo, onCleanup } from "solid-js"
import type { SessionInfo, SessionMetadata } from "@opencode/client/promise"
import type { Data } from "@opencode/client/solid"
import type { ServerApi } from "@/runtime/server/api"
import type { OpenCodeEventStream } from "@/runtime/server/client"
import { formatServerError } from "@/runtime/server/errors"
import { showToast } from "@/shell/notifications/toast"
import { normalizeSessionTags, sessionTagsFromMetadata, sessionTagsMerge } from "./session-tags"
import { sessionNoteMerge } from "./session-note"

type Translate = (key: string, vars?: Record<string, string | number>) => string

// Session tags and notes live in the session's server-side metadata record.
export function createSessionMetadata(input: {
  api: ServerApi
  event: OpenCodeEventStream
  data: Data
  translate: Translate
}) {
  // The client store has no case for session.metadata.updated, so patch the
  // synced record here through the rename pattern (data.session.remember) —
  // home rows and headers repaint on external writes without a reload.
  const unsubscribe = input.event.on("session.metadata.updated", (event) => {
    const current = input.data.session.get(event.data.sessionID)
    if (current) {
      input.data.session.remember({ ...current, metadata: event.data.metadata })
      return
    }
    // Home index rows are usually not synced into the store; fetch the record
    // (post-event state) so external writes repaint those rows too.
    void input.api.session
      .get({ sessionID: event.data.sessionID })
      .then((info) => input.data.session.remember(info))
      .catch(() => {})
  })
  onCleanup(unsubscribe)

  // PATCH /api/session replaces the whole metadata record, so every write
  // serializes per session and merges its key into a fresh server read,
  // keeping keys it does not own (opencode.acp.*, plugin keys). Tags and note
  // writes share one chain per session. A failed read or write aborts with a
  // toast instead of falling back to stale state.
  const writes = new Map<string, Promise<unknown>>()
  const write = (session: SessionInfo, merge: (fresh: SessionInfo) => SessionMetadata, titleKey: string) => {
    const next: Promise<boolean> = (writes.get(session.id) ?? Promise.resolve())
      .then(async () => {
        const fresh = await input.api.session.get({ sessionID: session.id })
        const metadata = merge(fresh)
        await input.api.session.update({ sessionID: session.id, metadata })
        // Home index rows merge the live store over the fetched index, so land
        // the write locally at once — the session may not be synced yet.
        input.data.session.remember({ ...fresh, metadata })
        return true
      })
      .catch((error: unknown) => {
        showToast({
          variant: "error",
          title: input.translate(titleKey),
          description: formatServerError(error, input.translate),
        })
        return false
      })
    writes.set(session.id, next)
    return next
  }

  return {
    tags: {
      // Live view of the synced session cache; callers displaying a session
      // object should prefer it as a fallback.
      session: (sessionID: string) => input.data.session.get(sessionID),
      // Every tag across the sessions this client has listed or opened, for
      // editor suggestions; first spelling wins.
      all: createMemo(() => {
        const seen = new Map<string, string>()
        for (const session of input.data.session.list()) {
          for (const tag of sessionTagsFromMetadata(session)) {
            const key = tag.toLowerCase()
            if (!seen.has(key)) seen.set(key, tag)
          }
        }
        return [...seen.values()].sort((a, b) => a.localeCompare(b))
      }),
      setTags: (session: SessionInfo, update: (current: string[]) => string[]) =>
        write(
          session,
          (fresh) => sessionTagsMerge(fresh.metadata, normalizeSessionTags(update(sessionTagsFromMetadata(fresh)))),
          "toast.session.tags.updateFailed.title",
        ),
    },
    note: {
      session: (sessionID: string) => input.data.session.get(sessionID),
      // Resolves whether the write landed so the editor dialog can keep the
      // draft open on failure; the chain itself always resolves.
      setNote: (session: SessionInfo, text: string) =>
        write(session, (fresh) => sessionNoteMerge(fresh.metadata, text), "toast.session.note.updateFailed.title"),
    },
  }
}

export type SessionMetadataController = ReturnType<typeof createSessionMetadata>
