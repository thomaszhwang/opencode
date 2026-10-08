import { useDialog } from "@opencode-ai/ui/context/dialog"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode-ai/ui/v2/dialog-v2"
import { DividerV2 } from "@opencode-ai/ui/v2/divider-v2"
import { TextareaV2 } from "@opencode-ai/ui/v2/textarea-v2"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { createSignal, Show } from "solid-js"
import { useLanguage } from "@/context/language"
import { hasNote, sessionNote, useSessionNote } from "@/context/session-note"
import { sessionTitle } from "@/utils/session-title"

export function DialogSessionNote(props: { session: Session }) {
  const language = useLanguage()
  const dialog = useDialog()
  const notes = useSessionNote()

  // Prefer the live synced session once it is strictly newer than the passed
  // one (it updates after writes via SSE); otherwise trust the passed session.
  const current = () => {
    const live = notes.session(props.session.id)
    return live && live.time.updated > props.session.time.updated ? live : props.session
  }
  const [draft, setDraft] = createSignal(sessionNote(current()))

  const save = async (text: string) => {
    await notes.setNote(props.session, text)
    dialog.close()
  }

  return (
    <Dialog fit>
      <form
        class="contents"
        onSubmit={(event) => {
          event.preventDefault()
          void save(draft())
        }}
      >
        <DialogHeader>
          <DialogTitle>{language.t("dialog.session.note.title")}</DialogTitle>
        </DialogHeader>
        <DividerV2 />
        <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-3 overflow-y-auto px-4 pt-4 pb-1">
          <div class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-4 text-v2-text-text-muted [font-weight:440]">
            {sessionTitle(props.session.title) || props.session.id}
          </div>
          <TextareaV2
            autofocus
            class="!w-full"
            rows={6}
            value={draft()}
            placeholder={language.t("dialog.session.note.placeholder")}
            onInput={(event) => setDraft(event.currentTarget.value)}
          />
        </DialogBody>
        <DialogFooter>
          <Show when={hasNote(current())}>
            <ButtonV2 variant="ghost-muted" size="normal" type="button" class="mr-auto" onClick={() => void save("")}>
              {language.t("common.delete")}
            </ButtonV2>
          </Show>
          <ButtonV2 variant="ghost-muted" size="normal" type="button" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </ButtonV2>
          <ButtonV2 variant="neutral" size="normal" type="submit">
            {language.t("common.save")}
          </ButtonV2>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
