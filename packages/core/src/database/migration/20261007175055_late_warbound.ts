import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20261007175055_late_warbound",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE \`label\` (
          \`id\` text PRIMARY KEY,
          \`name\` text NOT NULL,
          \`tags\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL
        );
      `)
    })
  },
} satisfies DatabaseMigration.Migration
