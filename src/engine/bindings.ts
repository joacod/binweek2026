/** Physical keyboard codes grouped by semantic action. Pointer buttons use the same action IDs. */
export type KeyBindings<Action extends string> = Readonly<Record<Action, readonly string[]>>;

/** Reject ambiguous layouts before replacing a working binding set. */
export function createKeyMap<Action extends string>(bindings: KeyBindings<Action>): ReadonlyMap<string, Action> {
  const keys = new Map<string, Action>();
  for (const action of Object.keys(bindings) as Action[]) {
    for (const code of bindings[action]) {
      const previous = keys.get(code);
      if (previous !== undefined && previous !== action) throw new Error(`${code} is bound to both ${previous} and ${action}`);
      keys.set(code, action);
    }
  }
  return keys;
}

