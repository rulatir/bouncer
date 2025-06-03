// src/strategy/all.mts
import { performStandardCopy } from '../util/copy.mjs';
import { buildStandardExclusions, resolveMatchingFiles } from '../util/fileSelection.mjs';
export default {
    name: 'all',
    // This strategy is always available
    async check(sourceDir) { return true; },
    async performBounce({ sourceDir, destDir }) {
        // Include everything except standard exclusions
        const exclusions = buildStandardExclusions(sourceDir, destDir);
        const selectionRules = ['**', ...exclusions];
        const files = await resolveMatchingFiles(selectionRules, sourceDir);
        this.files = await performStandardCopy({ sourceDir, destDir, files });
    }
};
