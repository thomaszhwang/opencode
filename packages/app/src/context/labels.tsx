import { createSimpleContext } from "@opencode-ai/ui/context"
import { useQuery } from "@tanstack/solid-query"
import type { LabelListResponse } from "@opencode-ai/sdk/v2/client"
import { useGlobal } from "@/context/global"
import { useLanguage } from "@/context/language"
import { ServerConnection, useServer } from "@/context/server"
import { normalizeSessionTags } from "@/utils/session-tags"
import { formatServerError } from "@/utils/server-errors"
import { showToast } from "@/utils/toast"

export type LabelInfo = LabelListResponse[number]

export const { use: useLabels, provider: LabelsProvider } = createSimpleContext({
  name: "Labels",
  init: () => {
    const global = useGlobal()
    const server = useServer()
    const language = useLanguage()
    const ctx = () => {
      const conn = server.current
      if (!conn) return undefined
      return global.ensureServerCtx(conn)
    }

    // This provider mounts above ServerShell, so the query resolves the outer
    // QueryClient; refetchOnMount must be "always" to escape the fresh
    // initialData trap documented in query-client-layout.md.
    const list = useQuery(() => {
      const conn = server.current
      return {
        queryKey: ["labels", conn ? ServerConnection.key(conn) : "none"],
        queryFn: async (): Promise<LabelInfo[]> => {
          const c = ctx()
          if (!c) return []
          const result = await c.sdk.client.label.list()
          return result.data ?? []
        },
        enabled: !!conn,
        retry: false,
        refetchOnMount: "always",
        refetchOnReconnect: true,
      }
    })

    const failed = (error: unknown) =>
      showToast({
        variant: "error",
        title: language.t("common.requestFailed"),
        description: formatServerError(error, language.t),
      })

    const create = async (name: string, tags: string[]) => {
      const c = ctx()
      if (!c) return undefined
      const clean = name.trim()
      if (!clean) return undefined
      const label = await c.sdk.client.label
        .create({ name: clean, tags: normalizeSessionTags(tags) })
        .then((result) => result.data)
        .catch((error: unknown) => {
          failed(error)
          return undefined
        })
      if (!label) return undefined
      await list.refetch()
      return label
    }

    const remove = async (id: string) => {
      const c = ctx()
      if (!c) return
      const removed = await c.sdk.client.label
        .remove({ labelID: id })
        .then(() => true)
        .catch((error: unknown) => {
          failed(error)
          return false
        })
      if (!removed) return
      await list.refetch()
    }

    // The server lists labels by time_created ascending, i.e. creation order.
    return {
      list: () => list.data ?? [],
      create,
      remove,
    }
  },
})
