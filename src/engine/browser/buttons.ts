import { createKeyMap, type KeyBindings } from '../bindings.ts';

interface ButtonInput<Action extends string> {
  surface: HTMLElement;
  controls: Readonly<Record<Action, HTMLButtonElement>>;
  bindings: KeyBindings<Action>;
  active(): boolean;
  signal: AbortSignal;
}
/** Captured button holds and rising edges. Games translate each step's snapshot into actions. */
export function bindButtons<Action extends string>({ surface, controls, bindings, active, signal }: ButtonInput<Action>) {
  const keys = createKeyMap(bindings);
  const heldKeys = new Set<string>(), pressed = new Set<Action>();
  const pointers = new Map<number, { actions: ReadonlySet<Action>; target: HTMLElement }>();
  const entries = Object.entries(controls) as [Action, HTMLButtonElement][];
  const down = (action: Action) => [...heldKeys].some(code => keys.get(code) === action) || [...pointers.values()].some(p => p.actions.has(action));
  function reflect() { for (const [action, button] of entries) button.toggleAttribute('data-held', down(action)); }
  function hold(id: number, target: HTMLElement, actions: ReadonlySet<Action>) {
    const previous = pointers.get(id);
    for (const action of actions) if (!previous?.actions.has(action) && !down(action)) pressed.add(action);
    pointers.set(id, { actions, target }); reflect();
  }
  function release(id: number) {
    const p = pointers.get(id); pointers.delete(id);
    if (p?.target.hasPointerCapture(id)) p.target.releasePointerCapture(id);
    reflect();
  }
  function clear() { heldKeys.clear(); pressed.clear(); for (const id of pointers.keys()) release(id); reflect(); }
  surface.addEventListener('keydown', event => {
    const action = keys.get(event.code);
    if (!active() || action === undefined || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault(); if (event.repeat || heldKeys.has(event.code)) return;
    if (!down(action)) pressed.add(action);
    heldKeys.add(event.code); reflect();
  }, { signal });
  window.addEventListener('keyup', event => { heldKeys.delete(event.code); reflect(); }, { signal });
  for (const [action, button] of entries) {
    button.addEventListener('pointerdown', event => {
      if (!active() || event.button !== 0) return;
      event.preventDefault(); surface.focus({ preventScroll: true });
      hold(event.pointerId, button, new Set([action])); button.setPointerCapture(event.pointerId);
    }, { signal });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(name, event => release(event.pointerId), { signal });
    button.addEventListener('click', event => {
      if (!active() || event.detail !== 0) return;
      // Physical pointers act on press; keyboard and assistive clicks create a single edge.
      surface.focus({ preventScroll: true }); pressed.add(action);
    }, { signal });
  }
  surface.addEventListener('pointerdown', event => {
    if (!active() || event.button !== 0) return;
    // Suppress native mouse focus/selection after a touch, keeping focus on play.
    event.preventDefault(); surface.focus({ preventScroll: true });
  }, { signal });
  signal.addEventListener('abort', clear, { once: true });
  return { clear,
    read(): { held: ReadonlySet<Action>; pressed: ReadonlySet<Action> } {
    const snapshot = { held: new Set(entries.filter(([action]) => down(action)).map(([action]) => action)), pressed: new Set(pressed) };
    pressed.clear(); return snapshot;
  } };
}
