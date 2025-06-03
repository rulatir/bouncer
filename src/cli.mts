#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import process from 'node:process';
import { main } from './index.mjs';

const program = new Command();

program
    .name('bouncer')
    .description('Bounce a Node project to a self-contained deployable directory')
    .option('--source <path>', 'Source project directory (default: current working dir)', process.cwd())
    .option('--dest <path>', 'Destination bounce directory (default: ./bounce)', 'bounce')
    .option('--strategy <name>', 'Strategy to use (all, files, or git)') // Added strategy option
    .option('--witness <path>', 'Witness file to create')
    .parse(process.argv);

const opts = program.opts();

const resolvePath = (p: string) => path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);

const sourceDir = resolvePath(opts.source);
const destDir = resolvePath(opts.dest);

await main({ sourceDir, destDir, strategy: opts.strategy, witness: opts.witness });
