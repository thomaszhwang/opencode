import { describe, expect, mock, test } from "bun:test"
import {
  OpenCode,
  type OpenCodeEvent,
  type SessionInfo,
  type SessionMetadata,
  type SessionMetadataUpdated,
} from "@opencode/client/promise"
import { createData } from "@opencode/client/solid"
import { createRoot } from "solid-js"
import type { OpenCodeEventStream } from "@/runtime/server/client"
import { createSessionMetadata } from "./session-metadata"

// The toast module pulls in @opencode/ui's JSX artwork, which the unit runner
// cannot load; record the calls instead of rendering them.
const toasts: { variant?: string; title?: string; description?: string }[] = []
mock.module("@/shell/notifications/toast", () => ({
  showToast: (options: { variant?: string; title?: string; description?: string }) => toasts.push(options),
}))

function session(id: string, metadata?: SessionMetadata): SessionInfo {
  return {
    id,
    projectID: "proj_test",
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: 1, updated: 1 },
    location: { directory: "/test" },
    metadata,
  } as SessionInfo
}

function metadataEvent(sessionID: string, metadata: SessionMetadata): SessionMetadataUpdated {
  return {
    id: "evt_test",
    created: 2,
    type: "session.metadata.updated",
    durable: { aggregateID: sessionID, seq: 1, version: 1 },
    data: { sessionID, metadata },
  }
}

function makeHarness(initial: SessionInfo[]) {
  const sessions = new Map(initial.map((item) => [item.id, item]))
  const patches: Record<string, unknown>[] = []
  const control = { failPatches: false }

  const api = OpenCode.make({
    baseUrl: "http://localhost:3000",
    fetch: Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init)
        const id = new URL(request.url).pathname.split("/").pop()!

        if (request.method === "PATCH") {
          if (control.failPatches) return new Response("boom", { status: 500 })
          const body = (await request.json()) as Record<string, unknown>
          const current = sessions.get(id)!
          sessions.set(id, { ...current, ...body } as SessionInfo)
          patches.push(body)

          return new Response(null, { status: 204 })
        }

        return Response.json({ data: sessions.get(id) })
      },
      { preconnect() {} },
    ),
  })

  const handlers = new Map<string, Set<(event: OpenCodeEvent) => void>>()
  const event: OpenCodeEventStream = {
    on(type, handler) {
      const set = handlers.get(type) ?? new Set<(event: OpenCodeEvent) => void>()
      set.add(handler as (event: OpenCodeEvent) => void)
      handlers.set(type, set)

      return () => set.delete(handler as (event: OpenCodeEvent) => void)
    },
    listen: () => () => {},
  }

  return {
    api,
    event,
    patches,
    sessions,
    control,
    emit: (value: OpenCodeEvent) => handlers.get(value.type)?.forEach((handler) => handler(value)),
    // createData consumes the wrapped { name, details } event form, like the
    // adapter in runtime.tsx; its own listener stays inert in these tests.
    dataEvent: {
      on: event.on,
      listen: (handler: (event: { name: OpenCodeEvent["type"]; details: OpenCodeEvent }) => void) =>
        event.listen((event) => handler({ name: event.type, details: event })),
    },
  }
}

const translate = (key: string) => key

describe("session metadata sync", () => {
  test("an external PATCH updates the synced session record without a reload", async () => {
    const existing = session("ses_1", { tags: ["fleet"] })
    const harness = makeHarness([existing])

    await createRoot(async (dispose) => {
      const data = createData({
        api: () => harness.api,
        directory: "/test",
        event: harness.dataEvent,
      })
      data.session.remember(existing)
      createSessionMetadata({ api: harness.api, event: harness.event, data, translate })

      // Another writer patched the server; the event carries the new record.
      const next = { ...existing.metadata, note: "hello" }
      await harness.api.session.update({ sessionID: existing.id, metadata: next })
      harness.emit(metadataEvent(existing.id, next))

      expect(data.session.get(existing.id)?.metadata).toEqual(next)
      dispose()
    })
  })

  test("ignores metadata events for sessions the client has not loaded", async () => {
    const harness = makeHarness([])

    await createRoot(async (dispose) => {
      const data = createData({
        api: () => harness.api,
        directory: "/test",
        event: harness.dataEvent,
      })
      createSessionMetadata({ api: harness.api, event: harness.event, data, translate })

      harness.emit(metadataEvent("ses_unknown", { tags: ["fleet"] }))

      expect(data.session.get("ses_unknown")).toBeUndefined()
      dispose()
    })
  })
})

