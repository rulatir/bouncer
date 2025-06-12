import { extname } from 'path';
import traverse from '@babel/traverse';
import { execSync } from 'child_process';
export function fixImportsTransform(context) {
    let modified = false;
    traverse(context.ast, {
        ImportDeclaration(path) {
            const specifier = path.node.source.value;
            if (needsResolution(specifier)) {
                const augmented = resolveExtensionless(specifier, context.filePath);
                if (augmented !== specifier) {
                    path.node.source.value = augmented;
                    modified = true;
                }
            }
        },
        ExportNamedDeclaration(path) {
            if (path.node.source) {
                const specifier = path.node.source.value;
                if (needsResolution(specifier)) {
                    const augmented = resolveExtensionless(specifier, context.filePath);
                    if (augmented !== specifier) {
                        path.node.source.value = augmented;
                        modified = true;
                    }
                }
            }
        },
        ExportAllDeclaration(path) {
            const specifier = path.node.source.value;
            if (needsResolution(specifier)) {
                const augmented = resolveExtensionless(specifier, context.filePath);
                if (augmented !== specifier) {
                    path.node.source.value = augmented;
                    modified = true;
                }
            }
        }
    });
    return modified;
}
function needsResolution(specifier) {
    return !extname(specifier) && (specifier.startsWith('./') || specifier.startsWith('../'));
}
function resolveExtensionless(specifier, importer) {
    // Try .mjs first
    const mjsSpecifier = specifier + '.mjs';
    if (canResolve(mjsSpecifier, importer)) {
        return mjsSpecifier;
    }
    // Try /index.mjs
    const indexSpecifier = specifier + '/index.mjs';
    if (canResolve(indexSpecifier, importer)) {
        return indexSpecifier;
    }
    // Return original if neither resolves
    return specifier;
}
function canResolve(specifier, importer) {
    try {
        execSync(`node --input-type=module -e "await import.meta.resolve('${specifier}', '${importer}')"`, { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
