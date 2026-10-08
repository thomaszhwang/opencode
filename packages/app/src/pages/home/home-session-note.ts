import type { Session } from "@opencode-ai/sdk/v2/client"
import { hasNote } from "@/utils/session-note"

// The home row pins its note button visible once a note exists; without one
// the button only appears on row hover (the view's hover-reveal class).
export function homeSessionNotePinned(session: Session | undefined): boolean {
  return hasNote(session)
}
