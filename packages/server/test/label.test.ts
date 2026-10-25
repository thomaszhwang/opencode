import { expect, setSystemTime } from "bun:test"
import { Effect } from "effect"
import { OpenCode } from "@opencode/client"
import { tmpdir } from "../../core/test/fixture/tmpdir"
import { it } from "../../core/test/lib/effect"
import { startServer } from "./fixture/server"

it.live("creates, lists in creation order, and removes labels", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-label-")))
    const server = yield* startServer(tmp.path)
    const api = OpenCode.make({ baseUrl: server.base, headers: server.headers })
    yield* Effect.promise(async () => {
      // Distinct fixed times make the time_created ordering assertion deterministic.
      setSystemTime(new Date("2026-10-25T12:00:00Z"))
      const first = await api.label.create({ name: "Needs review", tags: ["important", "urgent"] })
      setSystemTime(new Date("2026-10-25T12:00:01Z"))
      const second = await api.label.create({ name: "Follow up", tags: ["done"] })
      setSystemTime()

      expect(first.id).toBeString()
      expect(first.name).toBe("Needs review")
      expect(first.tags).toEqual(["important", "urgent"])
      expect(await api.label.list()).toEqual([first, second])

      expect(await api.label.remove({ labelID: first.id })).toBe(true)
      expect(await api.label.list()).toEqual([second])
    })
  }),
)

it.live("rejects invalid create payloads", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-label-invalid-")))
    const server = yield* startServer(tmp.path)
    yield* Effect.promise(async () => {
      const create = (payload: unknown) =>
        fetch(`${server.base}/api/label`, {
          method: "POST",
          headers: { ...server.headers, "content-type": "application/json" },
          body: JSON.stringify(payload),
        })

      expect((await create({ name: "", tags: ["important"] })).status).toBe(400)
      expect((await create({ name: "Needs review", tags: [] })).status).toBe(400)
    })
  }),
)
