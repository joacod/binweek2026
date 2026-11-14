import { createGameAudio } from '../engine/browser/audio.ts';
import { createCooldowns } from '../engine/cooldowns.ts';
import type { FlightEvent } from './game.ts';
import { binweekRecipes } from './sound-recipes.ts';

export function createSound(onStatus: (message: string) => void) {
  const audio = createGameAudio(binweekRecipes, onStatus);
  const cooldowns = createCooldowns<keyof typeof binweekRecipes>();
  return { ...audio,
    reset() { cooldowns.clear(); audio.reset(); },
    consume(events: readonly FlightEvent[], thrust: boolean, flying: boolean) {
      cooldowns.advance(audio.time);
      for (const cue of ['victory', 'crash', 'shield-hit', 'checkpoint', 'shield-ready', 'pickup'] as const) {
        if (!events.some(event => event.type === cue) || !cooldowns.allows(cue)) continue;
        if (cue === 'crash' || cue === 'victory') { audio.reset(); cooldowns.clear(); }
        if (audio.play(cue)) cooldowns.record(cue, cue === 'pickup' ? .065 : .5);
        if (cue === 'crash' || cue === 'victory') break;
      }
      if (flying) audio.sustain('wings', { thrust: Number(thrust) });
    },
  };
}
