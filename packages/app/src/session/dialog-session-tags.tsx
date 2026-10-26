import { useDialog } from "@opencode/ui/context/dialog"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Divider } from "@opencode/ui/divider"
import type { SessionInfo } from "@opencode/client/promise"
import { useLanguage } from "@/runtime/i18n/language"
import { sessionTagsFromMetadata } from "@/session/session-tags"
import { resolveCurrentSession, type SessionMetadataController } from "@/session/session-metadata"
import { sessionTitle } from "@/session/title"
import { SessionTagEditor } from "./session-tag-editor"

export function DialogSessionTags(props: { session: SessionInfo; metadata: SessionMetadataController }) {
  const language = useLanguage()
  const dialog = useDialog()
  const tags = props.metadata.tags

  const current = () => sessionTagsFromMetadata(resolveCurrentSession(tags.session(props.session.id), props.session))

  return (
    <Dialog fit>
      <DialogHeader>
        <DialogTitle>{language.t("dialog.session.tags.title")}</DialogTitle>
      </DialogHeader>
      <Divider />
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
        <Button variant="neutral" size="normal" onClick={() => dialog.close()}>
          {language.t("common.close")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
