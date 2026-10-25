import { Label } from "@opencode/core/label/label"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"

export const LabelHandler = HttpApiBuilder.group(Api, "server.label", (handlers) =>
  Effect.gen(function* () {
    const label = yield* Label.Service
    return handlers
      .handle("label.list", () => label.list())
      .handle("label.create", (ctx) => label.create(ctx.payload))
      .handle("label.remove", (ctx) => label.remove(ctx.params.labelID).pipe(Effect.as(true)))
  }),
)
