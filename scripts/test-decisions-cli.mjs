import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../tools/decisions/cli.mjs';

test('basic get/put/delete commands and scopes', () => {
  assert.deepEqual(parseCommand(['get']).path, []);
  assert.deepEqual(parseCommand(['options', 'get', 'career']).path, ['career', 'options']);
  const put = parseCommand(['context', 'put', 'career', 'trust', '--option', 'forge', '--file', '-', '--revision', '0']);
  assert.deepEqual(put.path, ['career', 'options', 'forge', 'context', 'trust']);
  assert.equal(put.method, 'PUT');
  assert.equal(put.values.revision, '0');
  assert.deepEqual(parseCommand(['evaluate', 'career']).path, ['career', 'evaluate']);
  assert.equal(parseCommand(['options', 'delete', 'career', 'forge']).method, 'DELETE');
  for (const args of [['put', 'career'], ['get', '../private'], ['options', 'put', 'career', '--file', '-'], ['evaluations', 'delete', 'career', 'x'], ['get', 'career', '--option', 'forge'], ['get', 'career', '--unknown']]) {
    assert.throws(() => parseCommand(args));
  }
});
