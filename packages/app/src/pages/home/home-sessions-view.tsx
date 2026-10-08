import type { Session } from "@opencode-ai/sdk/v2/client"
import { type Accessor, createMemo, For, Show, Suspense } from "solid-js"
import { Spinner } from "@opencode-ai/ui/spinner"
import { ScrollView } from "@opencode-ai/ui/scroll-view"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Icon as IconV2 } from "@opencode-ai/ui/v2/icon"
import { IconButtonV2 } from "@opencode-ai/ui/v2/icon-button-v2"
import { TooltipV2 } from "@opencode-ai/ui/v2/tooltip-v2"
import { useLanguage } from "@/context/language"
import { ServerConnection } from "@/context/server"
import type { SessionLabel } from "@/context/session-tags"
import { SessionTabAvatarView } from "@/pages/layout/session-tab-avatar"
import { sessionTitle } from "@/utils/session-title"
import { shouldOpenSessionInBackground } from "../home-session-open"
import { homeSessionNotePinned } from "./home-session-note"
import {
  HomeSessionStatusController,
  homeSessionSearchKey,
  type HomeSessionGroup,
  type HomeSessionRecord,
  type OpenSessionOptions,
} from "./home-sessions-controller"

const SHOW_HOME_SESSION_ARCHIVE = false
const HOME_SECTION_LABEL = "text-v2-text-text-muted [font-weight:440]"
const HOME_SESSION_SEARCH_RESULTS_ID = "home-session-search-results"
// Sessions tagged with these names (case-insensitive) light up a fixed status
// icon in the row instead of showing a text pill.
const HOME_SESSION_STATUS_TAGS = [
  { tag: "done", icon: "check", activeClass: "text-v2-state-fg-success" },
  { tag: "important", icon: "star", activeClass: "text-v2-state-fg-warning" },
  { tag: "urgent", icon: "flame", activeClass: "text-v2-state-fg-danger" },
] as const

// Middle-click or Cmd+click on macOS (Ctrl+click elsewhere) opens a session
// tab in the background without navigating, matching browser conventions.
function isBackgroundOpen(event: MouseEvent) {
  return shouldOpenSessionInBackground({
    button: event.button,
    mac: typeof navigator === "object" && /(Mac|iPod|iPhone|iPad)/.test(navigator.platform),
    meta: event.metaKey,
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
  })
}

export type HomeSessionsViewProps = {
  language: ReturnType<typeof useLanguage>
  groups: Accessor<HomeSessionGroup[]>
  groupCollapsed: (id: HomeSessionGroup["id"]) => boolean
  onToggleGroupCollapsed: (id: HomeSessionGroup["id"]) => void
  showProjectName: Accessor<boolean>
  server: Accessor<ServerConnection.Key>
  canCreateSession: Accessor<boolean>
  searchValue: Accessor<string>
  searchPlaceholder: Accessor<string>
  searchOpen: Accessor<boolean>
  searchLoading: Accessor<boolean>
  searchResults: Accessor<HomeSessionRecord[]>
  searchActive: Accessor<string>
  searchNoResultsLabel: Accessor<string>
  titleOpacity: (id: HomeSessionGroup["id"]) => number
  isOpenTab: (record: HomeSessionRecord) => boolean
  sessionTags: (sessionID: string) => string[]
  labels: Accessor<SessionLabel[]>
  labelCounts: Accessor<Map<string, number>>
  activeLabel: Accessor<SessionLabel | null>
  onSelectLabel: (id: string | null) => void
  onCreateLabel: () => void
  onRemoveLabel: (id: string) => void
  onEditTags: (session: Session) => void
  onEditNote: (session: Session) => void
  onToggleTag: (session: Session, tag: string) => void
  onCreateSession: () => void
  onOpenSession: (session: Session, options?: OpenSessionOptions) => void
  onArchiveSession: (session: Session) => Promise<void>
  onSetHoverTarget: (element: HTMLElement) => void
  onSetThumbTrack: (element: HTMLDivElement) => void
  onSetContent: (element: HTMLDivElement) => void
  onSetHeader: (id: HomeSessionGroup["id"], element: HTMLDivElement) => void
  onWheel: (event: WheelEvent) => void
  onSetSearchRoot: (element: HTMLDivElement) => void
  onSetSearchInput: (element: HTMLInputElement) => void
  onSetSearchList: (element: HTMLDivElement) => void
  onSearchFocus: () => void
  onSearchInput: (value: string) => void
  onSearchClose: () => void
  onSearchMove: (delta: number) => void
  onSearchSelectActive: () => void
  onSearchHighlight: (record: HomeSessionRecord) => void
  onSearchSelect: (record: HomeSessionRecord, options?: OpenSessionOptions) => void
}

