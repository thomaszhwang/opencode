import { createMemo, For, Show } from "solid-js"
import type { SessionInfo } from "@opencode/client/promise"
import { useDialog } from "@opencode/ui/context/dialog"
import { Icon } from "@opencode/ui/icon"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"
import { DialogSessionNote } from "../dialog-session-note"
import { DialogSessionTags } from "../dialog-session-tags"
import { hasNote } from "../session-note"
import { sessionTagsFromMetadata } from "../session-tags"

// Tag pills and the tag/note edit actions shared by the session headers. The
// client sync cache short-circuits a refetch once a session has synced, so a
// same-run reopen serves the store record: read it live rather than trusting
// the passed snapshot (session.metadata.updated keeps it current).
export function SessionMetadataControls(props: { sessionID?: string; session?: SessionInfo }) {
  const server = useServer()
  const language = useLanguage()
  const dialog = useDialog()

  const info = createMemo(() => {
    const id = props.sessionID
    if (!id) return props.session
    return server.ctx.data.session.get(id) ?? props.session
  })

  const tags = createMemo(() => sessionTagsFromMetadata(info()))
  const noteExists = createMemo(() => hasNote(info()))

  const editTags = () => {
    const session = info()
    if (!session) return
    void dialog.show(() => <DialogSessionTags session={session} metadata={server.ctx.sessionMetadata} />)
  }

  const editNote = () => {
    const session = info()
    if (!session) return
    void dialog.show(() => <DialogSessionNote session={session} metadata={server.ctx.sessionMetadata} />)
  }

  return (
    // A pending session has no record yet; the controls pop in when it lands.
    <Show when={info()}>
      <Show when={tags().length > 0}>
        <button
          type="button"
          data-slot="session-title-tags"
          class="flex min-w-0 items-center gap-1 overflow-hidden rounded-[6px] px-1 py-0.5 hover:bg-v2-overlay-simple-overlay-hover"
          onClick={editTags}
          aria-label={language.t("dialog.session.tags.title")}
        >
          <For each={tags()}>
            {(tag) => (
              <span
                class={`
                  shrink-0 rounded-[4px] bg-v2-background-bg-layer-02 px-1.5 py-0.5
                  text-[11px] leading-3 text-v2-text-text-muted [font-weight:440]
                `}
              >
                {tag}
              </span>
            )}
          </For>
        </button>
      </Show>
      <button
        type="button"
        data-slot="session-title-tags-edit"
        class="flex shrink-0 items-center rounded-[6px] px-1 py-0.5 hover:bg-v2-overlay-simple-overlay-hover"
        classList={{
          "text-v2-icon-icon-base": tags().length > 0,
          "text-v2-icon-icon-muted": tags().length === 0,
        }}
        onClick={editTags}
        aria-label={language.t("dialog.session.tags.title")}
      >
        <Icon name="tag" size="small" />
      </button>
      <button
        type="button"
        data-slot="session-title-note"
        class="flex shrink-0 items-center rounded-[6px] px-1 py-0.5 hover:bg-v2-overlay-simple-overlay-hover"
        classList={{
          "text-v2-icon-icon-base": noteExists(),
          "text-v2-icon-icon-muted": !noteExists(),
        }}
        onClick={editNote}
        aria-label={language.t("dialog.session.note.title")}
      >
        <Icon name="note" size="small" />
      </button>
    </Show>
  )
}
