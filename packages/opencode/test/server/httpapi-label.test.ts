import { NodeHttpServer } from "@effect/platform-node"
import { describe, expect } from "bun:test"
import { Context, Effect, Layer, Option } from "effect"
import { HttpClient, HttpClientRequest, HttpRouter } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { AppNodeBuilder } from "@opencode-ai/core/effect/app-node-builder"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { MoveSession } from "@opencode-ai/core/control-plane/move-session"
import { Database } from "@opencode-ai/core/database/database"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config/config"
import { Installation } from "../../src/installation"
import { Label } from "../../src/label/label"
import { ServerAuth } from "../../src/server/auth"
import { RootHttpApi } from "../../src/server/routes/instance/httpapi/api"
import { LabelPaths } from "../../src/server/routes/instance/httpapi/groups/label"
import { controlHandlers } from "../../src/server/routes/instance/httpapi/handlers/control"
import { controlPlaneHandlers } from "../../src/server/routes/instance/httpapi/handlers/control-plane"
import { globalHandlers } from "../../src/server/routes/instance/httpapi/handlers/global"
import { labelHandlers } from "../../src/server/routes/instance/httpapi/handlers/label"
import { authorizationLayer } from "../../src/server/routes/instance/httpapi/middleware/authorization"
import { schemaErrorLayer } from "../../src/server/routes/instance/httpapi/middleware/schema-error"
import { testEffect } from "../lib/effect"

// Same root-API topology as httpapi-global.test.ts, but with the real Label
// service backed by a real (per-test-process) database instead of a mock.
const apiLayer = HttpRouter.serve(
  HttpApiBuilder.layer(RootHttpApi).pipe(
    Layer.provide([controlHandlers, controlPlaneHandlers, globalHandlers, labelHandlers]),
    Layer.provide([authorizationLayer, schemaErrorLayer]),
    // Raw HttpApi routes expose an opaque handler context at the request boundary.
    // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
    HttpRouter.provideRequest(Layer.succeedContext(Context.empty() as Context.Context<unknown>)),
  ),
  { disableListenLog: true, disableLogger: true },
).pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provide(AppNodeBuilder.build(LayerNode.group([Label.node, Database.node]))),
  Layer.provide(Layer.mock(Auth.Service)({})),
  Layer.provide(Layer.mock(Config.Service)({})),
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

describe("label HttpApi", () => {
  it.live("creates, lists, and removes labels", () =>
    Effect.gen(function* () {
      const created = yield* HttpClientRequest.post(LabelPaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name: "Needs review", tags: ["important", "urgent"] }),
        HttpClient.execute,
      )
      expect(created.status).toBe(200)
      const label = (yield* created.json) as Label.Info
      expect(label.id).toBeString()
      expect(label.name).toBe("Needs review")
      expect(label.tags).toEqual(["important", "urgent"])

      const listed = yield* HttpClient.execute(HttpClientRequest.get(LabelPaths.list))
      expect(listed.status).toBe(200)
      expect(yield* listed.json).toEqual([label])

      const removed = yield* HttpClient.execute(
        HttpClientRequest.delete(LabelPaths.remove.replace(":labelID", label.id)),
      )
      expect(removed.status).toBe(200)
      expect(yield* removed.json).toBe(true)

      const empty = yield* HttpClient.execute(HttpClientRequest.get(LabelPaths.list))
      expect(yield* empty.json).toEqual([])
    }),
  )

  it.live("rejects invalid create payloads", () =>
    Effect.gen(function* () {
      const noName = yield* HttpClientRequest.post(LabelPaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name: "", tags: ["important"] }),
        HttpClient.execute,
      )
      expect(noName.status).toBe(400)

      const noTags = yield* HttpClientRequest.post(LabelPaths.create).pipe(
        HttpClientRequest.bodyJsonUnsafe({ name: "Needs review", tags: [] }),
        HttpClient.execute,
      )
      expect(noTags.status).toBe(400)
    }),
  )
})
