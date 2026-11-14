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
  // Bee flight has a dense harmonic series around a ~230 Hz wingbeat, not a
  // smooth whistle. Sawtooth retains both even and odd harmonics; small seeded
  // pitch fluctuations avoid a fixed synth note. Filters tame rumble and hiss.
  // Short overlapping gates buzz only while thrust is held, with no idle bed.
  thrust: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .14, layers: [
    { id: 'bee-wingbeat', source: { type: 'oscillator', waveform: 'sawtooth',
      frequency: { points: [
        [0, { random: [218, 232] }], [.013, { random: [228, 239] }],
        [.031, { random: [220, 231] }], [.047, { random: [233, 245] }],
        [.066, { random: [219, 234] }], [.089, { random: [227, 240] }],
        [.112, { random: [222, 236] }], [.14, { random: [219, 233] }],
      ], curve: 'linear' } }, gainDb: -33,
      envelope: { attack: .01, decay: .025, sustain: .65, release: .02 },
      effects: [
        { type: 'filter', filter: 'highpass', frequency: 100, q: .5 },
        { type: 'filter', filter: 'lowpass', frequency: 2400, q: .5 },
      ] },
  ] }),
  crash: defineSound({ schemaVersion: 1, kind: 'one-shot', duration: .55, layers: [
    { id: 'impact', source: { type: 'noise', color: 'white' }, gainDb: -25,
      envelope: { attack: .002, decay: .2, sustain: 0, release: .05 },
      effects: [{ type: 'filter', filter: 'lowpass', frequency: { points: [[0, 2400], [.5, 170]], curve: 'exponential' }, q: .6 }] },
    { id: 'hull', source: { type: 'oscillator', waveform: 'triangle', frequency: { points: [[0, 190], [.5, 55]], curve: 'exponential' } }, gainDb: -28,
      envelope: { attack: .002, decay: .45, sustain: 0, release: .05 } },
  ] }),
};
