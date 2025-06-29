import { extname } from 'path';
import ts from 'typescript';
import { TransformContext } from '../transform-harness.mjs';
import {canResolve} from '../utils/resolve.mjs';

function isSourceFile(node: ts.Node): node is ts.SourceFile {
    return ts.isSourceFile(node);
}

export function fixImportsTransform(context: TransformContext): { modified: boolean; sourceFile: ts.SourceFile } {
    let modified = false;
    const { filePath } = context;

    function visit(node: ts.Node): ts.Node {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            if (needsResolution(specifier)) {
                const augmented = resolveExtensionless(specifier, filePath);
                if (augmented !== specifier) {
                    modified = true;
                    return ts.factory.updateImportDeclaration(
                        node,
                        node.modifiers,
                        node.importClause,
                        ts.factory.createStringLiteral(augmented),
                        node.assertClause
                    );
                }
            }
        }

        if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            if (needsResolution(specifier)) {
                const augmented = resolveExtensionless(specifier, filePath);
                if (augmented !== specifier) {
                    modified = true;
                    return ts.factory.updateExportDeclaration(
                        node,
                        node.modifiers,
                        node.isTypeOnly,
                        node.exportClause,
                        ts.factory.createStringLiteral(augmented),
                        node.assertClause
                    );
                }
            }
        }

        return ts.visitEachChild(node, visit, undefined);
    }

    const transformedNode = ts.visitNode(context.sourceFile, visit);

    if (!transformedNode || !isSourceFile(transformedNode)) {
        throw new Error('Transform failed to return a valid SourceFile');
    }

    return { modified, sourceFile: transformedNode };
}

function needsResolution(specifier: string): boolean {
    return !extname(specifier) && (specifier.startsWith('./') || specifier.startsWith('../'));
}

function resolveExtensionless(specifier: string, importer: string): string {
    if (canResolve(specifier, importer)) {
        return specifier;
    }
    const mjsSpecifier = specifier + '.mjs';
    if (canResolve(mjsSpecifier, importer)) {
        return mjsSpecifier;
    }

    const indexSpecifier = specifier + '/index.mjs';
    if (canResolve(indexSpecifier, importer)) {
        return indexSpecifier;
    }

    return specifier;
}
