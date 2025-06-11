#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import process from 'node:process';
import { bounce } from './commands/bounce.mjs';
import { scan } from './commands/scan.mjs';
const resolvePath = (p) => path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
const program = new Command();
program
    .name('bouncer')
    .description('Utility for creating portable node program installations');
program
    .command('bounce')
    .description('Bounce a Node project to a self-contained deployable directory')
    .option('--source <path>', 'Source project directory (default: current working dir)', process.cwd())
    .option('--dest <path>', 'Destination bounce directory (default: ./bounce)', 'bounce')
    .option('--strategy <name>', 'Strategy to use (all, files, or git)') // Added strategy option
    .option('--witness <path>', 'Witness file to create')
    .action(async (opts) => {
    const sourceDir = resolvePath(opts.source);
    const destDir = resolvePath(opts.dest);
    await bounce({ sourceDir, destDir, strategy: opts.strategy, witness: opts.witness });
});
program
    .command('scan')
    .description('List all own files of the project')
    .option('--path <path>', 'Path to scan (default: current working dir)', process.cwd())
    .action(async (opts) => {
    const pathToScan = resolvePath(opts.path);
    await scan(pathToScan);
});
program.parse(process.argv);
