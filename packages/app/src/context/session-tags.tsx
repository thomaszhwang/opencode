import { createSimpleContext } from "@opencode-ai/ui/context"
import { createMemo, createResource, createSignal } from "solid-js"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { useGlobal } from "@/context/global"
import { useServer } from "@/context/server"

export type SessionLabel = {
  id: string
  name: string
  tags: string[]
}

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

// Session tags are stored server-side in the session's metadata record and
// reach the app through the synced session info cache.
export function sessionTagsFromMetadata(session: Session | undefined): string[] {
  const raw = session?.metadata?.["tags"]
  if (!Array.isArray(raw)) return []
  return normalizeSessionTags(raw.filter((tag): tag is string => typeof tag === "string"))
}

export const { use: useSessionTags, provider: SessionTagsProvider } = createSimpleContext({
  name: "SessionTags",
  init: () => {
    const global = useGlobal()
    const server = useServer()
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

    // Writes read-modify-write against the server so concurrent or stale local
    // state never clobbers other metadata keys or tags.
    const setTags = async (session: Session, tags: string[]) => {
      const c = ctx()
      if (!c) return
      const clean = normalizeSessionTags(tags)
      const fresh = await c.sdk.client.session
        .get({ sessionID: session.id, directory: session.directory })
        .then((result) => result.data)
        .catch(() => undefined)
      const metadata = { ...((fresh?.metadata ?? session.metadata) as Record<string, unknown> | undefined) }
      if (clean.length === 0) delete metadata["tags"]
      else metadata["tags"] = clean
      await c.sdk.client.session.update({ sessionID: session.id, directory: session.directory, metadata })
    }

    const all = createMemo(() => {
      const c = ctx()
      if (!c) return [] as string[]
      const seen = new Map<string, string>()
      for (const item of Object.values(c.sync.session.data.info)) {
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
      const result = await c.sdk.client.label.create({ name: cleanName, tags: cleanTags })
      const label = result.data
      if (!label) return undefined
      await refetchLabels()
      return label
    }

    const removeLabel = async (id: string) => {
      const c = ctx()
      if (!c) return
      await c.sdk.client.label.remove({ labelID: id })
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
