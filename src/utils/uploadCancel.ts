/** Thrown when the user leaves mid-upload and the upload is cancelled on purpose. */
export class UploadCancelledError extends Error {
  isCancelled = true;
  constructor() {
    super("Upload cancelled");
  }
}

export function isUploadCancelled(error: unknown): boolean {
  return (
    error instanceof UploadCancelledError ||
    (typeof error === "object" && error !== null && (error as any).isCancelled === true)
  );
}

export function throwIfAborted(signal?: AbortSignal | null): void {
  if (signal?.aborted) throw new UploadCancelledError();
}
