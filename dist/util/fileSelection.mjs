// src/util/fileSelection.mts
import fs from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import { STANDARD_EXCLUSIONS, excludeNestedTarget } from './copy.mjs';
export async function readPackageJson(directory) {
    const pkgJsonPath = path.join(directory, 'package.json');
    return JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
}
export function buildStandardExclusions(sourceDir, destDir) {
    return [
        ...STANDARD_EXCLUSIONS,
        ...(destDir ? excludeNestedTarget(sourceDir, destDir) : [])
    ];
}
export async function resolveMatchingFiles(selectionRules, sourceDir) {
    return await globby(selectionRules, {
        cwd: sourceDir,
        dot: true,
        onlyFiles: false,
        followSymbolicLinks: false,
    });
}
