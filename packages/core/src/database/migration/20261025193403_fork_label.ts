import { sql } from "drizzle-orm"
import { Effect } from "effect"
import type { DatabaseMigration } from "../migration.js"

const migration: DatabaseMigration.Migration = {
  id: "20261025193403_fork_label",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE \`_fork_label\` (
          \`id\` text PRIMARY KEY,
          \`name\` text NOT NULL,
          \`tags\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL
        );
      `)
      // Fork v1 databases carry an unprefixed `label` table, a namespace upstream
      // reserves; its rows move to the embedder table and the old table drops.
      const legacy = yield* tx.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'label'`)
      if (!legacy) return
      yield* tx.run(`
        INSERT INTO \`_fork_label\` (\`id\`, \`name\`, \`tags\`, \`time_created\`, \`time_updated\`)
        SELECT \`id\`, \`name\`, \`tags\`, \`time_created\`, \`time_updated\`
        FROM \`label\`;
      `)
      yield* tx.run(`DROP TABLE \`label\`;`)
    })
  },
}

export default migration
