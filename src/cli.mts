#!/usr/bin/env node
import { Command } from 'commander';
import process from 'node:process';
import { getBouncerVersion } from './util/packageVersion.mjs'; // Import the generated runtime module (.mjs). Do NOT modify generated .mjs files.
import { defineBounceCommand } from './commands/bounce.mjs';
import { defineScanCommand } from './commands/scan.mjs';
import { defineFixImportsCommand } from './commands/fix-imports.mjs';
import { defineStripCommand } from './commands/strip.mjs';

const program = new Command();

program
    .name('bouncer')
    .description('Utility for creating portable node program installations')
    .version(getBouncerVersion());

[
    defineBounceCommand,
    defineScanCommand,
    defineFixImportsCommand,
    defineStripCommand

].forEach(def => def(program));

program.parse(process.argv);