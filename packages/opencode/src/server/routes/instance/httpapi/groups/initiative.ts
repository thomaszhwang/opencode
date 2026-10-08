import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { Initiative } from "@/initiative/initiative"
import { ApiNotFoundError, ConflictError } from "../errors"
import { described } from "./metadata"

export const InitiativePaths = {
  list: "/initiative",
  create: "/initiative",
  remove: "/initiative/:initiativeID",
  docList: "/initiative/:initiativeID/doc",
  docRead: "/initiative/:initiativeID/doc/:name",
} as const

export const InitiativeApi = HttpApi.make("initiative").add(
  HttpApiGroup.make("initiative")
    .add(
      HttpApiEndpoint.get("list", InitiativePaths.list, {
        success: described(Schema.Array(Initiative.Info), "All initiatives"),
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "initiative.list",
          summary: "List initiatives",
          description: "Get all initiatives saved on this server.",
        }),
      ),
      HttpApiEndpoint.post("create", InitiativePaths.create, {
        payload: Initiative.CreateInput,
        success: described(Initiative.Info, "Created initiative"),
        error: [ConflictError],
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "initiative.create",
          summary: "Create initiative",
          description: "Create an initiative grouping sessions under an `Initiative:<Name>` tag.",
        }),
      ),
      HttpApiEndpoint.delete("remove", InitiativePaths.remove, {
        params: { initiativeID: Schema.String },
        success: described(Schema.Boolean, "Initiative removed"),
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "initiative.remove",
          summary: "Delete initiative",
          description: "Delete an initiative. Sessions keep their tags and docs stay on disk.",
        }),
      ),
      HttpApiEndpoint.get("docList", InitiativePaths.docList, {
        params: { initiativeID: Schema.String },
        success: described(Schema.Array(Initiative.DocInfo), "Initiative docs"),
        error: [ApiNotFoundError],
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "initiative.doc.list",
          summary: "List initiative docs",
          description: "List the markdown documents in an initiative's on-disk docs folder.",
        }),
      ),
      HttpApiEndpoint.get("docRead", InitiativePaths.docRead, {
        params: { initiativeID: Schema.String, name: Initiative.DocName },
        success: described(
          Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/markdown; charset=utf-8" })),
          "Raw initiative doc",
        ),
        error: [ApiNotFoundError],
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "initiative.doc.read",
          summary: "Read initiative doc",
          description: "Read a markdown document from an initiative's on-disk docs folder.",
        }),
      ),
    )
    .annotateMerge(OpenApi.annotations({ title: "initiative", description: "Initiative routes." })),
)
