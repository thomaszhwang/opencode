import { Initiative } from "@opencode/schema/initiative"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import { ConflictError, InitiativeNotFoundError } from "../errors.js"

const root = "/api/initiative"

export const InitiativeGroup = HttpApiGroup.make("server.initiative")
  .add(
    HttpApiEndpoint.get("initiative.list", root, {
      success: Schema.Array(Initiative.Info),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "initiative.list",
        summary: "List initiatives",
        description: "Get all initiatives saved on this server.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("initiative.create", root, {
      payload: Initiative.CreateInput,
      success: Initiative.Info,
      error: ConflictError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "initiative.create",
        summary: "Create initiative",
        description: "Create an initiative grouping sessions under an `Initiative:<Name>` tag.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.delete("initiative.remove", `${root}/:initiativeID`, {
      params: { initiativeID: Initiative.ID },
      success: Schema.Boolean,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "initiative.remove",
        summary: "Delete initiative",
        description: "Delete an initiative. Sessions keep their tags and docs stay on disk.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("initiative.doc.list", `${root}/:initiativeID/doc`, {
      params: { initiativeID: Initiative.ID },
      success: Schema.Array(Initiative.DocInfo),
      error: InitiativeNotFoundError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "initiative.doc.list",
        summary: "List initiative docs",
        description: "List the markdown documents in an initiative's on-disk docs folder.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("initiative.doc.read", `${root}/:initiativeID/doc/:name`, {
      params: { initiativeID: Initiative.ID, name: Initiative.DocName },
      success: Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/markdown; charset=utf-8" })),
      error: InitiativeNotFoundError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "initiative.doc.read",
        summary: "Read initiative doc",
        description: "Read a markdown document from an initiative's on-disk docs folder.",
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "initiative", description: "Initiative routes." }))