export function HomeSessionsView(props: HomeSessionsViewProps) {
  return (
    <section
      ref={props.onSetHoverTarget}
      class="min-h-0 min-w-0 flex-1 flex flex-col"
      aria-label={props.language.t("sidebar.project.recentSessions")}
    >
      <div class="sticky top-0 z-30 shrink-0 bg-v2-background-bg-base pb-3 pt-6 lg:pt-12" onWheel={props.onWheel}>
        <HomeSessionSearch {...props} />
        <HomeSessionLabels {...props} />
        <Suspense>
          <Show when={props.groups().length > 0 && props.canCreateSession()}>
            <div class="pointer-events-none absolute right-0 top-[116px] z-20 flex lg:top-[140px]">
              <ButtonV2
                data-action="home-new-session"
                variant="ghost-muted"
                size="normal"
                icon="edit"
                class="pointer-events-auto h-7 px-2 [font-weight:530]"
                onClick={props.onCreateSession}
              >
                {props.language.t("command.session.new")}
              </ButtonV2>
            </div>
          </Show>
        </Suspense>
      </div>
      <div class="pointer-events-none sticky top-[116px] z-40 h-0 -mr-3 lg:top-[140px]">
        <div
          ref={props.onSetThumbTrack}
          data-component="home-session-scroll-track"
          class="relative ml-auto h-[calc(100cqh-116px)] w-3 lg:h-[calc(100cqh-140px)]"
        />
      </div>
      <div class="-mr-3 min-h-[calc(100cqh-104px)] lg:min-h-[calc(100cqh-128px)]">
        <Suspense
          fallback={
            <div class="pt-3">
              <HomeSessionSkeleton label={props.language.t("common.loading")} />
            </div>
          }
        >
          <Show
            when={props.groups().length > 0}
            fallback={
              <HomeSessionsEmpty
                onNewSession={props.canCreateSession() ? props.onCreateSession : undefined}
                language={props.language}
              />
            }
          >
            <div ref={props.onSetContent} class="flex flex-col pt-3 pr-3 pb-16">
              <For each={props.groups()}>
                {(group, index) => {
                  const collapsed = () => props.groupCollapsed(group.id)
                  return (
                    <>
                      <HomeSessionGroupHeader
                        title={
                          group.id === "done" && collapsed()
                            ? props.language.t("home.sessions.group.done.count", { count: group.sessions.length })
                            : group.title
                        }
                        titleOpacity={props.titleOpacity(group.id)}
                        onSetRef={(element) => props.onSetHeader(group.id, element)}
                        elevated={index() === 0}
                        collapse={
                          group.id === "done"
                            ? { collapsed: collapsed(), onToggle: () => props.onToggleGroupCollapsed(group.id) }
                            : undefined
                        }
                      />
                      <Show when={!(group.id === "done" && collapsed())}>
                        <div
                          class={`flex min-w-0 flex-col gap-px pt-4 ${index() === props.groups().length - 1 ? "" : "mb-6"}`}
                        >
                          <For each={group.sessions}>{(record) => <HomeSessionRow {...props} record={record} />}</For>
                        </div>
                      </Show>
                    </>
                  )
                }}
              </For>
            </div>
          </Show>
        </Suspense>
      </div>
    </section>
  )
}

