import { readFileSync, writeFileSync } from 'fs';
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import { Strategy } from '../strategy/index.mjs';

export interface TransformContext {
    filePath: string;
    ast: ReturnType<typeof parse>;
}

export type TransformFunction = (context: TransformContext) => boolean | Promise<boolean>;

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
            if (await processFile(filePath, transform)) {
                processedCount++;
            }
        }

        console.log(`✅ Successfully processed ${processedCount} files`);
    } catch (error) {
        console.error('❌ Error during transformation:', (error as Error).message);
        process.exit(1);
    }
}

function isJavaScriptFile(filePath: string): boolean {
    return /\.(js|mjs|ts|jsx|tsx|mts)$/.test(filePath);
}

async function processFile(filePath: string, transform: TransformFunction): Promise<boolean> {
    try {
        const code = readFileSync(filePath, 'utf8');

        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy']
        });

        const context: TransformContext = { filePath, ast };
        const modified = await transform(context);

        if (modified) {
            const output = generate(ast, {
                retainLines: true,
                compact: false
            }, code);

            writeFileSync(filePath, output.code);
            console.log(`✓ Transformed: ${filePath}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`⚠️  Skipped ${filePath}: ${(error as Error).message}`);
        return false;
    }
}