describe("session metadata writes", () => {
  test("a tags write keeps the coexisting note and foreign keys", async () => {
    const existing = session("ses_1", {
      note: "remember **this**",
      "opencode.acp.additionalDirectories": ["/extra"],
    })
    const harness = makeHarness([existing])

    await createRoot(async (dispose) => {
      const data = createData({
        api: () => harness.api,
        directory: "/test",
        event: harness.dataEvent,
      })
      const controller = createSessionMetadata({ api: harness.api, event: harness.event, data, translate })

      const landed = await controller.tags.setTags(existing, () => ["done"])

      expect(landed).toBe(true)
      expect(harness.sessions.get(existing.id)?.metadata).toEqual({
        note: "remember **this**",
        "opencode.acp.additionalDirectories": ["/extra"],
        tags: ["done"],
      })
      expect(harness.patches).toEqual([
        {
          metadata: {
            note: "remember **this**",
            "opencode.acp.additionalDirectories": ["/extra"],
            tags: ["done"],
          },
        },
      ])
      dispose()
    })
  })

  test("each write merges from a fresh read, so a note set between tag writes survives", async () => {
    const existing = session("ses_1", { tags: ["fleet"] })
    const harness = makeHarness([existing])

    await createRoot(async (dispose) => {
      const data = createData({
        api: () => harness.api,
        directory: "/test",
        event: harness.dataEvent,
      })
      const controller = createSessionMetadata({ api: harness.api, event: harness.event, data, translate })

      await controller.tags.setTags(existing, (current) => [...current, "done"])
      // Another writer lands a note before the next write on this session.
      await harness.api.session.update({
        sessionID: existing.id,
        metadata: { ...harness.sessions.get(existing.id)?.metadata, note: "hello" },
      })
      await controller.note.setNote(existing, "hello")

      expect(harness.sessions.get(existing.id)?.metadata).toEqual({ tags: ["fleet", "done"], note: "hello" })
      dispose()
    })
  })

  test("a failed write resolves false and the session's chain keeps flowing", async () => {
    const existing = session("ses_1", { tags: ["fleet"] })
    const harness = makeHarness([existing])

    await createRoot(async (dispose) => {
      const data = createData({
        api: () => harness.api,
        directory: "/test",
        event: harness.dataEvent,
      })
      const controller = createSessionMetadata({ api: harness.api, event: harness.event, data, translate })

      harness.control.failPatches = true
      const landed = await controller.tags.setTags(existing, () => ["done"])
      harness.control.failPatches = false

      expect(landed).toBe(false)
      expect(toasts).toEqual([{ variant: "error", title: "toast.session.tags.updateFailed.title", description: expect.anything() }])
      expect(harness.sessions.get(existing.id)?.metadata).toEqual({ tags: ["fleet"] })

      const retried = await controller.tags.setTags(existing, () => ["done"])
      expect(retried).toBe(true)
      expect(harness.sessions.get(existing.id)?.metadata).toEqual({ tags: ["done"] })
      dispose()
    })
  })

  test("clearing tags removes only the tags key", async () => {
    const existing = session("ses_1", { tags: ["done"], note: "hello" })
    const harness = makeHarness([existing])

    await createRoot(async (dispose) => {
      const data = createData({
        api: () => harness.api,
        directory: "/test",
        event: harness.dataEvent,
      })
      const controller = createSessionMetadata({ api: harness.api, event: harness.event, data, translate })

      await controller.tags.setTags(existing, () => [])

      expect(harness.sessions.get(existing.id)?.metadata).toEqual({ note: "hello" })
      dispose()
    })
  })
})
