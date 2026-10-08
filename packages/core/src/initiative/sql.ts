import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const InitiativeTable = sqliteTable("initiative", {
  id: text().primaryKey(),
  name: text().notNull(),
  status: text()
    .$type<"active" | "done" | "archived">()
    .notNull()
    .$default(() => "active"),
  time_created: integer()
    .notNull()
    .$default(() => Date.now()),
  time_updated: integer()
    .notNull()
    .$default(() => Date.now()),
})
