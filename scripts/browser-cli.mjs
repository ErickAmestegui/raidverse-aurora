// Windows-safe launcher: passes JavaScript as one argument, without cmd.exe re-parsing it.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const cache = resolve('.npm-cache/_npx');
const cli = existsSync(cache) && readdirSync(cache).map(d => resolve(cache, d, 'node_modules/@playwright/cli/playwright-cli.js')).find(existsSync);
if (!cli) throw new Error('Run npm exec --cache .npm-cache --yes --package @playwright/cli -- playwright-cli --help first.');
let args = process.argv.slice(2);
if (args[0] === 'run-file') args = ['run-code', readFileSync(args[1], 'utf8')];
const result = spawnSync(process.execPath, [cli, '-s=raidverse', ...args], { stdio: 'inherit', windowsHide: true });
process.exit(result.status ?? 1);
