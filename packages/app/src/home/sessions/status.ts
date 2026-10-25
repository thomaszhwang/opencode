export type HomeSessionBadgeInput = {
  needsAttention: boolean
  working: boolean
  unseen: boolean
}

export type HomeSessionBadge = "waiting" | "running" | "none"

export function resolveHomeSessionBadge(input: HomeSessionBadgeInput): HomeSessionBadge {
  if (input.needsAttention) return "waiting"
  if (input.working) return "running"
  if (input.unseen) return "waiting"
  return "none"
}

export function countHomeSessionBadges(badges: Iterable<HomeSessionBadge>) {
  const list = [...badges]
  return {
    waiting: list.filter((badge) => badge === "waiting").length,
    running: list.filter((badge) => badge === "running").length,
  }
}
