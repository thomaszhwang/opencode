import { A } from "@solidjs/router"
import { For, Show } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import type { InitiativeInfo } from "@opencode/client/promise"
import { useLanguage } from "@/runtime/i18n/language"
import type { ServerConnection } from "@/runtime/server/registry"
import { initiativeHref } from "@/shell/routes/session"

export function HomeInitiativesIndex(props: {
  server: ServerConnection.Key
  initiatives: InitiativeInfo[]
  count: (initiativeID: string) => number
  canCreateSession: boolean
  onCreateSession: () => void
  onRemoveInitiative: (initiative: InitiativeInfo) => void
  onNewInitiative: () => void
  onNewSection: () => void
}) {
  const language = useLanguage()

  return (
    <div data-component="home-initiatives-index" class="flex items-center gap-1.5 overflow-x-auto pt-2">
      <For each={props.initiatives}>
        {(initiative) => (
          <HomeInitiativeChip
            initiative={initiative}
            count={props.count(initiative.id)}
            href={initiativeHref(props.server, initiative.id)}
            onRemove={() => props.onRemoveInitiative(initiative)}
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
        onClick={props.onNewInitiative}
      >
        <Icon name="plus" />
        {language.t("home.sessions.initiatives.new")}
      </button>
      <button
        type="button"
        data-component="home-section-new"
        class={`
          flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5
          text-[12px] leading-4 text-v2-text-text-faint [font-weight:530]
          transition-[background-color,color] duration-[120ms] ease-in-out
          hover:bg-v2-background-bg-layer-02 hover:text-v2-text-text-muted
          focus-visible:bg-v2-background-bg-layer-02 focus-visible:outline-none
        `}
        onClick={props.onNewSection}
      >
        <Icon name="plus" />
        {language.t("home.sessions.sections.new")}
      </button>
      <Show when={props.canCreateSession}>
        <button
          type="button"
          data-component="home-session-new"
          data-action="home-new-session"
          class={`
            flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5
            text-[12px] leading-4 text-v2-text-text-faint [font-weight:530]
            transition-[background-color,color] duration-[120ms] ease-in-out
            hover:bg-v2-background-bg-layer-02 hover:text-v2-text-text-muted
            focus-visible:bg-v2-background-bg-layer-02 focus-visible:outline-none
          `}
          onClick={props.onCreateSession}
        >
          <Icon name="edit" />
          {language.t("command.session.new")}
        </button>
      </Show>
    </div>
  )
}

function HomeInitiativeChip(props: { initiative: InitiativeInfo; count: number; href: string; onRemove: () => void }) {
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
        <Icon name="xmark-small" />
      </button>
    </span>
  )
}
