// src/strategy/all.mts

import { performStandardCopy } from '../util/copy.mjs';
import { buildStandardExclusions, resolveMatchingFiles } from '../util/fileSelection.mjs';
import type { BounceOptions } from '../index.mjs';
import {Strategy} from "./index.mjs";

export default {
    name: 'all',

    // This strategy is always available
    check: async (sourceDir: string) : Promise<boolean> => true,

    performBounce: async ({ sourceDir, destDir }: BounceOptions): Promise<void> => {
        // Include everything except standard exclusions
        const exclusions = buildStandardExclusions(sourceDir, destDir);
        const selectionRules = ['**', ...exclusions];

        const files = await resolveMatchingFiles(selectionRules, sourceDir);
        await performStandardCopy({ sourceDir, destDir, files });
    }
} satisfies Strategy;