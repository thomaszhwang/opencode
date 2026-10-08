import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Initiative } from "@/initiative/initiative"
import { ConflictError } from "../errors"
import { described } from "./metadata"

export const InitiativePaths = {
  list: "/initiative",
  create: "/initiative",
  remove: "/initiative/:initiativeID",
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
    )
    .annotateMerge(OpenApi.annotations({ title: "initiative", description: "Initiative routes." })),
)
