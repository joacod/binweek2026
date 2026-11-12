import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeyMap } from '../../../src/engine/bindings.ts';

test('binding maps allow aliases and unbound actions but reject ambiguous keys', () => {
  const bindings = { left: ['KeyA', 'ArrowLeft', 'KeyA'], fire: ['KeyZ'], jump: [] };
  const map = createKeyMap(bindings);
  assert.equal(map.get('ArrowLeft'), 'left');
  assert.equal(map.get('KeyZ'), 'fire');
  bindings.fire[0] = 'KeyX';
  assert.equal(map.get('KeyZ'), 'fire', 'compiled bindings do not retain mutable caller data');
  assert.throws(() => createKeyMap({ left: ['KeyZ'], fire: ['KeyZ'] }), /KeyZ.*left.*fire/);
});

