import { Database } from "@opencode-ai/core/database/database"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { InitiativeTable } from "@opencode-ai/core/initiative/sql"
import { asc, eq } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { Identifier } from "@/id/id"

export const Status = Schema.Literals(["active", "done", "archived"])
export type Status = Schema.Schema.Type<typeof Status>

export const Info = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Status,
  timeCreated: Schema.Number,
  timeUpdated: Schema.Number,
})
export type Info = Schema.Schema.Type<typeof Info>

// The name is the `Initiative:<Name>` tag segment and the on-disk docs folder
// name, so it can't contain `:` or path separators, and can't be `.` or `..`
// (both resolve outside the initiative docs folder).
export const Name = Schema.String.check(Schema.isMinLength(1)).check(Schema.isPattern(/^(?!\.{1,2}$)[^:/\\]+$/))

export const CreateInput = Schema.Struct({
  name: Name,
  status: Schema.optional(Status),
})
export type CreateInput = Schema.Schema.Type<typeof CreateInput>

export class NameConflictError extends Schema.TaggedErrorClass<NameConflictError>()(
  "Initiative.NameConflictError",
  {
    name: Schema.String,
  },
) {}

export interface Interface {
  readonly list: () => Effect.Effect<Info[]>
  readonly create: (input: CreateInput) => Effect.Effect<Info, NameConflictError>
  readonly remove: (id: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Initiative") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const { db } = yield* Database.Service

    const list = Effect.fn("Initiative.list")(function* () {
      const rows = yield* db
        .select()
        .from(InitiativeTable)
        .orderBy(asc(InitiativeTable.time_created))
        .all()
        .pipe(Effect.orDie)
      return rows.map(
        (row): Info => ({
          id: row.id,
          name: row.name,
          status: row.status,
          timeCreated: row.time_created,
          timeUpdated: row.time_updated,
        }),
      )
    })

    const create = Effect.fn("Initiative.create")(function* (input: CreateInput) {
      const existing = yield* db.select().from(InitiativeTable).all().pipe(Effect.orDie)
      if (existing.some((row) => row.name.toLowerCase() === input.name.toLowerCase())) {
        return yield* new NameConflictError({ name: input.name })
      }
      const row = {
        id: Identifier.create("ini", "ascending"),
        name: input.name,
        status: input.status ?? ("active" as const),
        time_created: Date.now(),
        time_updated: Date.now(),
      }
      yield* db.insert(InitiativeTable).values([row]).run().pipe(Effect.orDie)
      const info: Info = {
        id: row.id,
        name: row.name,
        status: row.status,
        timeCreated: row.time_created,
        timeUpdated: row.time_updated,
      }
      return info
    })

    const remove = Effect.fn("Initiative.remove")(function* (id: string) {
      yield* db.delete(InitiativeTable).where(eq(InitiativeTable.id, id)).run().pipe(Effect.orDie)
    })

    return Service.of({ list, create, remove })
  }),
)

export const node = LayerNode.make({ service: Service, layer, deps: [Database.node] })

export * as Initiative from "./initiative"
