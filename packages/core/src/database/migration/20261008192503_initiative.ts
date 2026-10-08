import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20261008192503_initiative",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE \`initiative\` (
          \`id\` text PRIMARY KEY,
          \`name\` text NOT NULL,
          \`status\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL
        );
      `)
    })
  },
} satisfies DatabaseMigration.Migration
