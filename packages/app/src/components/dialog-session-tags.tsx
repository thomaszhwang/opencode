import { useDialog } from "@opencode-ai/ui/context/dialog"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode-ai/ui/v2/dialog-v2"
import { DividerV2 } from "@opencode-ai/ui/v2/divider-v2"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { useLanguage } from "@/context/language"
import { useSessionTags, sessionTagsFromMetadata } from "@/context/session-tags"
import { sessionTitle } from "@/utils/session-title"
import { SessionTagEditor } from "./session-tag-editor"

export function DialogSessionTags(props: { session: Session }) {
  const language = useLanguage()
  const dialog = useDialog()
  const tags = useSessionTags()

  // Prefer the live synced session once it is strictly newer than the passed
  // one (it updates after writes via SSE); otherwise trust the passed session.
  const current = () => {
    const live = tags.session(props.session.id)
    const base = live && live.time.updated > props.session.time.updated ? live : props.session
    return sessionTagsFromMetadata(base)
  }

  return (
    <Dialog fit>
      <DialogHeader>
        <DialogTitle>{language.t("dialog.session.tags.title")}</DialogTitle>
      </DialogHeader>
      <DividerV2 />
      <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-3 overflow-y-auto px-4 pt-4 pb-1">
        <div class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-4 text-v2-text-text-muted [font-weight:440]">
          {sessionTitle(props.session.title) || props.session.id}
        </div>
        <SessionTagEditor
          autofocus
          tags={current()}
          suggestions={tags.all()}
          placeholder={language.t("dialog.session.tags.placeholder")}
          onAdd={(tag) => void tags.setTags(props.session, (existing) => [...existing, tag])}
          onRemove={(tag) => void tags.setTags(props.session, (existing) => existing.filter((item) => item !== tag))}
        />
      </DialogBody>
      <DialogFooter>
        <ButtonV2 variant="neutral" size="normal" onClick={() => dialog.close()}>
          {language.t("common.close")}
        </ButtonV2>
      </DialogFooter>
    </Dialog>
  )
}
