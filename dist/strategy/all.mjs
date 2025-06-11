// src/strategy/all.mts
import { performStandardCopy } from '../util/copy.mjs';
import { buildStandardExclusions, resolveMatchingFiles } from '../util/fileSelection.mjs';
export default {
    name: 'all',
    // This strategy is always available
    async check(sourceDir) { return true; },
    async collectFiles(sourceDir, destDir) {
        // Include everything except standard exclusions
        const exclusions = buildStandardExclusions(sourceDir, destDir);
        const selectionRules = ['**', ...exclusions];
        return await resolveMatchingFiles(selectionRules, sourceDir);
    },
    async performBounce({ sourceDir, destDir }) {
        this.files = await performStandardCopy({
            sourceDir, destDir,
            files: await this.collectFiles(sourceDir, destDir)
        });
    },
    async performScan(bouncedDir) {
        console.log((await this.collectFiles(bouncedDir)).map(_ => `--input ${_}`).join("\n"));
    }
};
