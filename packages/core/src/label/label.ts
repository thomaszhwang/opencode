export * as Label from "./label.js"

import { asc, eq } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { Identifier } from "@opencode/schema/identifier"
import { Label } from "@opencode/schema/label"
import { makeGlobalNode } from "@opencode/util/effect/app-node"
import { Database } from "../database/database.js"
import { LabelTable } from "./sql.js"

export const Info = Label.Info
export type Info = typeof Info.Type

export const CreateInput = Label.CreateInput
export type CreateInput = typeof CreateInput.Type

export interface Interface {
  readonly list: () => Effect.Effect<ReadonlyArray<Info>>
  readonly create: (input: CreateInput) => Effect.Effect<Info>
  readonly remove: (id: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Label") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const db = (yield* Database.Service).db

    const list = Effect.fnUntraced(function* () {
      const rows = yield* db.select().from(LabelTable).orderBy(asc(LabelTable.time_created)).all().pipe(Effect.orDie)
      return rows.map((row): Info => ({ id: row.id, name: row.name, tags: row.tags }))
    })

    const create = Effect.fn("Label.create")(function* (input: CreateInput) {
      const row = { id: "lab_" + Identifier.ascending(), name: input.name, tags: [...input.tags] }
      yield* db.insert(LabelTable).values([row]).run().pipe(Effect.orDie)
      return row
    })

    const remove = Effect.fn("Label.remove")(function* (id: string) {
      yield* db.delete(LabelTable).where(eq(LabelTable.id, id)).run().pipe(Effect.orDie)
    })

    return Service.of({ list, create, remove })
  }),
)

export const node = makeGlobalNode({ service: Service, layer, deps: [Database.node] })
