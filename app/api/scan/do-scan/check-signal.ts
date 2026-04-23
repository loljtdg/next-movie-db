export const SIGNAL_ABORTED = 'signal aborted';

export function checkSignal(signal: AbortSignal, abortCb?: () => void) {
  if (signal.aborted) {
    abortCb?.();
    throw new Error(SIGNAL_ABORTED);
  }
}
