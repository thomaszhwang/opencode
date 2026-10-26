import { A, useParams } from "@solidjs/router"
import { createEffect, createMemo, createResource, createSignal, For, on, Show } from "solid-js"
import { useQuery } from "@tanstack/solid-query"
import { ScrollView } from "@opencode/ui/scroll-view"
import { Spinner } from "@opencode/ui/spinner"
import { Markdown } from "@opencode/session-ui/markdown"
import { displayName } from "@opencode/ui/project-avatar"
import type { SessionInfo } from "@opencode/client/promise"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"
import { loadHomeSessionIndex, mergeHomeSessionIndex } from "@/home/sessions/index"
import { compareSessionTime } from "@/shell/layout/helpers"
import { sessionHref } from "@/shell/routes/session"
import { isInitiativeMember } from "@/session/session-tags"
import { sessionTitle } from "@/session/title"
import { getRelativeTime } from "@/shell/time"

// Keep the immutable result opaque so Solid Query does not recursively unwrap every session on mount.
const selectSessions = (sessions: SessionInfo[]) => () => sessions

export function InitiativeRoute() {
  const params = useParams<{ serverKey: string; id: string }>()
  const server = useServer()
  const language = useLanguage()

  const initiative = createMemo(() => server.ctx.initiatives.list().find((item) => item.id === params.id))

  // Membership spans the whole history (no recency trim), so the space page
  // keeps its own index query rather than sharing home's bounded one.
  const sessionLoad = useQuery(() => ({
    queryKey: ["initiative-sessions", server.key] as const,
    enabled: server.ctx.sdk.connection.status() === "connected",
    queryFn: ({ signal }) =>
      loadHomeSessionIndex(
        (input, options) => server.ctx.sdk.api.session.list(input, options),
        signal,
        Number.MAX_SAFE_INTEGER,
      ),
    retry: false,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    select: selectSessions,
  }))

  // The fetched index overlaid with the live session store, as on home, so a
  // tag edit made this run moves a conversation without waiting for a refetch.
  const members = createMemo(() => {
    const current = initiative()
    if (!current) return []
    return server.ctx.data.session
      .apply(
        mergeHomeSessionIndex(
          sessionLoad.isPending ? [] : (sessionLoad.data?.() ?? []),
          server.ctx.data.session.list(),
        ),
      )
      .filter((session) => isInitiativeMember(session, current.name))
      .sort(compareSessionTime)
      .map((session) => ({
        session,
        projectName: displayName(server.ctx.projects.forSession(session) ?? { worktree: session.location.directory }),
      }))
  })

  const [selectedDoc, setSelectedDoc] = createSignal<string>()
  createEffect(on(() => params.id, () => setSelectedDoc(undefined)))
  const [docs] = createResource(
    () => initiative(),
    (current) => server.ctx.sdk.api.initiative.doc.list({ initiativeID: current.id }),
    { initialValue: [] },
  )
  const [docContent] = createResource(
    () => {
      const current = initiative()
      const name = selectedDoc()
      if (!current || !name) return undefined
      return { initiativeID: current.id, name }
    },
    // A listed doc can still fail DocName validation on read; it renders blank, as on v1.
    async (input) => ({ name: input.name, text: await server.ctx.sdk.api.initiative.doc.read(input).catch(() => "") }),
  )

  const docsLoaded = () => docs.state === "ready" || docs.state === "refreshing"
  const currentDoc = () => {
    if (docContent.state !== "ready" && docContent.state !== "refreshing") return undefined
    const value = docContent.latest
    return value?.name === selectedDoc() ? value : undefined
  }

  const loading = () => !server.ctx.initiatives.ready() || (!!initiative() && sessionLoad.isPending)

  return (
    <div
      data-slot="initiative-panel"
      class={`
        mx-[var(--shell-inline-inset,8px)] mb-[var(--shell-bottom-inset,8px)] mt-[var(--shell-top-inset,8px)] flex min-h-0 flex-1 flex-col self-stretch overflow-hidden rounded-[10px]
        bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]
      `}
    >
      <ScrollView class="min-h-0 flex-1">
        <Show
          when={!loading()}
          fallback={
            <div class="flex h-full items-center justify-center text-v2-text-text-muted">
              <Spinner class="size-4" />
            </div>
          }
        >
          <Show when={initiative()} fallback={<InitiativeNotFound />} keyed>
            {(current) => (
              <div class="mx-auto flex min-h-full w-full max-w-[720px] flex-col px-3 pb-16 lg:px-6">
                <header class="flex items-center gap-2 pt-6 lg:pt-12">
                  <h1 class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[16px] leading-6 text-v2-text-text-base [font-weight:530]">
                    {current.name}
                  </h1>
                  <span
                    class={`
                      flex h-6 shrink-0 items-center rounded-full bg-v2-background-bg-layer-02/60 px-2.5
                      text-[12px] leading-4 text-v2-text-text-muted [font-weight:530]
                    `}
                  >
                    {language.t(`initiative.status.${current.status}`)}
                  </span>
                </header>
                <div class="pt-6 text-v2-text-text-muted [font-weight:440]">
                  {language.t("initiative.space.conversations")}
                </div>
                <Show
                  when={members().length > 0}
                  fallback={
                    <div class="flex flex-col gap-2 px-3 pt-8 text-center">
                      <div class="text-[13px] leading-5 tracking-[-0.04px] text-v2-text-text-base [font-weight:530]">
                        {language.t("initiative.space.empty")}
                      </div>
                      <p class="text-[13px] leading-5 tracking-[-0.04px] text-v2-text-text-muted [font-weight:440]">
                        {language.t("initiative.space.empty.description", { name: current.name })}
                      </p>
                    </div>
                  }
                >
                  <div class="flex min-w-0 flex-col gap-px pt-4">
                    <For each={members()}>
                      {(member) => (
                        <A
                          href={sessionHref(server.key, member.session.id)}
                          data-component="initiative-session-row"
                          class={`
                            flex h-10 min-w-0 items-center gap-2 rounded-[6px] px-3
                            transition-[background-color] duration-[120ms] ease-in-out
                            hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none
                          `}
                        >
                          <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-v2-text-text-base [font-weight:530]">
                            {sessionTitle(member.session.title) || member.session.id}
                          </span>
                          <span class="min-w-0 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-v2-text-text-muted [font-weight:440]">
                            {member.projectName}
                          </span>
                          <span class="shrink-0 text-[12px] leading-4 text-v2-text-text-faint [font-weight:440]">
                            {getRelativeTime(
                              new Date(member.session.time.updated ?? member.session.time.created).toISOString(),
                              language.t,
                            )}
                          </span>
                        </A>
                      )}
                    </For>
                  </div>
                </Show>
                <div class="pt-8 text-v2-text-text-muted [font-weight:440]">{language.t("initiative.space.docs")}</div>
                <Show
                  when={docsLoaded()}
                  fallback={
                    <div class="flex justify-center pt-8 text-v2-text-text-muted">
                      <Spinner class="size-4" />
                    </div>
                  }
                >
                  <Show
                    when={docs().length > 0}
                    fallback={
                      <div class="flex flex-col gap-2 px-3 pt-8 text-center">
                        <div class="text-[13px] leading-5 tracking-[-0.04px] text-v2-text-text-base [font-weight:530]">
                          {language.t("initiative.space.docs.empty")}
                        </div>
                        <p class="text-[13px] leading-5 tracking-[-0.04px] text-v2-text-text-muted [font-weight:440]">
                          {language.t("initiative.space.docs.empty.description")}
                        </p>
                      </div>
                    }
                  >
                    <div class="flex min-w-0 flex-col gap-px pt-2">
                      <For each={docs()}>
                        {(doc) => (
                          <button
                            type="button"
                            data-component="initiative-doc-row"
                            onClick={() => setSelectedDoc((name) => (name === doc.name ? undefined : doc.name))}
                            class={`
                              flex h-10 min-w-0 items-center gap-2 rounded-[6px] px-3 text-left
                              transition-[background-color] duration-[120ms] ease-in-out
                              hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none
                              ${selectedDoc() === doc.name ? "bg-v2-overlay-simple-overlay-hover" : ""}
                            `}
                          >
                            <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-v2-text-text-base [font-weight:530]">
                              {doc.name}
                            </span>
                            <span class="shrink-0 text-[12px] leading-4 text-v2-text-text-faint [font-weight:440]">
                              {doc.timeUpdated
                                ? getRelativeTime(new Date(doc.timeUpdated).toISOString(), language.t)
                                : ""}
                            </span>
                          </button>
                        )}
                      </For>
                    </div>
                    <Show when={selectedDoc()}>
                      <div class="pt-4">
                        <Show
                          when={currentDoc()}
                          keyed
                          fallback={
                            <div class="flex justify-center pt-4 text-v2-text-text-muted">
                              <Spinner class="size-4" />
                            </div>
                          }
                        >
                          {(doc) => <Markdown text={doc.text} />}
                        </Show>
                      </div>
                    </Show>
                  </Show>
                </Show>
              </div>
            )}
          </Show>
        </Show>
      </ScrollView>
    </div>
  )
}

function InitiativeNotFound() {
  const language = useLanguage()
  return (
    <div class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div class="max-w-md text-[16px] leading-6 text-v2-text-text-base [font-weight:530]">
        {language.t("initiative.notFound")}
      </div>
      <div class="max-w-md text-[13px] leading-5 text-v2-text-text-muted [font-weight:440]">
        {language.t("initiative.notFound.description")}
      </div>
    </div>
  )
}
