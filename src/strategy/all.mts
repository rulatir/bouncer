// src/strategy/all.mts

import { performStandardCopy } from '../util/copy.mjs';
import { buildStandardExclusions, resolveMatchingFiles } from '../util/fileSelection.mjs';
import type { BounceOptions } from '../commands/bounce.mjs';
import {Strategy} from "./index.mjs";

export default {
    name: 'all',

    // This strategy is always available
    async check(sourceDir: string) : Promise<boolean> { return true; },

    async collectFiles(sourceDir: string, destDir?: string): Promise<string[]> {
        // Include everything except standard exclusions
        const exclusions = buildStandardExclusions(sourceDir, destDir);
        const selectionRules = ['**', ...exclusions];

        return await resolveMatchingFiles(selectionRules, sourceDir);
    },

    async performBounce({ sourceDir, destDir }: BounceOptions): Promise<void> {

        this.files = await performStandardCopy({
            sourceDir, destDir,
            files: await this.collectFiles(sourceDir, destDir)
        });
    },

    async performScan(bouncedDir: string): Promise<void> {
        console.log((await this.collectFiles(bouncedDir)).map(_ => `--input ${_}`).join("\n"));
    }

} satisfies Strategy;