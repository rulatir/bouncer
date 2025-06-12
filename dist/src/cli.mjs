#!/usr/bin/env node
import { Command } from 'commander';
import process from 'node:process';
import { defineBounceCommand } from './commands/bounce.mjs';
import { defineScanCommand } from './commands/scan.mjs';
import { defineFixImportsCommand } from './commands/fix-imports.mjs';
import { definePruneCommand } from './commands/prune.mjs';
const program = new Command();
program
    .name('bouncer')
    .description('Utility for creating portable node program installations');
[
    defineBounceCommand,
    defineScanCommand,
    defineFixImportsCommand,
    definePruneCommand
].forEach(def => def(program));
program.parse(process.argv);
