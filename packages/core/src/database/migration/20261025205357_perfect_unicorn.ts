import { Effect } from "effect"
import type { DatabaseMigration } from "../migration.js"

const migration: DatabaseMigration.Migration = {
  id: "20261025205357_perfect_unicorn",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE \`_fork_initiative\` (
          \`id\` text PRIMARY KEY,
          \`name\` text NOT NULL,
          \`status\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL
        );
      `)
    })
  },
}

export default migration
