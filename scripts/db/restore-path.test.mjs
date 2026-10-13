import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./restore.sh', import.meta.url));
const root = path.resolve(path.dirname(script), '../..');
const line = readFileSync(script, 'utf8').split(/\r?\n/).find((value) => value.startsWith('cd '));
assert.ok(line);
// Execute only directory resolution; never run the restore or Prisma commands.
const command = `${line.split(' && ')[0]} && test "$PWD" = "$(cd "$1" && pwd)" && test -f package.json && test -f prisma/schema.prisma`;
for (const [name, cwd, argument] of [
  ['absolute from repository', root, script],
  ['absolute from temporary directory', tmpdir(), script],
  ['relative from repository', root, 'scripts/db/restore.sh'],
]) {
  test(name, () => {
    const result = spawnSync('bash', ['-c', command, argument.replaceAll('\\', '/'), path.join(root, 'apps/web').replaceAll('\\', '/')], { cwd, encoding: 'utf8' });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
  });
}
