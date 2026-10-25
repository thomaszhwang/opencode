import { createSignal } from "solid-js"

export function createHomeScrollController() {
  const [thumbTrack, setThumbTrack] = createSignal<HTMLDivElement>()
  const [hoverTarget, setHoverTarget] = createSignal<HTMLElement>()
  let viewport: HTMLDivElement | undefined

  function containWheel(event: WheelEvent) {
    if (!viewport) return
    if (event.defaultPrevented || event.ctrlKey || !event.deltaY) return
    if (!(event.target instanceof Element)) return
    const scrollable = event.target.closest<HTMLElement>("[data-scrollable]")
    if (
      scrollable !== viewport &&
      scrollable &&
      (event.deltaY < 0
        ? scrollable.scrollTop > 0
        : scrollable.scrollTop < scrollable.scrollHeight - scrollable.clientHeight)
    )
      return
    event.preventDefault()
  }

  return {
    viewport: {
      thumbTrack,
      hoverTarget,
      setThumbTrack,
      setHoverTarget,
      setViewport: (element: HTMLDivElement) => {
        viewport = element
      },
      containWheel,
      containOuterWheel: (event: WheelEvent) => {
        if (!viewport) return
        if (event.target instanceof Node && viewport.contains(event.target)) return
        containWheel(event)
      },
    },
  }
}

export type HomeScrollController = ReturnType<typeof createHomeScrollController>
