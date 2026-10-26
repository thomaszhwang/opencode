import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import type { Initiative } from "@opencode/schema/initiative"

export const InitiativeTable = sqliteTable("_fork_initiative", {
  id: text().primaryKey().$type<Initiative.ID>(),
  name: text().notNull(),
  status: text()
    .$type<Initiative.Status>()
    .notNull()
    .$default(() => "active"),
  time_created: integer()
    .notNull()
    .$default(() => Date.now()),
  time_updated: integer()
    .notNull()
    .$default(() => Date.now()),
})
