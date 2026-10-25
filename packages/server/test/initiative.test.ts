import fs from "node:fs/promises"
import path from "node:path"
import { expect } from "bun:test"
import { Global } from "@opencode/util/global"
import { Effect } from "effect"
import { tmpdir } from "../../core/test/fixture/tmpdir"
import { it } from "../../core/test/lib/effect"
import { ServerFetch } from "../src/fetch"

const authorization = `Basic ${btoa("opencode:secret")}`

// Each test gets its own server, in-memory database, and global data dir, so
// names and docs never collide across tests.
const server = Effect.fnUntraced(function* (root: string) {
  const data = path.join(root, "data")
  const handler = yield* ServerFetch.make(
    {
      app: { version: "test-version" },
      password: "secret",
      database: { path: ":memory:" },
      config: { project: false, directory: path.join(root, "config") },
      models: { fetch: false },
      fs: { filewatcher: false },
    },
    {
      overrides: [
        Global.node.replace(
          Global.layerWith({
            data,
            cache: path.join(root, "cache"),
            config: path.join(root, "config"),
            state: path.join(root, "state"),
            tmp: path.join(root, "tmp"),
            bin: path.join(root, "cache", "bin"),
            log: path.join(data, "log"),
            repos: path.join(data, "repos"),
          }),
        ),
      ],
    },
  )
  const request = (input: { method?: string; path: string; body?: unknown }) =>
    Effect.promise(() =>
      handler(
        new Request(`http://opencode.local${input.path}`, {
          method: input.method ?? "GET",
          headers: {
            authorization,
            ...(input.body === undefined ? {} : { "content-type": "application/json" }),
          },
          body: input.body === undefined ? undefined : JSON.stringify(input.body),
        }),
      ),
    )
  return { data, request }
})

type InitiativeInfo = {
  id: string
  name: string
  status: "active" | "done" | "archived"
  timeCreated: number
  timeUpdated: number
}

it.live("creates with default status, lists, and removes initiatives", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-initiative-")))
    const api = yield* server(tmp.path)

    const created = yield* api.request({ method: "POST", path: "/api/initiative", body: { name: "PlanetScale" } })
    expect(created.status).toBe(200)
    const initiative = (yield* Effect.promise(() => created.json())) as InitiativeInfo
    expect(initiative.id).toBeString()
    expect(initiative.id.startsWith("ini_")).toBe(true)
    expect(initiative.name).toBe("PlanetScale")
    expect(initiative.status).toBe("active")
    expect(initiative.timeCreated).toBeNumber()
    expect(initiative.timeUpdated).toBeNumber()

    const listed = yield* api.request({ path: "/api/initiative" })
    expect(listed.status).toBe(200)
    expect(yield* Effect.promise(() => listed.json())).toEqual([initiative])

    const removed = yield* api.request({ method: "DELETE", path: `/api/initiative/${initiative.id}` })
    expect(removed.status).toBe(200)
    expect(yield* Effect.promise(() => removed.json())).toBe(true)

    const empty = yield* api.request({ path: "/api/initiative" })
    expect(yield* Effect.promise(() => empty.json())).toEqual([])
  }),
)

it.live("creates with an explicit status", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-initiative-")))
    const api = yield* server(tmp.path)

    const created = yield* api.request({
      method: "POST",
      path: "/api/initiative",
      body: { name: "Done initiative", status: "done" },
    })
    expect(created.status).toBe(200)
    expect(((yield* Effect.promise(() => created.json())) as InitiativeInfo).status).toBe("done")
  }),
)

it.live("rejects duplicate names case-insensitively", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-initiative-")))
    const api = yield* server(tmp.path)

    const first = yield* api.request({ method: "POST", path: "/api/initiative", body: { name: "PlanetScale" } })
    expect(first.status).toBe(200)

    const duplicate = yield* api.request({ method: "POST", path: "/api/initiative", body: { name: "planetscale" } })
    expect(duplicate.status).toBe(409)
  }),
)

it.live("rejects invalid create payloads", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-initiative-")))
    const api = yield* server(tmp.path)

    for (const name of ["", "a:b", "a/b", "a\\b", ".", ".."]) {
      const response = yield* api.request({ method: "POST", path: "/api/initiative", body: { name } })
      expect(response.status).toBe(400)
    }

    const badStatus = yield* api.request({
      method: "POST",
      path: "/api/initiative",
      body: { name: "PlanetScale", status: "paused" },
    })
    expect(badStatus.status).toBe(400)
  }),
)

