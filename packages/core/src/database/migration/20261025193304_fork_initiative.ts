import { Effect } from "effect"
import type { DatabaseMigration } from "../migration.js"

const migration: DatabaseMigration.Migration = {
  id: "20261025193304_fork_initiative",
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
      // The fork's v1 `initiative` table only exists on databases carried over
      // from v1; upstream reserves unprefixed names, so copy the rows forward
      // and drop it.
      const legacy = yield* tx.all<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'initiative'`,
      )
      if (legacy.length === 0) return
      yield* tx.run(`
        INSERT INTO \`_fork_initiative\` (\`id\`, \`name\`, \`status\`, \`time_created\`, \`time_updated\`)
        SELECT \`id\`, \`name\`, \`status\`, \`time_created\`, \`time_updated\`
        FROM \`initiative\`;
      `)
      yield* tx.run(`DROP TABLE \`initiative\`;`)
    })
  },
}

export default migration
