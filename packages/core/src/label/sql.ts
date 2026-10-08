import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const LabelTable = sqliteTable("label", {
  id: text().primaryKey(),
  name: text().notNull(),
  tags: text({ mode: "json" }).$type<string[]>().notNull(),
  time_created: integer()
    .notNull()
    .$default(() => Date.now()),
  time_updated: integer()
    .notNull()
    .$default(() => Date.now()),
})
