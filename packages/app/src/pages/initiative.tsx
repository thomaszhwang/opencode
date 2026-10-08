import { A, useParams } from "@solidjs/router"
import { DateTime } from "luxon"
import { createMemo, For, Show } from "solid-js"
import { ScrollView } from "@opencode-ai/ui/scroll-view"
import { Spinner } from "@opencode-ai/ui/spinner"
import { useInitiatives } from "@/context/initiatives"
import { useLanguage } from "@/context/language"
import { requireServerKey, sessionHref } from "@/utils/session-route"
import { sessionTitle } from "@/utils/session-title"

export function InitiativeSpacePage() {
  const params = useParams<{ serverKey: string; id: string }>()
  const language = useLanguage()
  const initiatives = useInitiatives()
  const serverKey = createMemo(() => requireServerKey(params.serverKey))
  const initiative = createMemo(() => initiatives.list().find((item) => item.id === params.id))
  const members = createMemo(() => {
    const current = initiative()
    if (!current) return []
    return initiatives.memberSessions(current)
  })

  return (
    <div
      class={`
        m-2 min-h-0 flex-1 self-stretch overflow-hidden rounded-[10px]
        bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]
      `}
    >
      <ScrollView class="h-full">
        <Show
          when={!initiatives.loading()}
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
                      <div class="text-[13px] leading-[13px] tracking-[-0.04px] text-v2-text-text-base [font-weight:530]">
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
                      {(record) => (
                        <A
                          href={sessionHref(serverKey(), record.session.id)}
                          data-component="initiative-session-row"
                          class={`
                            flex h-10 min-w-0 items-center gap-2 rounded-[6px] px-3
                            transition-[background-color] duration-[120ms] ease-in-out
                            hover:bg-v2-overlay-simple-overlay-hover focus-visible:bg-v2-overlay-simple-overlay-hover focus-visible:outline-none
                          `}
                        >
                          <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-v2-text-text-base [font-weight:530]">
                            {sessionTitle(record.session.title) || record.session.id}
                          </span>
                          <span class="min-w-0 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-v2-text-text-muted [font-weight:440]">
                            {record.projectName}
                          </span>
                          <span class="shrink-0 text-[12px] leading-4 text-v2-text-text-faint [font-weight:440]">
                            {DateTime.fromMillis(record.session.time.updated ?? record.session.time.created)
                              .setLocale(language.intl())
                              .toRelative()}
                          </span>
                        </A>
                      )}
                    </For>
                  </div>
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
