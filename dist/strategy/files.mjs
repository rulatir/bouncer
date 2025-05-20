// src/strategy/files.mts
import { performStandardCopy } from '../util/copy.mjs';
import { buildStandardExclusions, readPackageJson, resolveMatchingFiles } from '../util/fileSelection.mjs';
export default {
    name: 'files',
    // Check if the 'files' field exists in package.json
    check: async (sourceDir) => {
        try {
            const pkg = await readPackageJson(sourceDir);
            return Array.isArray(pkg.files) && pkg.files.length > 0;
        }
        catch {
            return false;
        }
    },
    performBounce: async ({ sourceDir, destDir }) => {
        const pkg = await readPackageJson(sourceDir);
        if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
            throw new Error("'files' field is missing or not an array in package.json");
        }
        const exclusions = buildStandardExclusions(sourceDir, destDir);
        const selectionRules = [...pkg.files, ...exclusions];
        const files = await resolveMatchingFiles(selectionRules, sourceDir);
        await performStandardCopy({ sourceDir, destDir, files });
    }
};