it.live("creates the docs folder on create and serves docs from disk", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-initiative-")))
    const api = yield* server(tmp.path)

    const created = yield* api.request({ method: "POST", path: "/api/initiative", body: { name: "Docs initiative" } })
    expect(created.status).toBe(200)
    const initiative = (yield* Effect.promise(() => created.json())) as InitiativeInfo

    const dir = path.join(api.data, "initiative", "Docs initiative")
    expect((yield* Effect.promise(() => fs.stat(dir))).isDirectory()).toBe(true)

    const listPath = `/api/initiative/${initiative.id}/doc`
    const empty = yield* api.request({ path: listPath })
    expect(yield* Effect.promise(() => empty.json())).toEqual([])

    yield* Effect.promise(() => fs.writeFile(path.join(dir, "b.md"), "# B\n"))
    yield* Effect.promise(() => fs.writeFile(path.join(dir, "a.md"), "# A\n"))
    yield* Effect.promise(() => fs.writeFile(path.join(dir, "notes.txt"), "nope"))
    yield* Effect.promise(() => fs.writeFile(path.join(dir, ".hidden"), "nope"))

    const listed = yield* api.request({ path: listPath })
    expect(listed.status).toBe(200)
    const docs = (yield* Effect.promise(() => listed.json())) as { name: string; timeUpdated: number }[]
    expect(docs.map((doc) => doc.name)).toEqual(["a.md", "b.md"])
    expect(docs[0].timeUpdated).toBeNumber()

    const read = yield* api.request({ path: `${listPath}/a.md` })
    expect(read.status).toBe(200)
    expect(read.headers.get("content-type")).toContain("text/markdown")
    expect(yield* Effect.promise(() => read.text())).toBe("# A\n")
  }),
)

it.live("rejects invalid doc names and missing docs", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-initiative-")))
    const api = yield* server(tmp.path)

    const created = yield* api.request({ method: "POST", path: "/api/initiative", body: { name: "Docs initiative" } })
    const initiative = (yield* Effect.promise(() => created.json())) as InitiativeInfo
    const docPath = (doc: string) => `/api/initiative/${initiative.id}/doc/${doc}`

    for (const doc of ["notes.txt", "..%2Fsecret.md"]) {
      const response = yield* api.request({ path: docPath(doc) })
      expect(response.status).toBe(400)
    }

    const missingDoc = yield* api.request({ path: docPath("missing.md") })
    expect(missingDoc.status).toBe(404)

    // A directory named like a doc is not a doc: read must 404, not 500.
    yield* Effect.promise(() => fs.mkdir(path.join(api.data, "initiative", "Docs initiative", "subdir.md")))
    const dirDoc = yield* api.request({ path: docPath("subdir.md") })
    expect(dirDoc.status).toBe(404)

    const unknownList = yield* api.request({ path: "/api/initiative/ini_missing/doc" })
    expect(unknownList.status).toBe(404)

    const unknownDoc = yield* api.request({ path: "/api/initiative/ini_missing/doc/a.md" })
    expect(unknownDoc.status).toBe(404)
  }),
)

it.live("delete keeps the docs folder on disk", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("opencode-initiative-")))
    const api = yield* server(tmp.path)

    const created = yield* api.request({ method: "POST", path: "/api/initiative", body: { name: "Kept docs" } })
    const initiative = (yield* Effect.promise(() => created.json())) as InitiativeInfo
    const dir = path.join(api.data, "initiative", "Kept docs")
    yield* Effect.promise(() => fs.writeFile(path.join(dir, "plan.md"), "# Plan\n"))

    const removed = yield* api.request({ method: "DELETE", path: `/api/initiative/${initiative.id}` })
    expect(removed.status).toBe(200)
    expect((yield* Effect.promise(() => fs.stat(dir))).isDirectory()).toBe(true)
    expect(yield* Effect.promise(() => fs.readFile(path.join(dir, "plan.md"), "utf8"))).toBe("# Plan\n")
  }),
)
