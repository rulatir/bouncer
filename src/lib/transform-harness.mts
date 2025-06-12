import { readFileSync, writeFileSync } from 'fs';
import * as ts from 'typescript';
import { Strategy } from '../strategy/index.mjs';

export interface TransformContext {
    filePath: string;
    sourceFile: ts.SourceFile;
}

export type TransformFunction = (context: TransformContext) => { modified: boolean; sourceFile: ts.SourceFile };

export interface TransformOptions {
    targetDir: string;
    strategy: Strategy;
    transform: TransformFunction;
    description: string;
}

export async function applyTransform(options: TransformOptions): Promise<void> {
    const { targetDir, strategy, transform, description } = options;

    console.log(`${description} in: ${targetDir}`);

    try {
        const allFiles = await strategy.collectFiles(targetDir);
        const jsFiles = allFiles.filter(isJavaScriptFile);

        console.log(`Found ${jsFiles.length} JavaScript files to process`);

        let processedCount = 0;
        for (const filePath of jsFiles) {
            if (processFile(filePath, transform)) {
                processedCount++;
            }
        }

        console.log(`✅ Successfully processed ${processedCount} files`);
    } catch (error) {
        console.error('❌ Error during transformation:', (error as Error).message);
        process.exit(1);
    }
}

function processFile(filePath: string, transform: TransformFunction): boolean {
    const code = readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

    const context: TransformContext = { filePath, sourceFile };
    const result = transform(context);

    if (result.modified) {
        const printer = ts.createPrinter();
        const newCode = printer.printFile(result.sourceFile);
        writeFileSync(filePath, newCode);
        console.log(`📝 Rewritten: ${filePath}`);
        return true;
    }

    return false;
}

function isJavaScriptFile(filePath: string): boolean {
    return /\.(js|mjs|ts|jsx|tsx)$/.test(filePath);
}