// src/index.mts
import path from 'node:path';
import { determineStrategy } from './strategy/index.mjs';
export async function main({ sourceDir, destDir }) {
    console.log(`🔄 Bouncing from: ${sourceDir}`);
    console.log(`📦 To: ${destDir}`);
    const srcAbs = path.resolve(sourceDir);
    const destAbs = path.resolve(destDir);
    if (srcAbs === destAbs) {
        throw new Error("Destination directory cannot be the same as the source directory.");
    }
    const strategy = await determineStrategy(srcAbs);
    await strategy.performBounce({ sourceDir: srcAbs, destDir: destAbs });
    console.log(`✅ Bounce completed using strategy "${strategy.name}".`);
}
