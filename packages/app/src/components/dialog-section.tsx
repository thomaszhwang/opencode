import { useDialog } from "@opencode-ai/ui/context/dialog"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode-ai/ui/v2/dialog-v2"
import { DividerV2 } from "@opencode-ai/ui/v2/divider-v2"
import { Field } from "@opencode-ai/ui/v2/field-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { createSignal, Show } from "solid-js"
import { useLabels } from "@/context/labels"
import { useLanguage } from "@/context/language"
import { useSessionTags } from "@/context/session-tags"
import { normalizeSessionTags } from "@/utils/session-tags"
import { SessionTagEditor } from "./session-tag-editor"

export function DialogSection() {
  const language = useLanguage()
  const dialog = useDialog()
  const labels = useLabels()
  const tags = useSessionTags()
  const [name, setName] = createSignal("")
  const [selected, setSelected] = createSignal<string[]>([])
  const [saving, setSaving] = createSignal(false)

  const duplicate = () => {
    const clean = name().trim().toLowerCase()
    return !!clean && labels.list().some((label) => label.name.toLowerCase() === clean)
  }
  const valid = () => !!name().trim() && selected().length > 0 && !duplicate()

  const save = async () => {
    if (saving() || !valid()) return
    setSaving(true)
    const label = await labels.create(name(), selected())
    if (!label) {
      setSaving(false)
      return
    }
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
          <DialogTitle>{language.t("dialog.section.new.title")}</DialogTitle>
        </DialogHeader>
        <DividerV2 />
        <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-6 overflow-y-auto px-4 pt-4 pb-1">
          <Field>
            <Field.Label>{language.t("dialog.section.new.name")}</Field.Label>
            <TextInputV2
              autofocus
              appearance="large"
              class="!w-full"
              value={name()}
              placeholder={language.t("dialog.section.new.name.placeholder")}
              onInput={(event) => setName(event.currentTarget.value)}
            />
            <Show when={duplicate()}>
              <div class="text-[12px] leading-4 text-v2-state-fg-danger [font-weight:440]">
                {language.t("dialog.section.new.duplicate")}
              </div>
            </Show>
          </Field>
          <Field>
            <Field.Label>{language.t("dialog.section.new.tags")}</Field.Label>
            <SessionTagEditor
              tags={selected()}
              suggestions={tags.all()}
              placeholder={language.t("dialog.session.tags.placeholder")}
              onAdd={(tag) => setSelected(normalizeSessionTags([...selected(), tag]))}
              onRemove={(tag) => setSelected(selected().filter((item) => item !== tag))}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <ButtonV2 variant="ghost-muted" size="normal" type="button" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </ButtonV2>
          <ButtonV2 variant="neutral" size="normal" type="submit" disabled={!valid() || saving()}>
            {language.t("common.save")}
          </ButtonV2>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
