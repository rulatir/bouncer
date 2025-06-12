#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import process from 'node:process';
import {bounce, defineBounceCommand} from './commands/bounce.mjs';
import {defineScanCommand, scan} from './commands/scan.mjs';
import resolvePath from './util/resolvePath.mjs';
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