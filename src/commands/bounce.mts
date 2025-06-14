// src/index.mts

import path from 'node:path';
import { determineStrategy, StrategyKey } from '../strategy/index.mjs';
import { promisify } from 'node:util';
import {exec} from 'child_process';
import { $ as ZX } from 'zx';
import fs from 'node:fs';
import { adjustReferences } from '../util/adjustReferences.mjs';
import { Command } from 'commander';
import process from "node:process";
import resolvePath from "../util/resolvePath.mjs";

export interface BounceOptions {
    sourceDir: string;
    destDir: string;
    strategy?: StrategyKey;
    witness?: string;
}

const execAsync = promisify(exec);

export async function bounce({ sourceDir, destDir, strategy: preferredStrategy, witness }: BounceOptions): Promise<void> {
    console.log(`🔄 Bouncing from: ${sourceDir}`);
    console.log(`📦 To: ${destDir}`);

    const srcAbs = path.resolve(sourceDir);
    const destAbs = path.resolve(destDir);

    if (srcAbs === destAbs) {
        throw new Error("Destination directory cannot be the same as the source directory.");
    }

    const strategy = await determineStrategy(srcAbs, { strategy: preferredStrategy });
    await strategy.performBounce({ sourceDir: srcAbs, destDir: destAbs });
    await adjustReferences(srcAbs, destAbs);
    await execAsync('pnpm install --prod --frozen-lockfile --config.node-linker=hoisted --shamefully-hoist', { cwd: destAbs });

    if (strategy.files && witness) {
        const sortedFiles = [...strategy.files].sort();
        const child = ZX`md5state - | md5sum -`;
        child.stdin.write(sortedFiles.join('\n') + '\n');
        child.stdin.end();
        fs.writeFileSync(path.resolve(destAbs, witness), (await child).stdout.toString(), 'utf8');
    }

    console.log(`✅ Bounce completed using strategy "${strategy.name}".`);
}

export function defineBounceCommand(program: Command): void {
    program
        .command('bounce')
        .description('Bounce a Node project to a self-contained deployable directory')
        .option('-d, --dir <path>', 'Source project directory (default: current working dir)', process.cwd())
        .option('-o, --output-dir <path>', 'Destination bounce directory (default: ./bounce)', 'bounce')
        .option('-s, --strategy <name>', 'Strategy to use (all, files, or git)') // Added strategy option
        .option('-w, --witness <path>', 'Witness file to create', 'bounced')
        .action(async (opts) => {
            const sourceDir = resolvePath(opts.source);
            const destDir = resolvePath(opts.dest);
            await bounce({ sourceDir, destDir, strategy: opts.strategy, witness: opts.witness });
        });
}