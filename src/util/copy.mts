// src/util/copy.mts

import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirp } from 'mkdirp';

interface CopyContext {
    sourceDir: string;
    destDir: string;
    files: string[];
}

export async function performStandardCopy({ sourceDir, destDir, files }: CopyContext): Promise<void> {
    await mkdirp(destDir);

    const fileSet = new Set([
        ...files,
        'package.json',
        'pnpm-lock.yaml'
    ]);

    for (const file of fileSet) {
        const srcPath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);

        try {
            const stat = await fs.stat(srcPath);
            if (stat.isDirectory()) {
                await mkdirp(destPath);
            } else {
                await mkdirp(path.dirname(destPath));
                await fs.copyFile(srcPath, destPath);
            }
        } catch {
            // Skip if file doesn't exist (e.g., pnpm-lock.yaml)
        }
    }
}

export function excludeNestedTarget(sourceDir: string, destDir: string): string[] {
    const sourceAbs = path.resolve(sourceDir);
    const destAbs = path.resolve(destDir);

    if (sourceAbs === destAbs) return [];

    if (destAbs.startsWith(sourceAbs) && destAbs.slice(sourceAbs.length).startsWith(path.sep)) {
        const relativeDest = destAbs.slice(sourceAbs.length + 1);
        return [`!${relativeDest}/**`];
    }

    return [];
}

export const STANDARD_EXCLUSIONS = [
    '!node_modules',
    '!.git',
    '!.idea',
]
