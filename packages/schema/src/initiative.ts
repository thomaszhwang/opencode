export * as Initiative from "./initiative.js"

import { Schema } from "effect"
import { ascending } from "./identifier.js"
import { optional, statics } from "./schema.js"

export const ID = Schema.String.check(Schema.isStartingWith("ini_")).pipe(
  Schema.brand("Initiative.ID"),
  Schema.annotate({ identifier: "Initiative.ID" }),
  statics((schema) => ({ create: () => schema.make("ini_" + ascending()) })),
)
export type ID = typeof ID.Type

export const Status = Schema.Literals(["active", "done", "archived"])
export type Status = typeof Status.Type

export const Info = Schema.Struct({
  id: ID,
  name: Schema.String,
  status: Status,
  timeCreated: Schema.Number,
  timeUpdated: Schema.Number,
}).annotate({ identifier: "Initiative.Info" })
export interface Info extends Schema.Schema.Type<typeof Info> {}

// The name is the `Initiative:<Name>` tag segment and the on-disk docs folder
// name, so it can't contain `:` or path separators, and can't be `.` or `..`
// (both resolve outside the initiative docs folder).
export const Name = Schema.String.check(Schema.isMinLength(1)).check(Schema.isPattern(/^(?!\.{1,2}$)[^:/\\]+$/))

export const CreateInput = Schema.Struct({
  name: Name,
  status: optional(Status),
}).annotate({ identifier: "Initiative.CreateInput" })
export interface CreateInput extends Schema.Schema.Type<typeof CreateInput> {}

// A doc name is both a URL path segment and a file name inside the initiative
// folder, so the charset must rule out path traversal (`/`, `..`) by
// construction.
export const DocName = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9][A-Za-z0-9 ._-]*\.md$/))

export const DocInfo = Schema.Struct({
  name: Schema.String,
  timeUpdated: Schema.Number,
}).annotate({ identifier: "Initiative.DocInfo" })
export interface DocInfo extends Schema.Schema.Type<typeof DocInfo> {}
