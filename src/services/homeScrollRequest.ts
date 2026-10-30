// ── Home → scroll to "Needs your attention" (awaiting outcome) ──────
// The appointment_outcomes push is a summary for several appointments, so its
// tap opens Home and asks it to scroll to that section. Home may already be
// mounted (tab), so it both checks the flag on mount and listens for requests.

type Listener = () => void;

let pending = false;
const listeners = new Set<Listener>();

export function requestAwaitingOutcomeScroll(): void {
  pending = true;
  listeners.forEach((listener) => listener());
}

/** True once per request; clears the flag. */
export function consumeAwaitingOutcomeScroll(): boolean {
  const wasPending = pending;
  pending = false;
  return wasPending;
}

export function subscribeToAwaitingOutcomeScroll(
  listener: Listener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
