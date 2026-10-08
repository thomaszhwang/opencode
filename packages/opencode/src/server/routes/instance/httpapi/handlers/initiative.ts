import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Initiative } from "@/initiative/initiative"
import { RootHttpApi } from "../api"
import { ConflictError, notFound } from "../errors"

export const initiativeHandlers = HttpApiBuilder.group(RootHttpApi, "initiative", (handlers) =>
  Effect.gen(function* () {
    const initiative = yield* Initiative.Service

    const list = Effect.fn("InitiativeHttpApi.list")(function* () {
      return yield* initiative.list()
    })

    const create = Effect.fn("InitiativeHttpApi.create")(function* (ctx: {
      payload: typeof Initiative.CreateInput.Type
    }) {
      return yield* initiative.create(ctx.payload).pipe(
        Effect.catchTag("Initiative.NameConflictError", (error) =>
          Effect.fail(new ConflictError({ message: `Initiative already exists: ${error.name}`, resource: "initiative" })),
        ),
      )
    })

    const remove = Effect.fn("InitiativeHttpApi.remove")(function* (ctx: { params: { initiativeID: string } }) {
      yield* initiative.remove(ctx.params.initiativeID)
      return true
    })

    const docList = Effect.fn("InitiativeHttpApi.docList")(function* (ctx: { params: { initiativeID: string } }) {
      return yield* initiative.docList(ctx.params.initiativeID).pipe(
        Effect.catchTag("Initiative.NotFoundError", (error) => Effect.fail(notFound(error.message))),
      )
    })

    const docRead = Effect.fn("InitiativeHttpApi.docRead")(function* (ctx: {
      params: { initiativeID: string; name: string }
    }) {
      return yield* initiative.docRead(ctx.params.initiativeID, ctx.params.name).pipe(
        Effect.catchTag("Initiative.NotFoundError", (error) => Effect.fail(notFound(error.message))),
      )
    })

    return handlers
      .handle("list", list)
      .handle("create", create)
      .handle("remove", remove)
      .handle("docList", docList)
      .handle("docRead", docRead)
  }),
)
