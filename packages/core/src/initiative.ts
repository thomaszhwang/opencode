export * as Initiative from "./initiative.js"

import path from "path"
import { Context, Effect, Layer, Option, Schema } from "effect"
import { asc, eq } from "drizzle-orm"
import { Database } from "./database/database.js"
import { FSUtil } from "@opencode/util/fs-util"
import { Global } from "@opencode/util/global"
import { Node } from "@opencode/util/effect/app-node"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Initiative } from "@opencode/schema/initiative"
import { InitiativeTable } from "./initiative/sql.js"

export const ID = Initiative.ID
export type ID = Initiative.ID

export const Status = Initiative.Status
export type Status = Initiative.Status

export const Info = Initiative.Info
export type Info = Initiative.Info

export const Name = Initiative.Name

export const CreateInput = Initiative.CreateInput
export type CreateInput = typeof CreateInput.Type

export const DocName = Initiative.DocName

export const DocInfo = Initiative.DocInfo
export type DocInfo = typeof DocInfo.Type

export class NameConflictError extends Schema.TaggedError<NameConflictError>()("Initiative.NameConflictError", {
  name: Schema.String,
}) {}

export class NotFoundError extends Schema.TaggedError<NotFoundError>()("Initiative.NotFoundError", {
  message: Schema.String,
}) {}

export interface Interface {
  readonly list: () => Effect.Effect<Info[]>
  readonly create: (input: CreateInput) => Effect.Effect<Info, NameConflictError>
  readonly remove: (id: ID) => Effect.Effect<void>
  readonly docList: (id: ID) => Effect.Effect<DocInfo[], NotFoundError>
  readonly docRead: (id: ID, name: string) => Effect.Effect<string, NotFoundError>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Initiative") {}

// Docs live in the server-global data dir (not a project dir) because
// initiatives span projects; files on disk are the source of truth.
const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const database = yield* Database.Service
    const db = database.db
    const fs = yield* FSUtil.Service
    const global = yield* Global.Service
    const docsDir = (name: string) => path.join(global.data, "initiative", name)

    const info = (row: typeof InitiativeTable.$inferSelect): Info => ({
      id: row.id,
      name: row.name,
      status: row.status,
      timeCreated: row.time_created,
      timeUpdated: row.time_updated,
    })

    const requireById = Effect.fn("Initiative.requireById")(function* (id: ID) {
      const row = yield* db.select().from(InitiativeTable).where(eq(InitiativeTable.id, id)).get().pipe(Effect.orDie)
      if (!row) return yield* new NotFoundError({ message: `Initiative not found: ${id}` })
      return row
    })

    const list = Effect.fn("Initiative.list")(function* () {
      const rows = yield* db
        .select()
        .from(InitiativeTable)
        .orderBy(asc(InitiativeTable.time_created))
        .all()
        .pipe(Effect.orDie)
      return rows.map(info)
    })

    const create = Effect.fn("Initiative.create")(function* (input: CreateInput) {
      const existing = yield* db.select().from(InitiativeTable).all().pipe(Effect.orDie)
      if (existing.some((row) => row.name.toLowerCase() === input.name.toLowerCase())) {
        return yield* new NameConflictError({ name: input.name })
      }
      const row = {
        id: ID.create(),
        name: input.name,
        status: input.status ?? ("active" as const),
        time_created: Date.now(),
        time_updated: Date.now(),
      }
      yield* db.insert(InitiativeTable).values([row]).run().pipe(Effect.orDie)
      yield* fs.ensureDir(docsDir(input.name)).pipe(Effect.orDie)
      return info(row)
    })

    const remove = Effect.fn("Initiative.remove")(function* (id: ID) {
      yield* db.delete(InitiativeTable).where(eq(InitiativeTable.id, id)).run().pipe(Effect.orDie)
    })

    const docList = Effect.fn("Initiative.docList")(function* (id: ID) {
      const initiative = yield* requireById(id)
      const dir = docsDir(initiative.name)
      // The docs folder can be missing after external cleanup; an initiative without a folder has no docs.
      const entries = yield* fs
        .readDirectoryEntries(dir)
        .pipe(Effect.catch(() => Effect.succeed([] as FSUtil.DirEntry[])))
      return yield* Effect.all(
        entries
          .filter((entry) => entry.type === "file" && entry.name.endsWith(".md"))
          .toSorted((a, b) => a.name.localeCompare(b.name))
          .map((entry) =>
            fs.stat(path.join(dir, entry.name)).pipe(
              Effect.map(
                (stat): DocInfo => ({
                  name: entry.name,
                  timeUpdated: Option.getOrElse(stat.mtime, () => new Date(0)).getTime(),
                }),
              ),
              // A doc can vanish between readdir and stat under external edits.
              Effect.catch(() => Effect.succeed({ name: entry.name, timeUpdated: 0 })),
            ),
          ),
      )
    })

    const docRead = Effect.fn("Initiative.docRead")(function* (id: ID, name: string) {
      const initiative = yield* requireById(id)
      const file = path.join(docsDir(initiative.name), name)
      // A directory named like a doc is not a doc, so read must 404, not 500.
      const stat = yield* fs.stat(file).pipe(Effect.catch(() => Effect.void))
      if (stat?.type !== "File") return yield* new NotFoundError({ message: `Doc not found: ${name}` })
      const content = yield* fs.readFileStringSafe(file).pipe(Effect.orDie)
      if (content === undefined) return yield* new NotFoundError({ message: `Doc not found: ${name}` })
      return content
    })

    return Service.of({ list, create, remove, docList, docRead })
  }),
)

export const node: LayerNode.Provider<Service, never, typeof Node.tags.values.global> = Node.makeGlobalNode({
  service: Service,
  layer,
  deps: [Database.node, FSUtil.node, Global.node],
})
