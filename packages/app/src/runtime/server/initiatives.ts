import { createResource } from "solid-js"
import type { InitiativeInfo } from "@opencode/client/promise"
import type { ServerApi } from "./api"
import { formatServerError } from "./errors"
import { showToast } from "@/shell/notifications/toast"

type Translate = (key: string, vars?: Record<string, string | number>) => string

// Initiatives are server-side entities (contracts §2). Session membership and
// chip counts derive from the home session index in the home controller; this
// controller owns only the entity list and its mutations.
export function createServerInitiatives(input: { api: ServerApi; connected: () => boolean; translate: Translate }) {
  const [list, { refetch }] = createResource(
    () => input.connected(),
    async (connected): Promise<InitiativeInfo[]> => {
      if (!connected) return []
      return input.api.initiative.list()
    },
    { initialValue: [] },
  )

  const failed = (error: unknown) =>
    showToast({
      variant: "error",
      title: input.translate("toast.session.initiatives.updateFailed.title"),
      description: formatServerError(error, input.translate),
    })

  return {
    list: () => (list.state === "ready" || list.state === "refreshing" ? (list.latest ?? []) : []),
    // False until the first fetch resolves, so a space page can wait before declaring an id unknown.
    ready: () => list.state === "ready" || list.state === "refreshing",
    create: async (name: string) => {
      const clean = name.trim()
      if (!clean) return undefined
      const initiative = await input.api.initiative.create({ name: clean }).catch((error: unknown) => {
        failed(error)
        return undefined
      })
      if (!initiative) return undefined
      await refetch()
      return initiative
    },
    remove: async (id: string) => {
      const removed = await input.api.initiative
        .remove({ initiativeID: id })
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

export type ServerInitiatives = ReturnType<typeof createServerInitiatives>
