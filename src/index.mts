// src/index.mts

import path from 'node:path';
import { determineStrategy, StrategyKey } from './strategy/index.mjs';
import { promisify } from 'node:util';
import {exec} from 'child_process';
import { $ as ZX } from 'zx';
import fs from 'node:fs';
import adjustReferences from./util/adjustReferences.mjs";

export interface BounceOptions {
    sourceDir: string;
    destDir: string;
    strategy?: StrategyKey;
    witness?: string;
}

const execAsync = promisify(exec);

export async function main({ sourceDir, destDir, strategy: preferredStrategy, witness }: BounceOptions): Promise<void> {
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
    await execAsync('pnpm install --prod --frozen-lockfile --config.node-linker=hoisted', { cwd: destAbs });
    if (strategy.files && witness) {
        const sortedFiles = [...strategy.files].sort();
        const child = ZX`md5state - | md5sum -`;
        child.stdin.write(sortedFiles.join('\n') + '\n');
        child.stdin.end();
        fs.writeFileSync(path.resolve(destAbs, witness), (await child).stdout.toString(), 'utf8');
    }

    console.log(`✅ Bounce completed using strategy "${strategy.name}".`);
}
