import { useDialog } from "@opencode/ui/context/dialog"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Divider } from "@opencode/ui/divider"
import { Field } from "@opencode/ui/field"
import { TextInput } from "@opencode/ui/text-input"
import { useNavigate } from "@solidjs/router"
import { createSignal } from "solid-js"
import type { InitiativeInfo } from "@opencode/client/promise"
import { useLanguage } from "@/runtime/i18n/language"
import type { ServerConnection } from "@/runtime/server/registry"
import { initiativeHref } from "@/shell/routes/session"

export function DialogInitiative(props: {
  server: ServerConnection.Key
  create: (name: string) => Promise<InitiativeInfo | undefined>
}) {
  const language = useLanguage()
  const dialog = useDialog()
  const navigate = useNavigate()
  const [name, setName] = createSignal("")
  const [saving, setSaving] = createSignal(false)

  const save = async () => {
    if (saving()) return
    setSaving(true)
    const initiative = await props.create(name())
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
        <Divider />
        <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-6 overflow-y-auto px-4 pt-4 pb-1">
          <Field>
            <Field.Label>{language.t("dialog.initiative.new.name")}</Field.Label>
            <TextInput
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
          <Button variant="ghost-muted" size="normal" type="button" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </Button>
          <Button variant="neutral" size="normal" type="submit" disabled={!name().trim() || saving()}>
            {language.t("common.save")}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
