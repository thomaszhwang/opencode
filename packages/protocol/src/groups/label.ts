import { Label } from "@opencode/schema/label"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"

const root = "/api/label"

export const LabelGroup = HttpApiGroup.make("server.label")
  .add(
    HttpApiEndpoint.get("label.list", root, {
      success: Schema.Array(Label.Info),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "label.list",
        summary: "List labels",
        description: "Get all session labels saved on this server.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("label.create", root, {
      payload: Label.CreateInput,
      success: Label.Info,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "label.create",
        summary: "Create label",
        description: "Create a named session label grouping a fixed set of tags.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.delete("label.remove", `${root}/:labelID`, {
      params: { labelID: Schema.String },
      success: Schema.Boolean,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "label.remove",
        summary: "Delete label",
        description: "Delete a session label. Sessions keep their tags.",
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "label", description: "Session label routes." }))
