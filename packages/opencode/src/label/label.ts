import { Database } from "@opencode-ai/core/database/database"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { LabelTable } from "@opencode-ai/core/label/sql"
import { asc, eq } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { Identifier } from "@/id/id"

export const Info = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  tags: Schema.Array(Schema.String),
})
export type Info = Schema.Schema.Type<typeof Info>

export const CreateInput = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(1)),
  tags: Schema.Array(Schema.String).check(Schema.isMinLength(1)),
})
export type CreateInput = Schema.Schema.Type<typeof CreateInput>

export interface Interface {
  readonly list: () => Effect.Effect<Info[]>
  readonly create: (input: CreateInput) => Effect.Effect<Info>
  readonly remove: (id: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Label") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const { db } = yield* Database.Service

    const list = Effect.fn("Label.list")(function* () {
      const rows = yield* db.select().from(LabelTable).orderBy(asc(LabelTable.time_created)).all().pipe(Effect.orDie)
      return rows.map((row): Info => ({ id: row.id, name: row.name, tags: row.tags }))
    })

    const create = Effect.fn("Label.create")(function* (input: CreateInput) {
      const row = { id: Identifier.create("lab", "ascending"), name: input.name, tags: [...input.tags] }
      yield* db.insert(LabelTable).values([row]).run().pipe(Effect.orDie)
      const info: Info = row
      return info
    })

    const remove = Effect.fn("Label.remove")(function* (id: string) {
      yield* db.delete(LabelTable).where(eq(LabelTable.id, id)).run().pipe(Effect.orDie)
    })

    return Service.of({ list, create, remove })
  }),
)

export const node = LayerNode.make({ service: Service, layer, deps: [Database.node] })

export * as Label from "./label"
