import { useDialog } from "@opencode-ai/ui/context/dialog"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode-ai/ui/v2/dialog-v2"
import { DividerV2 } from "@opencode-ai/ui/v2/divider-v2"
import { Field } from "@opencode-ai/ui/v2/field-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { createSignal } from "solid-js"
import { useLanguage } from "@/context/language"
import { useSessionTags } from "@/context/session-tags"
import { SessionTagEditor } from "./session-tag-editor"

export function DialogSessionLabel() {
  const language = useLanguage()
  const dialog = useDialog()
  const tags = useSessionTags()
  const [name, setName] = createSignal("")
  const [selected, setSelected] = createSignal<string[]>([])

  const valid = () => name().trim().length > 0 && selected().length > 0

  const save = async () => {
    if (!valid()) return
    const label = await tags.createLabel(name(), selected())
    if (!label) return
    tags.select(label.id)
    dialog.close()
  }

  return (
    <Dialog fit>
      <form
        class="contents"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <DialogHeader>
          <DialogTitle>{language.t("dialog.session.label.title")}</DialogTitle>
        </DialogHeader>
        <DividerV2 />
        <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-6 overflow-y-auto px-4 pt-4 pb-1">
          <Field>
            <Field.Label>{language.t("dialog.session.label.name")}</Field.Label>
            <TextInputV2
              autofocus
              appearance="large"
              class="!w-full"
              value={name()}
              placeholder={language.t("dialog.session.label.name.placeholder")}
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </Field>
          <Field>
            <Field.Label>{language.t("dialog.session.label.tags")}</Field.Label>
            <SessionTagEditor
              tags={selected()}
              suggestions={tags.all()}
              placeholder={language.t("dialog.session.tags.placeholder")}
              onAdd={(tag) => setSelected((current) => [...current, tag])}
              onRemove={(tag) => setSelected((current) => current.filter((item) => item !== tag))}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <ButtonV2 variant="ghost-muted" size="normal" type="button" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </ButtonV2>
          <ButtonV2 variant="neutral" size="normal" type="submit" disabled={!valid()}>
            {language.t("common.save")}
          </ButtonV2>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
