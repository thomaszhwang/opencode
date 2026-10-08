import { Database } from "@opencode-ai/core/database/database"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Global } from "@opencode-ai/core/global"
import { InitiativeTable } from "@opencode-ai/core/initiative/sql"
import { asc, eq } from "drizzle-orm"
import { Context, Effect, Layer, Option, Schema } from "effect"
import path from "path"
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

export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()("Initiative.NotFoundError", {
  message: Schema.String,
}) {}

// A doc name is both a URL path segment and a file name inside the initiative
// folder, so the charset must rule out path traversal (`/`, `..`) by
// construction.
export const DocName = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9][A-Za-z0-9 ._-]*\.md$/))

export const DocInfo = Schema.Struct({
  name: Schema.String,
  timeUpdated: Schema.Number,
})
export type DocInfo = Schema.Schema.Type<typeof DocInfo>

export interface Interface {
  readonly list: () => Effect.Effect<Info[]>
  readonly create: (input: CreateInput) => Effect.Effect<Info, NameConflictError>
  readonly remove: (id: string) => Effect.Effect<void>
  readonly docList: (id: string) => Effect.Effect<DocInfo[], NotFoundError>
  readonly docRead: (id: string, name: string) => Effect.Effect<string, NotFoundError>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Initiative") {}

// Docs live in the server-global data dir (not a project dir) because
// initiatives span projects; files on disk are the source of truth.
const docsDir = (name: string) => path.join(Global.Path.data, "initiative", name)

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const { db } = yield* Database.Service
    const fs = yield* FSUtil.Service

    const requireById = Effect.fn("Initiative.requireById")(function* (id: string) {
      const rows = yield* db.select().from(InitiativeTable).where(eq(InitiativeTable.id, id)).all().pipe(Effect.orDie)
      const row = rows[0]
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
      yield* fs.ensureDir(docsDir(input.name)).pipe(Effect.orDie)
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

    const docList = Effect.fn("Initiative.docList")(function* (id: string) {
      const initiative = yield* requireById(id)
      const dir = docsDir(initiative.name)
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
                (info): DocInfo => ({
                  name: entry.name,
                  timeUpdated: Option.getOrElse(info.mtime, () => new Date(0)).getTime(),
                }),
              ),
              // A doc can vanish between readdir and stat under external edits.
              Effect.catch(() => Effect.succeed({ name: entry.name, timeUpdated: 0 })),
            ),
          ),
      )
    })

    const docRead = Effect.fn("Initiative.docRead")(function* (id: string, name: string) {
      const initiative = yield* requireById(id)
      const content = yield* fs.readFileStringSafe(path.join(docsDir(initiative.name), name)).pipe(
        // Reading a directory named `*.md` fails with BadResource — not a doc, so 404.
        Effect.catchReason("PlatformError", "BadResource", () => Effect.succeed(undefined)),
        Effect.orDie,
      )
      if (content === undefined) return yield* new NotFoundError({ message: `Doc not found: ${name}` })
      return content
    })

    return Service.of({ list, create, remove, docList, docRead })
  }),
)

export const node = LayerNode.make({ service: Service, layer, deps: [Database.node, FSUtil.node] })

export * as Initiative from "./initiative"
