#!/usr/bin/env node
/**
 * vci-validate CLI
 *
 * `npx vci-validate init`  → installs the VCI integration skill into this
 *                            project's .claude/skills/ folder, so Claude Code
 *                            can walk you through wiring up license validation.
 */

import { cpSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');

function readVersion() {
  try {
    return JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')).version;
  } catch {
    return 'unknown';
  }
}

function printHelp() {
  console.log(`
vci-validate — VCI Marketplace license validation

Usage:
  npx vci-validate init       Install the Claude Code integration skill
  npx vci-validate --version  Print the installed version
  npx vci-validate --help     Show this help

After running 'init', open Claude Code in this project and say:
  "Set up VCI license validation in my app"
`);
}

function runInit() {
  const skillSrc = join(pkgRoot, 'skill');
  if (!existsSync(skillSrc)) {
    console.error('Could not find the bundled skill folder. Try reinstalling @vcincubator/validate.');
    process.exit(1);
  }
  const dest = join(process.cwd(), '.claude', 'skills', 'vci-validate');
  mkdirSync(dest, { recursive: true });
  cpSync(skillSrc, dest, { recursive: true });

  console.log(`
✓ VCI integration skill installed → .claude/skills/vci-validate/

Next steps:
  1. Open Claude Code in this project (run 'claude' or open your IDE).
  2. Say:  "Set up VCI license validation in my app"
  3. Have your VCI API key ready — get it from the seller dashboard at
     https://marketplace.vcinc.ai  →  Settings  →  API Keys

Claude will install the package, wire validation into your app, and
help you test it end to end.
`);
}

const cmd = process.argv[2];
if (cmd === 'init') {
  runInit();
} else if (cmd === '--version' || cmd === '-v') {
  console.log(readVersion());
} else {
  printHelp();
}
