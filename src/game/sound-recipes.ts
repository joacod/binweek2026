import { defineSound } from 'audiobits';

function chime(root: number, duration: number) {
  return defineSound({ schemaVersion: 1, kind: 'one-shot', duration, layers: [
    { id: 'glass', source: { type: 'oscillator', waveform: 'sine', frequency: root }, gainDb: -25,
      envelope: { attack: .003, decay: duration * .8, sustain: 0, release: .03 } },
    { id: 'overtone', startOffset: .025, source: { type: 'oscillator', waveform: 'triangle', frequency: root * 1.5 }, gainDb: -34,
      envelope: { attack: .003, decay: duration * .65, sustain: 0, release: .03 } },
  ] });
}
export const binweekRecipes = {
  pickup: chime(1046.5, .17),
  victory: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 1.8, layers: [523.25, 659.25, 783.99].map((frequency, index) => ({
    id: `hive-${index}`, startOffset: index * .18,
    source: { type: 'oscillator', waveform: 'triangle', frequency }, gainDb: -26,
    envelope: { attack: .012, decay: .85, sustain: 0, release: .12 },
  })) }),
  checkpoint: chime(659.25, .8),
  'shield-ready': chime(987.77, .55),
  'shield-hit': chime(392, .28),
  wings: defineSound({ schemaVersion: 1, kind: 'sustained',
    parameters: { thrust: { min: 0, max: 1, default: 0, mode: 'live', smoothing: .08 } }, layers: [
    { id: 'wing-air', source: { type: 'noise', color: 'white' },
      gainDb: { control: 'thrust', range: [-34, -28], scale: 'linear' },
      envelope: { attack: .06, decay: .08, sustain: .8, release: .1 },
      effects: [{ type: 'filter', filter: 'bandpass', frequency: 900, q: .7 }] },
    { id: 'wingbeat', source: { type: 'oscillator', waveform: 'triangle',
      frequency: { control: 'thrust', range: [185, 235], scale: 'linear' } },
      gainDb: { control: 'thrust', range: [-30, -23], scale: 'linear' },
      envelope: { attack: .06, decay: .08, sustain: .8, release: .1 } },
  ] }),
  crash: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .55, layers: [
    { id: 'impact', source: { type: 'noise', color: 'white' }, gainDb: -25,
      envelope: { attack: .002, decay: .2, sustain: 0, release: .05 },
      effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 2400], [.5, 170]], curve: 'exponential' }, q: .6 }] },
    { id: 'hull', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 190], [.5, 55]], curve: 'exponential' } }, gainDb: -28,
      envelope: { attack: .002, decay: .45, sustain: 0, release: .05 } },
  ] }),
};
