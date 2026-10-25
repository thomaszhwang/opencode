import { createResource } from "solid-js"
import type { LabelInfo } from "@opencode/client/promise"
import type { ServerApi } from "./api"
import { formatServerError } from "./errors"
import { showToast } from "@/shell/notifications/toast"
import { normalizeSessionTags } from "@/session/session-tags"

type Translate = (key: string, vars?: Record<string, string | number>) => string

// User sections are server-side labels (contracts §2); the server lists them
// in creation order. The resource source keys on the connection so a reconnect
// refetches.
export function createServerLabels(input: { api: ServerApi; connected: () => boolean; translate: Translate }) {
  const [list, { refetch }] = createResource(
    () => input.connected(),
    async (connected): Promise<LabelInfo[]> => {
      if (!connected) return []
      return input.api.label.list()
    },
    { initialValue: [] },
  )

  const failed = (error: unknown) =>
    showToast({
      variant: "error",
      title: input.translate("common.requestFailed"),
      description: formatServerError(error, input.translate),
    })

  return {
    // Reads never suspend: sections and dialogs render the last known list
    // while the first fetch is in flight.
    list: () => (list.state === "ready" || list.state === "refreshing" ? (list.latest ?? []) : []),
    create: async (name: string, tags: string[]) => {
      const clean = name.trim()
      if (!clean) return undefined
      const label = await input.api.label
        .create({ name: clean, tags: normalizeSessionTags(tags) })
        .catch((error: unknown) => {
          failed(error)
          return undefined
        })
      if (!label) return undefined
      await refetch()
      return label
    },
    remove: async (id: string) => {
      const removed = await input.api.label
        .remove({ labelID: id })
        .then(() => true)
        .catch((error: unknown) => {
          failed(error)
          return false
        })
      if (!removed) return
      await refetch()
    },
  }
}

export type ServerLabels = ReturnType<typeof createServerLabels>