function HomeSessionLabels(props: HomeSessionsViewProps) {
  return (
    <div data-component="home-session-labels" class="flex items-center gap-1.5 overflow-x-auto pt-2">
      <For each={props.labels()}>
        {(label) => (
          <HomeSessionLabelChip
            label={label}
            count={props.labelCounts().get(label.id) ?? 0}
            active={props.activeLabel()?.id === label.id}
            onSelect={() => props.onSelectLabel(props.activeLabel()?.id === label.id ? null : label.id)}
            onRemove={() => props.onRemoveLabel(label.id)}
          />
        )}
      </For>
      <button
        type="button"
        data-component="home-session-label-new"
        class={`
          flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5
          text-[12px] leading-4 text-v2-text-text-faint [font-weight:530]
          transition-[background-color,color] duration-[120ms] ease-in-out
          hover:bg-v2-background-bg-layer-02 hover:text-v2-text-text-muted
          focus-visible:bg-v2-background-bg-layer-02 focus-visible:outline-none
        `}
        onClick={props.onCreateLabel}
      >
        <IconV2 name="plus" />
        {props.language.t("home.sessions.labels.new")}
      </button>
    </div>
  )
}

function HomeSessionLabelChip(props: {
  label: SessionLabel
  count: number
  active: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  return (
    <span
      data-component="home-session-label"
      class={`
        group/label flex h-6 shrink-0 items-center rounded-full pl-2.5 pr-1.5
        text-[12px] leading-4 [font-weight:530]
        transition-[background-color,color] duration-[120ms] ease-in-out
      `}
      classList={{
        "bg-v2-background-bg-layer-04 text-v2-text-text-base": props.active,
        "bg-v2-background-bg-layer-02/60 text-v2-text-text-muted hover:bg-v2-background-bg-layer-02 hover:text-v2-text-text-base":
          !props.active,
      }}
    >
      <button
        type="button"
        class="flex h-6 cursor-pointer items-center gap-1.5 focus-visible:outline-none"
        onClick={props.onSelect}
      >
        {props.label.name}
        <span class="text-v2-text-text-faint [font-weight:440]">{props.count}</span>
      </button>
      <button
        type="button"
        aria-label={`Remove label ${props.label.name}`}
        class={`
          flex shrink-0 cursor-pointer items-center text-v2-icon-icon-muted
          opacity-0 transition-opacity duration-[120ms] ease-in-out
          group-hover/label:opacity-100 hover:text-v2-icon-icon-base focus-visible:opacity-100
        `}
        onClick={props.onRemove}
      >
        <IconV2 name="xmark-small" />
      </button>
    </span>
  )
}

function HomeSessionLeadingController(props: {
  server: HomeSessionsViewProps["server"]
  isOpenTab: HomeSessionsViewProps["isOpenTab"]
  record: HomeSessionRecord
  revealProjectOnHover: boolean
}) {
  return (
    <HomeSessionStatusController
      server={props.server}
      record={props.record}
      isOpenTab={props.isOpenTab}
      render={(state) => (
        <HomeSessionLeading
          record={props.record}
          revealProjectOnHover={props.revealProjectOnHover}
          open={state.open()}
          unread={state.unread()}
          loading={state.loading()}
        />
      )}
    />
  )
}

function HomeSessionLeading(props: {
  record: HomeSessionRecord
  revealProjectOnHover: boolean
  open: boolean
  unread: boolean
  loading: boolean
}) {
  return (
    <div class="relative shrink-0">
      <Show when={props.open}>
        <span
          aria-hidden="true"
          class={`
            pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2
            rounded-[2px] bg-v2-background-bg-layer-04
          `}
          style={{ right: "calc(100% + 4px)" }}
        />
      </Show>
      <SessionTabAvatarView
        project={props.record.project}
        directory={props.record.session.directory}
        revealProjectOnHover={props.revealProjectOnHover}
        unread={props.unread}
        loading={props.loading}
      />
    </div>
  )
}

function HomeSessionSearch(props: HomeSessionsViewProps) {
  return (
    <div class="w-full">
      <div ref={props.onSetSearchRoot} data-component="home-session-search" class="relative z-30 w-full">
        <Show when={props.searchOpen()}>
          <div
            data-component="home-session-search-panel"
            class={`
              absolute flex flex-col overflow-hidden rounded-[12px]
              bg-v2-background-bg-base shadow-[var(--v2-elevation-floating)]
            `}
            style={{ top: "-6px", left: "-6px", width: "calc(100% + 12px)" }}
          >
            <div class="flex flex-col pt-9">
              <div id={HOME_SESSION_SEARCH_RESULTS_ID} role="listbox" class="flex flex-col gap-4 pt-4">
                <Show
                  when={!props.searchLoading()}
                  fallback={
                    <div class="flex items-center justify-center px-4 py-3 text-v2-text-text-muted [font-weight:440]">
                      <Spinner class="size-4" />
                    </div>
                  }
                >
                  <Show
                    when={props.searchResults().length > 0}
                    fallback={
                      <p
                        class={`
                          my-1.5 px-4 pb-2 text-[13px] leading-4 tracking-[-0.04px]
                          text-v2-text-text-muted [font-weight:440]
                        `}
                      >
                        {props.searchNoResultsLabel()}
                      </p>
                    }
                  >
                    <div class="flex flex-col">
                      <p
                        class={`
                          my-1.5 pl-[18px] pr-6 text-[13px] leading-4 tracking-[-0.04px]
                          text-v2-text-text-muted [font-weight:440]
                        `}
                      >
                        {props.language.t("home.sessions.search.sessions")}
                      </p>
                      <ScrollView class="max-h-80" viewportRef={props.onSetSearchList}>
                        <div class="flex flex-col gap-px pb-2">
                          <For each={props.searchResults()}>
                            {(record) => (
                              <HomeSessionSearchResultRow
                                {...props}
                                record={record}
                                selected={props.searchActive() === homeSessionSearchKey(record)}
                              />
                            )}
                          </For>
                        </div>
                      </ScrollView>
                    </div>
                  </Show>
                </Show>
              </div>
            </div>
          </div>
        </Show>
        <label
          class={`
            relative z-20 flex h-9 w-full items-center gap-2 rounded-[6px] py-1 pl-3 pr-2
            bg-v2-background-bg-layer-02/60 text-v2-icon-icon-muted transition-[background-color,box-shadow]
            duration-[120ms] ease-in-out hover:bg-v2-background-bg-layer-02 focus-within:bg-v2-background-bg-layer-02
          `}
        >
          <IconV2 name="magnifying-glass" />
          <input
            ref={props.onSetSearchInput}
            class={`
              relative z-20 min-w-0 flex-1 border-0 bg-transparent outline-0
              text-v2-text-text-base [font-weight:440] placeholder:text-v2-text-text-faint
            `}
            value={props.searchValue()}
            placeholder={props.searchPlaceholder()}
            aria-label={props.searchPlaceholder()}
            aria-expanded={props.searchOpen()}
            aria-controls={HOME_SESSION_SEARCH_RESULTS_ID}
            aria-autocomplete="list"
            aria-activedescendant={
              props.searchActive() && props.searchOpen()
                ? `home-session-search-option-${props.searchActive()}`
                : undefined
            }
            onFocus={props.onSearchFocus}
            onInput={(event) => props.onSearchInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                props.onSearchClose()
                event.currentTarget.blur()
                return
              }
              if (!props.searchOpen() || props.searchResults().length === 0) return
              if (event.altKey || event.metaKey) return
              if (event.key === "ArrowDown") {
                event.preventDefault()
                props.onSearchMove(1)
                return
              }
              if (event.key === "ArrowUp") {
                event.preventDefault()
                props.onSearchMove(-1)
                return
              }
              if (event.key === "Enter" && !event.isComposing) {
                event.preventDefault()
                props.onSearchSelectActive()
              }
            }}
          />
          <Show when={props.searchValue()}>
            <IconButtonV2
              type="button"
              variant="ghost-muted"
              size="small"
              class="relative z-20 shrink-0"
              icon={<IconV2 name="close" size="large" class="text-v2-icon-icon-muted" />}
              aria-label={props.searchPlaceholder()}
              onClick={() => {
                props.onSearchClose()
                props.onSearchFocus()
              }}
            />
          </Show>
        </label>
      </div>
    </div>
  )
}

