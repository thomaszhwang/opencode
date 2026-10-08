import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Label } from "@/label/label"
import { described } from "./metadata"

export const LabelPaths = {
  list: "/label",
  create: "/label",
  remove: "/label/:labelID",
} as const

export const LabelApi = HttpApi.make("label").add(
  HttpApiGroup.make("label")
    .add(
      HttpApiEndpoint.get("list", LabelPaths.list, {
        success: described(Schema.Array(Label.Info), "All labels"),
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "label.list",
          summary: "List labels",
          description: "Get all session labels saved on this server.",
        }),
      ),
      HttpApiEndpoint.post("create", LabelPaths.create, {
        payload: Label.CreateInput,
        success: described(Label.Info, "Created label"),
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "label.create",
          summary: "Create label",
          description: "Create a named session label grouping a fixed set of tags.",
        }),
      ),
      HttpApiEndpoint.delete("remove", LabelPaths.remove, {
        params: { labelID: Schema.String },
        success: described(Schema.Boolean, "Label removed"),
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "label.remove",
          summary: "Delete label",
          description: "Delete a session label. Sessions keep their tags.",
        }),
      ),
    )
    .annotateMerge(OpenApi.annotations({ title: "label", description: "Session label routes." })),
)
