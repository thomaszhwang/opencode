import { useDialog } from "@opencode/ui/context/dialog"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Divider } from "@opencode/ui/divider"
import { Field } from "@opencode/ui/field"
import { TextInput } from "@opencode/ui/text-input"
import { createSignal, Show } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import { normalizeSessionTags } from "@/session/session-tags"
import { SessionTagEditor } from "@/session/session-tag-editor"

export function DialogSection(props: {
  labels: () => { name: string }[]
  suggestions: () => string[]
  create: (name: string, tags: string[]) => Promise<unknown>
}) {
  const language = useLanguage()
  const dialog = useDialog()
  const [name, setName] = createSignal("")
  const [selected, setSelected] = createSignal<string[]>([])
  const [saving, setSaving] = createSignal(false)

  const duplicate = () => {
    const clean = name().trim().toLowerCase()
    return !!clean && props.labels().some((label) => label.name.toLowerCase() === clean)
  }
  const valid = () => !!name().trim() && selected().length > 0 && !duplicate()

  const save = async () => {
    if (saving() || !valid()) return
    setSaving(true)
    const label = await props.create(name(), selected())
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
        <Divider />
        <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-6 overflow-y-auto px-4 pt-4 pb-1">
          <Field>
            <Field.Label>{language.t("dialog.section.new.name")}</Field.Label>
            <TextInput
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
              suggestions={props.suggestions()}
              placeholder={language.t("dialog.session.tags.placeholder")}
              onAdd={(tag) => setSelected(normalizeSessionTags([...selected(), tag]))}
              onRemove={(tag) => setSelected(selected().filter((item) => item !== tag))}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost-muted" size="normal" type="button" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </Button>
          <Button variant="neutral" size="normal" type="submit" disabled={!valid() || saving()}>
            {language.t("common.save")}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
