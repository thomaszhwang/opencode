import { createSimpleContext } from "@opencode-ai/ui/context"
import { createMemo, createResource, createSignal } from "solid-js"
import { useQuery } from "@tanstack/solid-query"
import type { Session } from "@opencode-ai/sdk/v2/client"
import type { HomeSessionEvents, HomeSessionIndex } from "@/context/global-sync/home-session-index"
import { useGlobal } from "@/context/global"
import { useLanguage } from "@/context/language"
import { useServer } from "@/context/server"
import { formatServerError } from "@/utils/server-errors"
import { showToast } from "@/utils/toast"
import { normalizeSessionTags, sessionTagsFromMetadata, type SessionLabel } from "@/utils/session-tags"

// The pure helpers live in @/utils/session-tags (no UI deps) so they stay
// unit-testable; re-exported here for the feature's call sites.
export {
  normalizeSessionTags,
  sessionMatchesLabel,
  sessionTagsFromMetadata,
  type SessionLabel,
} from "@/utils/session-tags"

export const { use: useSessionTags, provider: SessionTagsProvider } = createSimpleContext({
  name: "SessionTags",
  init: () => {
    const global = useGlobal()
    const server = useServer()
    const language = useLanguage()
    const ctx = () => {
      const conn = server.current
      if (!conn) return undefined
      return global.ensureServerCtx(conn)
    }
    const [activeID, setActiveID] = createSignal<string | null>(null)

    // Live view of the synced per-server session cache. Note it only contains
    // sessions the app has loaded or seen events for; callers displaying a
    // session object should prefer it as a fallback (see DialogSessionTags).
    const session = (sessionID: string) => ctx()?.sync.session.data.info[sessionID]

    // Writes are serialized per session and each recomputes the tag list from
    // a fresh server read, so rapid edits and stale UI state never clobber
    // each other or other metadata keys. A failed read or write aborts with a
    // toast instead of falling back to stale state.
    const writes = new Map<string, Promise<void>>()
    const setTags = (session: Session, update: (current: string[]) => string[]) => {
      const c = ctx()
      if (!c) return Promise.resolve()
      const write = (writes.get(session.id) ?? Promise.resolve())
        .then(async () => {
          const fresh = await c.sdk.client.session
            .get({ sessionID: session.id, directory: session.directory })
            .then((result) => result.data)
          if (!fresh) return
          const clean = normalizeSessionTags(update(sessionTagsFromMetadata(fresh)))
          const metadata = { ...(fresh.metadata as Record<string, unknown> | undefined) }
          if (clean.length === 0) delete metadata["tags"]
          else metadata["tags"] = clean
          await c.sdk.client.session.update({ sessionID: session.id, directory: session.directory, metadata })
        })
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            title: language.t("toast.session.tags.updateFailed.title"),
            description: formatServerError(error, language.t),
          })
        })
      writes.set(session.id, write)
      return write
    }

    // Subscribe to the home session index caches without triggering fetches so
    // tag suggestions also cover sessions only the home page has listed; the
    // synced cache alone holds just sessions opened or updated this run.
    const homeIndex = useQuery(() => ({
      queryKey: ctx()?.sync.homeSessions.indexKey ?? ["home", "session-index", "none"],
      queryFn: async (): Promise<HomeSessionIndex> => ({ sessions: [], eventSequence: 0 }),
      initialData: { sessions: [], eventSequence: 0 } satisfies HomeSessionIndex,
      enabled: false,
    }))
    const homeEvents = useQuery(() => ({
      queryKey: ctx()?.sync.homeSessions.eventsKey ?? ["home", "session-events", "none"],
      queryFn: async (): Promise<HomeSessionEvents> => ({ sequence: 0, entries: [] }),
      initialData: { sequence: 0, entries: [] } satisfies HomeSessionEvents,
      enabled: false,
    }))

    const all = createMemo(() => {
      const c = ctx()
      if (!c) return [] as string[]
      const seen = new Map<string, string>()
      const sessions = [
        ...Object.values(c.sync.session.data.info),
        ...c.sync.homeSessions.sessions(homeIndex.data, homeEvents.data),
      ]
      for (const item of sessions) {
        for (const tag of sessionTagsFromMetadata(item)) {
          const key = tag.toLowerCase()
          if (!seen.has(key)) seen.set(key, tag)
        }
      }
      return [...seen.values()].sort((a, b) => a.localeCompare(b))
    })

    const [labelList, { refetch: refetchLabels }] = createResource(
      ctx,
      async (c): Promise<SessionLabel[]> => {
        const result = await c.sdk.client.label.list()
        return result.data ?? []
      },
      { initialValue: [] },
    )

    const active = createMemo<SessionLabel | null>(() => labelList().find((label) => label.id === activeID()) ?? null)

    const createLabel = async (name: string, tags: string[]) => {
      const c = ctx()
      if (!c) return undefined
      const cleanName = name.trim()
      const cleanTags = normalizeSessionTags(tags)
      if (!cleanName || cleanTags.length === 0) return undefined
      const label = await c.sdk.client.label
        .create({ name: cleanName, tags: cleanTags })
        .then((result) => result.data)
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            title: language.t("toast.session.labels.updateFailed.title"),
            description: formatServerError(error, language.t),
          })
          return undefined
        })
      if (!label) return undefined
      await refetchLabels()
      return label
    }

    const removeLabel = async (id: string) => {
      const c = ctx()
      if (!c) return
      const removed = await c.sdk.client.label
        .remove({ labelID: id })
        .then(() => true)
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            title: language.t("toast.session.labels.updateFailed.title"),
            description: formatServerError(error, language.t),
          })
          return false
        })
      if (!removed) return
      if (activeID() === id) setActiveID(null)
      await refetchLabels()
    }

    return {
      session,
      setTags,
      all,
      labels: () => labelList(),
      active,
      select: setActiveID,
      createLabel,
      removeLabel,
    }
  },
})