function HomeSessionSearchResultRow(
  props: HomeSessionsViewProps & {
    record: HomeSessionRecord
    selected: boolean
  },
) {
  const title = createMemo(() => sessionTitle(props.record.session.title) || props.record.session.id)
  const showProjectName = () => props.showProjectName() && props.record.projectName
  const key = () => homeSessionSearchKey(props.record)

  return (
    <button
      type="button"
      id={`home-session-search-option-${key()}`}
      data-key={key()}
      data-component="home-session-search-row"
      role="option"
      aria-selected={props.selected}
      class={`
        flex h-10 w-full shrink-0 cursor-default items-center gap-2 border-0 py-3 pl-[18px] pr-6 text-left
        transition-[background-color] duration-[120ms] ease-in-out
        hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none
      `}
      classList={{
        "bg-v2-overlay-simple-overlay-hover": props.selected,
        group: !!showProjectName(),
      }}
      onMouseEnter={() => props.onSearchHighlight(props.record)}
      onMouseDown={(event) => {
        if (event.button === 1) event.preventDefault()
      }}
      onClick={(event) => props.onSearchSelect(props.record, { background: isBackgroundOpen(event) })}
      onAuxClick={(event) => {
        if (!isBackgroundOpen(event)) return
        event.preventDefault()
        props.onSearchSelect(props.record, { background: true })
      }}
    >
      <HomeSessionLeadingController
        server={props.server}
        isOpenTab={props.isOpenTab}
        record={props.record}
        revealProjectOnHover={!!showProjectName()}
      />
      <div class="flex min-w-0 flex-1 items-center gap-1.5">
        <HomeSessionTitle title={title()} showProjectName={!!showProjectName()} search />
        <Show when={showProjectName()}>
          <HomeSessionProjectName name={props.record.projectName} search />
        </Show>
      </div>
    </button>
  )
}

