export * as Label from "./label.js"

import { Schema } from "effect"

export const Info = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  tags: Schema.Array(Schema.String),
}).annotate({ identifier: "Label.Info" })
export interface Info extends Schema.Schema.Type<typeof Info> {}

export const CreateInput = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(1)),
  tags: Schema.Array(Schema.String).check(Schema.isMinLength(1)),
}).annotate({ identifier: "Label.CreateInput" })
export interface CreateInput extends Schema.Schema.Type<typeof CreateInput> {}
