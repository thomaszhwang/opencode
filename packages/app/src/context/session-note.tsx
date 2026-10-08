import { createSimpleContext } from "@opencode-ai/ui/context"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { useGlobal } from "@/context/global"
import { useLanguage } from "@/context/language"
import { useServer } from "@/context/server"
import { formatServerError } from "@/utils/server-errors"
import { showToast } from "@/utils/toast"

// The pure helpers live in @/utils/session-note (no UI deps) so they stay
// unit-testable; re-exported here for the feature's call sites.
export { hasNote, sessionNote } from "@/utils/session-note"
import { sessionNoteMerge } from "@/utils/session-note"

export const { use: useSessionNote, provider: SessionNoteProvider } = createSimpleContext({
  name: "SessionNote",
  init: () => {
    const global = useGlobal()
    const server = useServer()
    const language = useLanguage()
    const ctx = () => {
      const conn = server.current
      if (!conn) return undefined
      return global.ensureServerCtx(conn)
    }

    // Live view of the synced per-server session cache; callers displaying a
    // session object should prefer it as a fallback (see DialogSessionNote).
    const session = (sessionID: string) => ctx()?.sync.session.data.info[sessionID]

    // Writes are serialized per session and each merges the note into the
    // metadata from a fresh server read, so rapid edits and stale UI state
    // never clobber each other or other metadata keys (e.g. tags). A failed
    // read or write aborts with a toast instead of falling back to stale state.
    // Resolves whether the write landed so callers (e.g. the editor dialog)
    // can keep the draft open on failure; the chain itself always resolves.
    const writes = new Map<string, Promise<unknown>>()
    const setNote = (session: Session, text: string): Promise<boolean> => {
      const c = ctx()
      if (!c) return Promise.resolve(false)
      const write: Promise<boolean> = (writes.get(session.id) ?? Promise.resolve())
        .then(async () => {
          const fresh = await c.sdk.client.session
            .get({ sessionID: session.id, directory: session.directory })
            .then((result) => result.data)
          if (!fresh) return false
          const metadata = sessionNoteMerge(fresh.metadata, text)
          await c.sdk.client.session.update({ sessionID: session.id, directory: session.directory, metadata })
          return true
        })
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            title: language.t("toast.session.note.updateFailed.title"),
            description: formatServerError(error, language.t),
          })
          return false
        })
      writes.set(session.id, write)
      return write
    }

    return {
      session,
      setNote,
    }
  },
})
