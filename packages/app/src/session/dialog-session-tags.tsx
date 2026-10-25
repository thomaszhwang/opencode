import type { SessionInfo } from "@opencode/client/promise"
import { Button } from "@opencode/ui/button"
import { useDialog } from "@opencode/ui/context/dialog"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"
import { resolveCurrentSession } from "./session-metadata"
import { sessionTagsFromMetadata } from "./session-tags"
import { SessionTagEditor } from "./session-tag-editor"
import { sessionTitle } from "./title"

export function DialogSessionTags(props: { session: SessionInfo }) {
  const language = useLanguage()
  const dialog = useDialog()
  const metadata = useServer().ctx.sessionMetadata

  const current = () => resolveCurrentSession(metadata.tags.session(props.session.id), props.session)

  return (
    <Dialog fit>
      <DialogHeader>
        <DialogTitle>{language.t("dialog.session.tags.title")}</DialogTitle>
      </DialogHeader>
      <DialogBody class="flex max-h-[min(560px,calc(100vh-160px))] w-full flex-col gap-3 overflow-y-auto px-4 pt-4 pb-1">
        <div class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-4 text-v2-text-text-muted [font-weight:440]">
          {sessionTitle(props.session.title) || props.session.id}
        </div>
        <SessionTagEditor
          autofocus
          tags={sessionTagsFromMetadata(current())}
          suggestions={metadata.tags.all()}
          placeholder={language.t("dialog.session.tags.placeholder")}
          onAdd={(tag) => void metadata.tags.setTags(props.session, (existing) => [...existing, tag])}
          onRemove={(tag) => void metadata.tags.setTags(props.session, (existing) => existing.filter((item) => item !== tag))}
        />
      </DialogBody>
      <DialogFooter>
        <Button variant="neutral" onClick={() => dialog.close()}>
          {language.t("common.close")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
