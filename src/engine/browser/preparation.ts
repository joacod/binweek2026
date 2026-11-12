export type Readiness = 'loading' | 'ready' | 'failed';

/** Gate play on required resources, with explicit retry and stale-completion protection. */
export function createReadiness(signal: AbortSignal, update: (state: Readiness, retry: () => void) => void) {
  let generation = 0, ready = false;
  function watch(prepare: () => Promise<void | boolean>) {
    if (signal.aborted) return;
    const token = ++generation;
    const retry = () => { if (token === generation) watch(prepare); };
    ready = false;
    update('loading', retry);
    void Promise.resolve().then(() => {
      if (!signal.aborted && token === generation) return prepare();
    }).then(result => {
      if (signal.aborted || token !== generation) return;
      if (result === false) { update('failed', retry); return; }
      ready = true;
      update('ready', retry);
    }).catch(() => {
      if (!signal.aborted && token === generation) update('failed', retry);
    });
  }
  return { watch, get ready() { return ready && !signal.aborted; } };
}

