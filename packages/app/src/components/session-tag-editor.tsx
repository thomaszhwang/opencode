import { Icon } from "@opencode-ai/ui/v2/icon"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import { createMemo, createSignal, For, Show } from "solid-js"

export function SessionTagEditor(props: {
  tags: string[]
  suggestions: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  placeholder?: string
  autofocus?: boolean
}) {
  const [value, setValue] = createSignal("")

  const suggestions = createMemo(() => {
    const query = value().trim().toLowerCase()
    const existing = new Set(props.tags.map((tag) => tag.toLowerCase()))
    return props.suggestions
      .filter((tag) => !existing.has(tag.toLowerCase()))
      .filter((tag) => !query || tag.toLowerCase().includes(query))
      .slice(0, 6)
  })

  const submit = () => {
    const tag = value().trim()
    setValue("")
    if (tag) props.onAdd(tag)
  }

  return (
    <div class="flex w-full flex-col gap-2">
      <Show when={props.tags.length > 0}>
        <div class="flex flex-wrap items-center gap-1.5">
          <For each={props.tags}>
            {(tag) => (
              <span
                data-component="session-tag"
                class={`
                  flex h-6 items-center gap-1 rounded-[4px] bg-v2-background-bg-layer-02 pl-2 pr-1
                  text-[12px] leading-4 text-v2-text-text-base [font-weight:440]
                `}
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  class="flex shrink-0 cursor-pointer items-center text-v2-icon-icon-muted hover:text-v2-icon-icon-base"
                  onClick={() => props.onRemove(tag)}
                >
                  <Icon name="xmark-small" />
                </button>
              </span>
            )}
          </For>
        </div>
      </Show>
      <TextInputV2
        autofocus={props.autofocus}
        class="!w-full"
        value={value()}
        placeholder={props.placeholder}
        onInput={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.isComposing) return
          event.preventDefault()
          submit()
        }}
      />
      <Show when={suggestions().length > 0}>
        <div class="flex flex-wrap items-center gap-1.5">
          <For each={suggestions()}>
            {(tag) => (
              <button
                type="button"
                data-component="session-tag-suggestion"
                class={`
                  flex h-6 cursor-pointer items-center rounded-[4px] px-2
                  text-[12px] leading-4 text-v2-text-text-muted [font-weight:440]
                  transition-[background-color,color] duration-[120ms] ease-in-out
                  hover:bg-v2-background-bg-layer-02 hover:text-v2-text-text-base
                `}
                onClick={() => {
                  props.onAdd(tag)
                  setValue("")
                }}
              >
                {tag}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
