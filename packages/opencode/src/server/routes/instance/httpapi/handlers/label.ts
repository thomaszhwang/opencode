import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Label } from "@/label/label"
import { RootHttpApi } from "../api"

export const labelHandlers = HttpApiBuilder.group(RootHttpApi, "label", (handlers) =>
  Effect.gen(function* () {
    const label = yield* Label.Service

    const list = Effect.fn("LabelHttpApi.list")(function* () {
      return yield* label.list()
    })

    const create = Effect.fn("LabelHttpApi.create")(function* (ctx: { payload: typeof Label.CreateInput.Type }) {
      return yield* label.create(ctx.payload)
    })

    const remove = Effect.fn("LabelHttpApi.remove")(function* (ctx: { params: { labelID: string } }) {
      yield* label.remove(ctx.params.labelID)
      return true
    })

    return handlers.handle("list", list).handle("create", create).handle("remove", remove)
  }),
)
