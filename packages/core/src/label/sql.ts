import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../database/schema.sql.js"

export const LabelTable = sqliteTable("_fork_label", {
  id: text().primaryKey(),
  name: text().notNull(),
  tags: text({ mode: "json" }).$type<string[]>().notNull(),
  ...Timestamps,
})