function HomeSessionGroupHeader(props: {
  title: string
  titleOpacity: number
  onSetRef: (element: HTMLDivElement) => void
  elevated?: boolean
  collapse?: { collapsed: boolean; onToggle: () => void }
}) {
  return (
    <div
      ref={props.onSetRef}
      class={`
        pointer-events-none sticky top-[116px] flex h-7 min-w-0 items-center justify-between
        bg-v2-background-bg-base pl-3 lg:top-[140px]
      `}
      classList={{ "home-session-group-header z-[5]": !!props.elevated, "z-10": !props.elevated }}
    >
      <div class="flex min-w-0 items-center gap-1">
        <Show when={props.collapse}>
          {(collapse) => (
            <button
              type="button"
              data-action="home-session-group-collapse"
              aria-expanded={!collapse().collapsed}
              aria-label={props.title}
              class={`
                pointer-events-auto -ml-1.5 flex size-5 shrink-0 cursor-pointer items-center justify-center
                rounded-[4px] text-v2-icon-icon-muted
                hover:bg-v2-overlay-simple-overlay-hover
              `}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                collapse().onToggle()
              }}
            >
              <IconV2
                name="chevron-down"
                size="small"
                class="transition-transform duration-150 ease-in-out"
                style={{ transform: `rotate(${collapse().collapsed ? -90 : 0}deg)` }}
              />
            </button>
          )}
        </Show>
        <div class={HOME_SECTION_LABEL} style={{ opacity: props.titleOpacity }}>
          {props.title}
        </div>
      </div>
    </div>
  )
}

