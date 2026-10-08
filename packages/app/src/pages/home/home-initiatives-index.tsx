import { A } from "@solidjs/router"
import { type Accessor, For } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Icon as IconV2 } from "@opencode-ai/ui/v2/icon"
import { DialogInitiative } from "@/components/dialog-initiative"
import { useInitiatives, type InitiativeInfo } from "@/context/initiatives"
import { useLanguage } from "@/context/language"
import type { ServerConnection } from "@/context/server"
import { initiativeHref } from "@/utils/session-route"

export function HomeInitiativesIndex(props: { server: Accessor<ServerConnection.Key> }) {
  const language = useLanguage()
  const dialog = useDialog()
  const initiatives = useInitiatives()

  return (
    <div data-component="home-initiatives-index" class="flex items-center gap-1.5 overflow-x-auto pt-2">
      <For each={initiatives.list()}>
        {(initiative) => (
          <HomeInitiativeChip
            initiative={initiative}
            count={initiatives.counts().get(initiative.id) ?? 0}
            href={initiativeHref(props.server(), initiative.id)}
            onRemove={() => void initiatives.remove(initiative.id)}
          />
        )}
      </For>
      <button
        type="button"
        data-component="home-initiative-new"
        class={`
          flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5
          text-[12px] leading-4 text-v2-text-text-faint [font-weight:530]
          transition-[background-color,color] duration-[120ms] ease-in-out
          hover:bg-v2-background-bg-layer-02 hover:text-v2-text-text-muted
          focus-visible:bg-v2-background-bg-layer-02 focus-visible:outline-none
        `}
        onClick={() => void dialog.show(() => <DialogInitiative server={props.server()} />)}
      >
        <IconV2 name="plus" />
        {language.t("home.sessions.initiatives.new")}
      </button>
    </div>
  )
}

function HomeInitiativeChip(props: {
  initiative: InitiativeInfo
  count: number
  href: string
  onRemove: () => void
}) {
  const language = useLanguage()
  return (
    <span
      data-component="home-initiative-chip"
      class={`
        group/initiative flex h-6 shrink-0 items-center rounded-full pl-2.5 pr-1.5
        bg-v2-background-bg-layer-02/60 text-[12px] leading-4 text-v2-text-text-muted [font-weight:530]
        transition-[background-color,color] duration-[120ms] ease-in-out
        hover:bg-v2-background-bg-layer-02 hover:text-v2-text-text-base
      `}
    >
      <A href={props.href} class="flex h-6 cursor-pointer items-center gap-1.5 focus-visible:outline-none">
        {props.initiative.name}
        <span class="text-v2-text-text-faint [font-weight:440]">{props.count}</span>
      </A>
      <button
        type="button"
        aria-label={language.t("home.sessions.initiatives.remove", { name: props.initiative.name })}
        class={`
          flex shrink-0 cursor-pointer items-center text-v2-icon-icon-muted
          opacity-0 transition-opacity duration-[120ms] ease-in-out
          group-hover/initiative:opacity-100 hover:text-v2-icon-icon-base focus-visible:opacity-100
        `}
        onClick={props.onRemove}
      >
        <IconV2 name="xmark-small" />
      </button>
    </span>
  )
}
