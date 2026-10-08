import { NodeHttpServer } from "@effect/platform-node"
import { describe, expect } from "bun:test"
import { Context, Effect, Layer, Option } from "effect"
import { HttpClient, HttpClientRequest, HttpRouter } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import fs from "fs/promises"
import path from "path"
import { AppNodeBuilder } from "@opencode-ai/core/effect/app-node-builder"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { MoveSession } from "@opencode-ai/core/control-plane/move-session"
import { Database } from "@opencode-ai/core/database/database"
import { Global } from "@opencode-ai/core/global"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config/config"
import { Installation } from "../../src/installation"
import { Initiative } from "../../src/initiative/initiative"
import { Label } from "../../src/label/label"
import { ServerAuth } from "../../src/server/auth"
import { RootHttpApi } from "../../src/server/routes/instance/httpapi/api"
import { InitiativePaths } from "../../src/server/routes/instance/httpapi/groups/initiative"
import { controlHandlers } from "../../src/server/routes/instance/httpapi/handlers/control"
import { controlPlaneHandlers } from "../../src/server/routes/instance/httpapi/handlers/control-plane"
import { globalHandlers } from "../../src/server/routes/instance/httpapi/handlers/global"
import { initiativeHandlers } from "../../src/server/routes/instance/httpapi/handlers/initiative"
import { labelHandlers } from "../../src/server/routes/instance/httpapi/handlers/label"
import { authorizationLayer } from "../../src/server/routes/instance/httpapi/middleware/authorization"
import { schemaErrorLayer } from "../../src/server/routes/instance/httpapi/middleware/schema-error"
import { testEffect } from "../lib/effect"

// Same root-API topology as httpapi-label.test.ts, with the real Initiative
// service backed by a real (per-test-process) database instead of a mock.
const apiLayer = HttpRouter.serve(
  HttpApiBuilder.layer(RootHttpApi).pipe(
    Layer.provide([controlHandlers, controlPlaneHandlers, globalHandlers, labelHandlers, initiativeHandlers]),
    Layer.provide([authorizationLayer, schemaErrorLayer]),
    // Raw HttpApi routes expose an opaque handler context at the request boundary.
    // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
    HttpRouter.provideRequest(Layer.succeedContext(Context.empty() as Context.Context<unknown>)),
  ),
  { disableListenLog: true, disableLogger: true },
).pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provide(AppNodeBuilder.build(LayerNode.group([Initiative.node, Database.node]))),
  Layer.provide(Layer.mock(Auth.Service)({})),
  Layer.provide(Layer.mock(Config.Service)({})),
  Layer.provide(Layer.mock(Label.Service)({})),
  Layer.provide(Layer.mock(MoveSession.Service)({})),
  Layer.provide(
    Layer.mock(Installation.Service)({
      method: () => Effect.succeed("npm"),
      latest: () => Effect.succeed("9.9.9"),
      upgrade: () => Effect.void,
    }),
  ),
  Layer.provide(ServerAuth.Config.configLayer({ password: Option.none(), username: "opencode" })),
)
const it = testEffect(apiLayer)

// All tests in this file share one apiLayer and therefore one in-memory
// database, so names must stay unique across tests to avoid 409s.
let suffix = 0
function uniqueName(base: string) {
  suffix += 1
  return `${base} ${suffix}`
}

