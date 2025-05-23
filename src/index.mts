// src/index.mts

import path from 'node:path';
import { determineStrategy, StrategyKey } from './strategy/index.mjs';
import { promisify } from 'node:util';
import {exec} from 'child_process';

export interface BounceOptions {
    sourceDir: string;
    destDir: string;
    strategy?: StrategyKey
}

const execAsync = promisify(exec);

export async function main({ sourceDir, destDir, strategy: preferredStrategy }: BounceOptions): Promise<void> {
    console.log(`🔄 Bouncing from: ${sourceDir}`);
    console.log(`📦 To: ${destDir}`);

    const srcAbs = path.resolve(sourceDir);
    const destAbs = path.resolve(destDir);

    if (srcAbs === destAbs) {
        throw new Error("Destination directory cannot be the same as the source directory.");
    }

    const strategy = await determineStrategy(srcAbs, { strategy: preferredStrategy });
    await strategy.performBounce({ sourceDir: srcAbs, destDir: destAbs });
    await execAsync('pnpm install --prod --frozen-lockfile', { cwd: destAbs });

    console.log(`✅ Bounce completed using strategy "${strategy.name}".`);
}
