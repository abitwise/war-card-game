import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const initCwd = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : null;
const scriptCwd = path.resolve(process.cwd());

// Skip when the package is installed as a dependency; only link for the local workspace root.
if (initCwd && initCwd !== scriptCwd) {
  process.exit(0);
}

const projectRoot = initCwd ?? scriptCwd;
const distEntrypoint = path.join(projectRoot, 'dist', 'index.js');

async function ensureWarBin() {
  try {
    await fs.access(distEntrypoint);
  } catch (error) {
    console.warn(
      'Cannot create local "war" bin: missing dist/index.js. Run "pnpm build" to compile the CLI.'
    );
    return;
  }

  const binDir = path.join(projectRoot, 'node_modules', '.bin');
  await fs.mkdir(binDir, { recursive: true });

  const unixShim = `#!/usr/bin/env node\nimport '${pathToFileURL(distEntrypoint).href}';\n`;
  await fs.writeFile(path.join(binDir, 'war'), unixShim, { mode: 0o755 });

  const windowsShim = `@ECHO off\r\nnode "%~dp0\\..\\dist\\index.js" %*\r\n`;
  await fs.writeFile(path.join(binDir, 'war.cmd'), windowsShim, { mode: 0o755 });

  console.log('Linked local "war" bin for pnpm exec.');
}

ensureWarBin().catch((error) => {
  console.error('Failed to link local "war" bin:', error);
  process.exitCode = 1;
});
