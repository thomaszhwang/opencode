import { createSimpleContext } from "@opencode-ai/ui/context"
import { createMemo, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { Persist, persisted } from "@/utils/persist"

export type SessionLabel = {
  id: string
  name: string
  tags: string[]
}

type SessionTagsStore = {
  tags: Record<string, string[]>
  labels: SessionLabel[]
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

export const { use: useSessionTags, provider: SessionTagsProvider } = createSimpleContext({
  name: "SessionTags",
  init: () => {
    const [store, setStore] = persisted(
      Persist.global("session-tags"),
      createStore<SessionTagsStore>({ tags: {}, labels: [] }),
    )
    const [activeID, setActiveID] = createSignal<string | null>(null)

    const tagsFor = (sessionID: string): string[] => store.tags[sessionID] ?? []

    const setTags = (sessionID: string, tags: string[]) => {
      const clean = normalizeSessionTags(tags)
      setStore("tags", (current) => {
        const next = { ...current }
        if (clean.length === 0) delete next[sessionID]
        else next[sessionID] = clean
        return next
      })
    }

    const all = createMemo(() => {
      const seen = new Map<string, string>()
      for (const tags of Object.values(store.tags)) {
        for (const tag of tags) {
          const key = tag.toLowerCase()
          if (!seen.has(key)) seen.set(key, tag)
        }
      }
      return [...seen.values()].sort((a, b) => a.localeCompare(b))
    })

    const active = createMemo<SessionLabel | null>(() => store.labels.find((label) => label.id === activeID()) ?? null)

    const match = (sessionID: string, label: SessionLabel) => sessionMatchesLabel(tagsFor(sessionID), label.tags)

    const matches = (sessionID: string) => {
      const label = active()
      if (!label) return true
      return match(sessionID, label)
    }

    const createLabel = (name: string, tags: string[]) => {
      const cleanName = name.trim()
      const cleanTags = normalizeSessionTags(tags)
      if (!cleanName || cleanTags.length === 0) return undefined
      const label: SessionLabel = { id: crypto.randomUUID(), name: cleanName, tags: cleanTags }
      setStore("labels", (current) => [...current, label])
      return label
    }

    const removeLabel = (id: string) => {
      setStore("labels", (current) => current.filter((label) => label.id !== id))
      if (activeID() === id) setActiveID(null)
    }

    return {
      tags: tagsFor,
      setTags,
      all,
      labels: () => store.labels,
      active,
      select: setActiveID,
      match,
      matches,
      createLabel,
      removeLabel,
    }
  },
})