function HomeSessionRow(props: HomeSessionsViewProps & { record: HomeSessionRecord }) {
  const title = createMemo(() => sessionTitle(props.record.session.title) || props.record.session.id)
  const showProjectName = () => props.showProjectName() && props.record.projectName
  const tags = createMemo(() => props.sessionTags(props.record.session.id))
  const statusTags = createMemo(() => {
    const present = new Set(tags().map((tag) => tag.toLowerCase()))
    return HOME_SESSION_STATUS_TAGS.map((status) => ({ ...status, active: present.has(status.tag) }))
  })
  const notePinned = createMemo(() => homeSessionNotePinned(props.record.session))

  return (
    <div
      class="group/session relative flex h-10 min-w-0 items-center rounded-[6px]"
      classList={{ group: !!showProjectName() }}
    >
      <button
        type="button"
        data-component="home-session-row"
        class={`
          flex h-10 min-w-0 w-full flex-1 shrink-0 cursor-default items-center gap-2 rounded-[6px] border-0
          bg-transparent py-3 pl-3 pr-[70px] text-left text-v2-text-text-muted [font-weight:530]
          transition-[background-color,color,box-shadow] duration-[120ms] ease-in-out
          hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none
        `}
        onMouseDown={(event) => {
          if (event.button === 1) event.preventDefault()
        }}
        onClick={(event) => props.onOpenSession(props.record.session, { background: isBackgroundOpen(event) })}
        onAuxClick={(event) => {
          if (!isBackgroundOpen(event)) return
          event.preventDefault()
          props.onOpenSession(props.record.session, { background: true })
        }}
      >
        <span class="flex shrink-0 items-center gap-1">
          <For each={statusTags()}>
            {(status) => (
              <TooltipV2
                class="flex shrink-0 items-center"
                placement="bottom"
                value={props.language.t(`home.sessions.tags.status.${status.tag}`)}
              >
                {/* Interactive span inside the row's <button> keeps the layout
                    untouched; stopPropagation keeps clicks/keys from opening the session. */}
                <span
                  role="button"
                  tabIndex={0}
                  aria-pressed={status.active}
                  aria-label={props.language.t(`home.sessions.tags.status.${status.tag}`)}
                  class="flex shrink-0 cursor-pointer items-center"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    props.onToggleTag(props.record.session, status.tag)
                  }}
                  onAuxClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return
                    event.preventDefault()
                    event.stopPropagation()
                    props.onToggleTag(props.record.session, status.tag)
                  }}
                >
                  <IconV2
                    name={status.icon}
                    size="small"
                    classList={{
                      [status.activeClass]: status.active,
                      "text-v2-icon-icon-muted opacity-30": !status.active,
                    }}
                  />
                </span>
              </TooltipV2>
            )}
          </For>
        </span>
        <HomeSessionLeadingController
          server={props.server}
          isOpenTab={props.isOpenTab}
          record={props.record}
          revealProjectOnHover={!!showProjectName()}
        />
        <HomeSessionTitle title={title()} showProjectName={!!showProjectName()} />
        <Show when={showProjectName()}>
          <HomeSessionProjectName name={props.record.projectName} />
        </Show>
      </button>
      <div class="pointer-events-none absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
        <span
          class="flex shrink-0 items-center"
          classList={{
            // hover-reveal forces opacity 1 under @media (hover: none), so touch
            // devices must also restore pointer-events or the visible button is inert.
            "hover-reveal pointer-events-none group-hover/session:opacity-100 group-hover/session:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto [@media(hover:none)]:pointer-events-auto":
              !notePinned(),
            "pointer-events-auto": notePinned(),
          }}
        >
          <TooltipV2
            class="flex shrink-0 items-center"
            placement="bottom"
            value={props.language.t("home.sessions.note.edit")}
          >
            <IconButtonV2
              data-action="home-session-note"
              variant="ghost-muted"
              size="large"
              icon={<IconV2 name="note" />}
              aria-label={props.language.t("home.sessions.note.edit")}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                props.onEditNote(props.record.session)
              }}
            />
          </TooltipV2>
        </span>
        <span class="hover-reveal pointer-events-none flex shrink-0 items-center group-hover/session:opacity-100 group-hover/session:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto [@media(hover:none)]:pointer-events-auto">
          <TooltipV2
            class="flex shrink-0 items-center"
            placement="bottom"
            value={props.language.t("home.sessions.tags.edit")}
          >
            <IconButtonV2
              data-action="home-session-tags"
              variant="ghost-muted"
              size="large"
              icon={<IconV2 name="tag" />}
              aria-label={props.language.t("home.sessions.tags.edit")}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                props.onEditTags(props.record.session)
              }}
            />
          </TooltipV2>
        </span>
      </div>
      <Show when={SHOW_HOME_SESSION_ARCHIVE}>
        <div
          class={`
            hover-reveal absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1
            group-hover/session:opacity-100 focus-within:opacity-100
          `}
        >
          <TooltipV2 class="flex shrink-0 items-center" placement="bottom" value={props.language.t("common.archive")}>
            <IconButtonV2
              data-action="home-session-archive"
              variant="ghost-muted"
              size="large"
              icon={<IconV2 name="archive" />}
              aria-label={props.language.t("common.archive")}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void props.onArchiveSession(props.record.session)
              }}
            />
          </TooltipV2>
        </div>
      </Show>
    </div>
  )
}