describe("initiative HttpApi", () => {
  it.live("creates with default status, lists, and removes initiatives", () =>
    Effect.gen(function* () {
      const name = uniqueName("PlanetScale")
      const created = yield* HttpClientRequest.post(InitiativePaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name }),
        HttpClient.execute,
      )
      expect(created.status).toBe(200)
      const initiative = (yield* created.json) as Initiative.Info
      expect(initiative.id).toBeString()
      expect(initiative.id.startsWith("ini")).toBe(true)
      expect(initiative.name).toBe(name)
      expect(initiative.status).toBe("active")
      expect(initiative.timeCreated).toBeNumber()
      expect(initiative.timeUpdated).toBeNumber()

      const listed = yield* HttpClient.execute(HttpClientRequest.get(InitiativePaths.list))
      expect(listed.status).toBe(200)
      expect(yield* listed.json).toEqual([initiative])

      const removed = yield* HttpClient.execute(
        HttpClientRequest.delete(InitiativePaths.remove.replace(":initiativeID", initiative.id)),
      )
      expect(removed.status).toBe(200)
      expect(yield* removed.json).toBe(true)

      const empty = yield* HttpClient.execute(HttpClientRequest.get(InitiativePaths.list))
      expect(yield* empty.json).toEqual([])
    }),
  )

  it.live("creates with an explicit status", () =>
    Effect.gen(function* () {
      const created = yield* HttpClientRequest.post(InitiativePaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name: uniqueName("Done initiative"), status: "done" }),
        HttpClient.execute,
      )
      expect(created.status).toBe(200)
      expect(((yield* created.json) as Initiative.Info).status).toBe("done")
    }),
  )

  it.live("rejects duplicate names case-insensitively", () =>
    Effect.gen(function* () {
      const name = uniqueName("PlanetScale")
      const first = yield* HttpClientRequest.post(InitiativePaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name }),
        HttpClient.execute,
      )
      expect(first.status).toBe(200)

      const duplicate = yield* HttpClientRequest.post(InitiativePaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name: name.toLowerCase() }),
        HttpClient.execute,
      )
      expect(duplicate.status).toBe(409)
    }),
  )

  it.live("rejects invalid create payloads", () =>
    Effect.gen(function* () {
      for (const name of ["", "a:b", "a/b", "a\\b", ".", ".."]) {
        const response = yield* HttpClientRequest.post(InitiativePaths.create).pipe(
          HttpClientRequest.bodyJsonUnsafe({ name }),
          HttpClient.execute,
        )
        expect(response.status).toBe(400)
      }

      const badStatus = yield* HttpClientRequest.post(InitiativePaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name: uniqueName("PlanetScale"), status: "paused" }),
        HttpClient.execute,
      )
      expect(badStatus.status).toBe(400)
    }),
  )

  it.live("creates the docs folder on create and serves docs from disk", () =>
    Effect.gen(function* () {
      const name = uniqueName("Docs initiative")
      const created = yield* HttpClientRequest.post(InitiativePaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name }),
        HttpClient.execute,
      )
      expect(created.status).toBe(200)
      const initiative = (yield* created.json) as Initiative.Info

      const dir = path.join(Global.Path.data, "initiative", name)
      expect((yield* Effect.promise(() => fs.stat(dir))).isDirectory()).toBe(true)

      const listPath = InitiativePaths.docList.replace(":initiativeID", initiative.id)
      const empty = yield* HttpClient.execute(HttpClientRequest.get(listPath))
      expect(yield* empty.json).toEqual([])

      yield* Effect.promise(() => fs.writeFile(path.join(dir, "b.md"), "# B\n"))
      yield* Effect.promise(() => fs.writeFile(path.join(dir, "a.md"), "# A\n"))
      yield* Effect.promise(() => fs.writeFile(path.join(dir, "notes.txt"), "nope"))
      yield* Effect.promise(() => fs.writeFile(path.join(dir, ".hidden"), "nope"))

      const listed = yield* HttpClient.execute(HttpClientRequest.get(listPath))
      expect(listed.status).toBe(200)
      const docs = (yield* listed.json) as Initiative.DocInfo[]
      expect(docs.map((doc) => doc.name)).toEqual(["a.md", "b.md"])
      expect(docs[0].timeUpdated).toBeNumber()

      const read = yield* HttpClient.execute(
        HttpClientRequest.get(
          InitiativePaths.docRead.replace(":initiativeID", initiative.id).replace(":name", "a.md"),
        ),
      )
      expect(read.status).toBe(200)
      expect(read.headers["content-type"]).toContain("text/markdown")
      expect(yield* read.text).toBe("# A\n")
    }),
  )

  it.live("rejects invalid doc names and missing docs", () =>
    Effect.gen(function* () {
      const created = yield* HttpClientRequest.post(InitiativePaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name: uniqueName("Docs initiative") }),
        HttpClient.execute,
      )
      const initiative = (yield* created.json) as Initiative.Info

      const docPath = (doc: string) =>
        InitiativePaths.docRead.replace(":initiativeID", initiative.id).replace(":name", doc)

      for (const doc of ["notes.txt", "..%2Fsecret.md"]) {
        const response = yield* HttpClient.execute(HttpClientRequest.get(docPath(doc)))
        expect(response.status).toBe(400)
      }

      const missingDoc = yield* HttpClient.execute(HttpClientRequest.get(docPath("missing.md")))
      expect(missingDoc.status).toBe(404)

      const unknownList = yield* HttpClient.execute(
        HttpClientRequest.get(InitiativePaths.docList.replace(":initiativeID", "ini_missing")),
      )
      expect(unknownList.status).toBe(404)

      const unknownDoc = yield* HttpClient.execute(
        HttpClientRequest.get(InitiativePaths.docRead.replace(":initiativeID", "ini_missing").replace(":name", "a.md")),
      )
      expect(unknownDoc.status).toBe(404)
    }),
  )
})
