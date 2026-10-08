import { createSimpleContext } from "@opencode-ai/ui/context"
import { createMemo, createResource } from "solid-js"
import { useQuery } from "@tanstack/solid-query"
import { getFilename } from "@opencode-ai/core/util/path"
import type { InitiativeListResponse, Session } from "@opencode-ai/sdk/v2/client"
import {
  loadHomeSessionIndex,
  retainHomeSessions,
  type HomeSessionEvents,
  type HomeSessionIndex,
} from "@/context/global-sync/home-session-index"
import { useGlobal } from "@/context/global"
import { useLanguage } from "@/context/language"
import { useServer } from "@/context/server"
import { preferLiveSession } from "@/pages/home/home-live-sessions"
import { compareSessionTime, displayName, projectForSession } from "@/pages/layout/helpers"
import { formatServerError } from "@/utils/server-errors"
import { isInitiativeMember } from "@/utils/session-tags"
import { showToast } from "@/utils/toast"

export type InitiativeInfo = InitiativeListResponse[number]

export type InitiativeSession = {
  session: Session
  projectName: string
}

export const { use: useInitiatives, provider: InitiativesProvider } = createSimpleContext({
  name: "Initiatives",
  init: () => {
    const global = useGlobal()
    const server = useServer()
    const language = useLanguage()
    const ctx = () => {
      const conn = server.current
      if (!conn) return undefined
      return global.ensureServerCtx(conn)
    }

    const [initiativeList, { refetch }] = createResource(
      ctx,
      async (c): Promise<InitiativeInfo[]> => {
        const result = await c.sdk.client.initiative.list()
        return result.data ?? []
      },
      { initialValue: [] },
    )

    // Membership comes from the home-session index overlaid with the live sync
    // store, mirroring home-sessions-controller: the index holds the full
    // history (loaded here because a space page can open without home), the
    // store covers tag edits seen this run. refetchOnMount must be "always":
    // this provider resolves the outer QueryClient, where SessionTagsProvider's
    // sibling subscription has already written fresh initialData to this key,
    // and `true` never refetches while that data is within staleTime.
    const indexLoad = useQuery(() => ({
      queryKey: ctx()?.sync.homeSessions.indexKey ?? ["home", "session-index", "none"],
      queryFn: async ({ signal }): Promise<HomeSessionIndex> => {
        const c = ctx()
        if (!c) return { sessions: [], eventSequence: 0 }
        const cache = c.sync.homeSessions
        const eventSequence = cache.eventSequence()
        const index = await loadHomeSessionIndex(
          (input, options) => c.sdk.client.v2.session.list(input, options),
          eventSequence,
          signal,
        )
        cache.complete(eventSequence)
        return index
      },
      retry: false,
      staleTime: 30_000,
      refetchOnMount: "always",
      refetchOnReconnect: true,
    }))
    const eventLoad = useQuery(() => ({
      queryKey: ctx()?.sync.homeSessions.eventsKey ?? ["home", "session-events", "none"],
      queryFn: async (): Promise<HomeSessionEvents> => ({ sequence: 0, entries: [] }),
      initialData: { sequence: 0, entries: [] } satisfies HomeSessionEvents,
      enabled: false,
    }))

    // Counts span the whole history, so unlike home there is no recency trim.
    const sessions = createMemo(() => {
      const c = ctx()
      if (!c) return [] as Session[]
      return retainHomeSessions(
        c.sync.homeSessions.sessions(indexLoad.data, eventLoad.data),
        Number.MAX_SAFE_INTEGER,
        Date.now(),
      ).map((record) => preferLiveSession(record, c.sync.session.data.info[record.id]))
    })

    const counts = createMemo(() => {
      const map = new Map<string, number>()
      const all = sessions()
      for (const initiative of initiativeList()) {
        let count = 0
        for (const session of all) {
          if (isInitiativeMember(session, initiative.name)) count++
        }
        map.set(initiative.id, count)
      }
      return map
    })

    const memberSessions = (initiative: InitiativeInfo): InitiativeSession[] => {
      const projects = ctx()?.projects.list() ?? []
      const byID = new Map(projects.flatMap((project) => (project.id ? [[project.id, project] as const] : [])))
      return sessions()
        .filter((session) => isInitiativeMember(session, initiative.name))
        .sort(compareSessionTime)
        .map((session) => {
          const project = projectForSession(session, projects, byID)
          return {
            session,
            projectName: project ? displayName(project) : getFilename(session.directory) || session.directory,
          }
        })
    }

    const create = async (name: string) => {
      const c = ctx()
      if (!c) return undefined
      const clean = name.trim()
      if (!clean) return undefined
      const initiative = await c.sdk.client.initiative
        .create({ name: clean })
        .then((result) => result.data)
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            title: language.t("toast.session.initiatives.updateFailed.title"),
            description: formatServerError(error, language.t),
          })
          return undefined
        })
      if (!initiative) return undefined
      await refetch()
      return initiative
    }

    const remove = async (id: string) => {
      const c = ctx()
      if (!c) return
      const removed = await c.sdk.client.initiative
        .remove({ initiativeID: id })
        .then(() => true)
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            title: language.t("toast.session.initiatives.updateFailed.title"),
            description: formatServerError(error, language.t),
          })
          return false
        })
      if (!removed) return
      await refetch()
    }

    return {
      list: () => initiativeList(),
      // Gate on the index fetch too: the shared key can hold a sibling's empty
      // initialData while the first real load is still in flight, and showing
      // the page then would flash an empty member list.
      loading: () => initiativeList.loading || indexLoad.isFetching,
      counts,
      memberSessions,
      create,
      remove,
    }
  },
})
