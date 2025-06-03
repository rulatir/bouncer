// src/strategy/files.mts

import { performStandardCopy } from '../util/copy.mjs';
import { buildStandardExclusions, readPackageJson, resolveMatchingFiles } from '../util/fileSelection.mjs';
import type { BounceOptions } from '../index.mjs';
import {Strategy} from "./index.mjs";

export default {
    name: 'files',

    // Check if the 'files' field exists in package.json
    async check (sourceDir: string): Promise<boolean> {
        try {
            const pkg = await readPackageJson(sourceDir);
            return Array.isArray(pkg.files) && pkg.files.length > 0;
        } catch {
            return false;
        }
    },

    async performBounce({ sourceDir, destDir }: BounceOptions): Promise<void> {
        const pkg = await readPackageJson(sourceDir);

        if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
            throw new Error("'files' field is missing or not an array in package.json");
        }

        const exclusions = buildStandardExclusions(sourceDir, destDir);
        const selectionRules = [...pkg.files, ...exclusions];

        const files = await resolveMatchingFiles(selectionRules, sourceDir);
        this.files = await performStandardCopy({ sourceDir, destDir, files });
    }
} satisfies Strategy;