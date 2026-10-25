import { Initiative } from "@opencode/core/initiative"
import { ConflictError, InitiativeNotFoundError } from "@opencode/protocol/errors"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"

export const InitiativeHandler = HttpApiBuilder.group(Api, "server.initiative", (handlers) =>
  Effect.gen(function* () {
    const initiative = yield* Initiative.Service
    return handlers
      .handle("initiative.list", () => initiative.list())
      .handle("initiative.create", (ctx) =>
        initiative.create(ctx.payload).pipe(
          Effect.catchTag("Initiative.NameConflictError", (error) =>
            Effect.fail(
              new ConflictError({ message: `Initiative already exists: ${error.name}`, resource: "initiative" }),
            ),
          ),
        ),
      )
      .handle("initiative.remove", (ctx) => Effect.as(initiative.remove(ctx.params.initiativeID), true))
      .handle("initiative.doc.list", (ctx) =>
        initiative.docList(ctx.params.initiativeID).pipe(
          Effect.catchTag("Initiative.NotFoundError", (error) =>
            Effect.fail(new InitiativeNotFoundError({ initiativeID: ctx.params.initiativeID, message: error.message })),
          ),
        ),
      )
      .handle("initiative.doc.read", (ctx) =>
        initiative.docRead(ctx.params.initiativeID, ctx.params.name).pipe(
          Effect.catchTag("Initiative.NotFoundError", (error) =>
            Effect.fail(new InitiativeNotFoundError({ initiativeID: ctx.params.initiativeID, message: error.message })),
          ),
        ),
      )
  }),
)