function HomeSessionTitle(props: { title: string; showProjectName: boolean; search?: boolean }) {
  return (
    <span
      class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-v2-text-text-base [font-weight:530]"
      classList={{
        "text-[13px] leading-4 tracking-[-0.04px]": !!props.search,
        "max-w-[min(70%,480px)] flex-[0_1_auto]": props.showProjectName,
        "flex-[1_1_auto]": !props.showProjectName,
      }}
    >
      {props.title}
    </span>
  )
}

function HomeSessionProjectName(props: { name: string; search?: boolean }) {
  return (
    <span
      class="min-w-0 flex-[1_1_auto] overflow-hidden text-ellipsis whitespace-nowrap text-v2-text-text-muted [font-weight:440]"
      classList={{ "text-[13px] leading-4 tracking-[-0.04px]": !!props.search }}
    >
      {props.name}
    </span>
  )
}

function HomeSessionsEmpty(props: { onNewSession?: () => void; language: ReturnType<typeof useLanguage> }) {
  return (
    <div class="flex min-h-full flex-col items-center gap-4 px-6 pt-[52px] text-center">
      <div
        class={`
          shrink-0 text-[13px] leading-[13px] tracking-[-0.04px]
          text-v2-text-text-base [font-weight:530]
        `}
      >
        {props.language.t("home.sessions.empty")}
      </div>
      <p
        class={`
          mb-1 text-center text-[13px] leading-5 tracking-[-0.04px]
          text-v2-text-text-muted [font-weight:440]
        `}
      >
        {props.language.t("home.sessions.empty.description")}
      </p>
      <Show when={props.onNewSession}>
        {(onNewSession) => (
          <ButtonV2 data-action="home-new-session" variant="neutral" size="normal" icon="edit" onClick={onNewSession()}>
            {props.language.t("command.session.new")}
          </ButtonV2>
        )}
      </Show>
    </div>
  )
}

function HomeSessionSkeleton(props: { label: string }) {
  return (
    <div class="flex min-w-0 flex-col gap-4">
      <div class="flex h-7 min-w-0 items-center justify-between px-4">
        <div class={HOME_SECTION_LABEL}>{props.label}</div>
      </div>
      <div class="flex min-w-0 flex-col gap-px" aria-hidden="true">
        <For each={[0, 1, 2, 3]}>{() => <div class="h-10 rounded-[6px] bg-v2-background-bg-deep opacity-70" />}</For>
      </div>
    </div>
  )
}
