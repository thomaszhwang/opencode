import { useDialog } from "@opencode/ui/context/dialog"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Divider } from "@opencode/ui/divider"
import { Textarea } from "@opencode/ui/textarea"
import type { SessionInfo } from "@opencode/client/promise"
import { createSignal, Show } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import { hasNote, sessionNote } from "@/session/session-note"
import { resolveCurrentSession, type SessionMetadataController } from "@/session/session-metadata"
import { sessionTitle } from "@/session/title"

export function DialogSessionNote(props: { session: SessionInfo; metadata: SessionMetadataController }) {
  const language = useLanguage()
  const dialog = useDialog()
  const notes = props.metadata.note

  const current = () => resolveCurrentSession(notes.session(props.session.id), props.session)
  const [draft, setDraft] = createSignal(sessionNote(current()))

  const save = async (text: string) => {
    // Keep the dialog (and the draft) open when the write fails; the store
    // already toasted the reason.
    if (!(await notes.setNote(props.session, text))) return
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
        <Divider />
        <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-3 overflow-y-auto px-4 pt-4 pb-1">
          <div class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-4 text-v2-text-text-muted [font-weight:440]">
            {sessionTitle(props.session.title) || props.session.id}
          </div>
          <Textarea
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
            <Button variant="ghost-muted" size="normal" type="button" class="mr-auto" onClick={() => void save("")}>
              {language.t("common.delete")}
            </Button>
          </Show>
          <Button variant="ghost-muted" size="normal" type="button" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </Button>
          <Button variant="neutral" size="normal" type="submit">
            {language.t("common.save")}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
