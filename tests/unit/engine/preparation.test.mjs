import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadiness } from '../../../src/engine/browser/preparation.ts';
const flush = () => new Promise(resolve => setImmediate(resolve));

test('required resources gate play, retry failures and ignore superseded completion and retry callbacks', async () => {
  const lifetime = new AbortController(), states = [];
  let retry, finish, fail = true;
  const readiness = createReadiness(lifetime.signal, (state, callback) => { states.push(state); retry = callback; });
  readiness.watch(async () => { if (fail) throw new Error('offline'); });
  assert.equal(readiness.ready, false);
  await flush(); assert.equal(states.at(-1), 'failed');
  fail = false; retry(); await flush(); assert.equal(readiness.ready, true);
  readiness.watch(() => new Promise(resolve => { finish = resolve; }));
  await flush(); const staleRetry = retry;
  readiness.watch(async () => { throw new Error('new request failed'); });
  await flush(); finish(); staleRetry(); await flush();
  assert.equal(states.at(-1), 'failed'); assert.equal(readiness.ready, false);
  let calls = 0;
  readiness.watch(async () => { calls++; }); lifetime.abort(); await flush();
  retry(); await flush(); assert.equal(calls, 0); assert.equal(readiness.ready, false);
});

test('reported preparation failure cannot unlock play and a newer selection owns readiness', async () => {
  const states = [], lifetime = new AbortController();
  const readiness = createReadiness(lifetime.signal, state => states.push(state));
  readiness.watch(async () => false);
  await flush(); assert.equal(states.at(-1), 'failed'); assert.equal(readiness.ready, false);
  let finish;
  readiness.watch(() => new Promise(resolve => { finish = resolve; }));
  await flush();
  readiness.watch(async () => true);
  await flush(); finish(false); await flush();
  assert.equal(states.at(-1), 'ready'); assert.equal(readiness.ready, true);
});

