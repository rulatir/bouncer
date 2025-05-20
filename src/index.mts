// src/index.mts

import fs from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import { mkdirp } from 'mkdirp';

export interface BounceOptions {
    sourceDir: string;
    destDir: string;
}

export async function main({ sourceDir, destDir }: BounceOptions): Promise<void> {
    console.log(`🔄 Bouncing from: ${sourceDir}`);
    console.log(`📦 To: ${destDir}`);

    const srcAbs = path.resolve(sourceDir);
    const destAbs = path.resolve(destDir);

    if (srcAbs === destAbs) {
        throw new Error("Destination directory cannot be the same as the source directory.");
    }

    // 1. Parse package.json
    const pkgJsonPath = path.join(srcAbs, 'package.json');
    const pkgData = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));

    // 2. Resolve file list from "files" field or fallback
    const baseGlobs = Array.isArray(pkgData.files) && pkgData.files.length > 0
        ? pkgData.files
        : ['**/*'];

    // Always exclude node_modules, .git, and dynamically exclude destDir if within sourceDir
    const excludes = ['!node_modules', '!.git'];
    if (destAbs.startsWith(srcAbs) && destAbs.slice(srcAbs.length).startsWith(path.sep)) {
        const relativeDest = destAbs.slice(srcAbs.length + 1);
        excludes.push(`!${relativeDest}/**`);
    }

    const fileGlobs = [...baseGlobs, ...excludes];

    const filesToCopy = await globby(fileGlobs, {
        cwd: srcAbs,
        dot: true,
        onlyFiles: false,
        followSymbolicLinks: false,
    });

    // 3. Copy files to destDir
    await mkdirp(destAbs);
    for (const file of filesToCopy) {
        const srcPath = path.join(srcAbs, file);
        const destPath = path.join(destAbs, file);
        await mkdirp(path.dirname(destPath));
        await fs.copyFile(srcPath, destPath);
    }

    // 4. Copy package.json and pnpm-lock.yaml if present
    await fs.copyFile(pkgJsonPath, path.join(destAbs, 'package.json'));
    try {
        await fs.copyFile(path.join(srcAbs, 'pnpm-lock.yaml'), path.join(destAbs, 'pnpm-lock.yaml'));
    } catch {}

    // 5. Optionally run: pnpm install --prod --frozen-lockfile --prefix destDir
    // (Not implemented here yet)

    console.log('✅ Bounce completed');
}
