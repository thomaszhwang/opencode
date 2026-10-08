import { useDialog } from "@opencode-ai/ui/context/dialog"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode-ai/ui/v2/dialog-v2"
import { DividerV2 } from "@opencode-ai/ui/v2/divider-v2"
import { Field } from "@opencode-ai/ui/v2/field-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { useNavigate } from "@solidjs/router"
import { createSignal } from "solid-js"
import { useInitiatives } from "@/context/initiatives"
import { useLanguage } from "@/context/language"
import type { ServerConnection } from "@/context/server"
import { initiativeHref } from "@/utils/session-route"

export function DialogInitiative(props: { server: ServerConnection.Key }) {
  const language = useLanguage()
  const dialog = useDialog()
  const initiatives = useInitiatives()
  const navigate = useNavigate()
  const [name, setName] = createSignal("")
  const [saving, setSaving] = createSignal(false)

  const save = async () => {
    if (saving()) return
    setSaving(true)
    const initiative = await initiatives.create(name())
    if (!initiative) {
      setSaving(false)
      return
    }
    dialog.close()
    navigate(initiativeHref(props.server, initiative.id))
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
          <DialogTitle>{language.t("dialog.initiative.new.title")}</DialogTitle>
        </DialogHeader>
        <DividerV2 />
        <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-6 overflow-y-auto px-4 pt-4 pb-1">
          <Field>
            <Field.Label>{language.t("dialog.initiative.new.name")}</Field.Label>
            <TextInputV2
              autofocus
              appearance="large"
              class="!w-full"
              value={name()}
              placeholder={language.t("dialog.initiative.new.name.placeholder")}
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <ButtonV2 variant="ghost-muted" size="normal" type="button" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </ButtonV2>
          <ButtonV2 variant="neutral" size="normal" type="submit" disabled={!name().trim() || saving()}>
            {language.t("common.save")}
          </ButtonV2>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
