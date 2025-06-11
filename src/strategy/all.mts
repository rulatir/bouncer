// src/strategy/all.mts

import { performStandardCopy } from '../util/copy.mjs';
import { buildStandardExclusions, resolveMatchingFiles } from '../util/fileSelection.mjs';
import type { BounceOptions } from '../commands/bounce.mjs';
import {Strategy} from "./index.mjs";

export default {
    name: 'all',

    // This strategy is always available
    async check(sourceDir: string) : Promise<boolean> { return true; },

    async performBounce({ sourceDir, destDir }: BounceOptions): Promise<void> {
        // Include everything except standard exclusions
        const exclusions = buildStandardExclusions(sourceDir, destDir);
        const selectionRules = ['**', ...exclusions];

        const files = await resolveMatchingFiles(selectionRules, sourceDir);
        this.files = await performStandardCopy({ sourceDir, destDir, files });
    }
} satisfies Strategy;