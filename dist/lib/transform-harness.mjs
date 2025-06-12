import { readFileSync, writeFileSync } from 'fs';
import { parse } from '@babel/parser';
import * as generate from "@babel/generator";
export async function applyTransform(options) {
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
    }
    catch (error) {
        console.error('❌ Error during transformation:', error.message);
        process.exit(1);
    }
}
function isJavaScriptFile(filePath) {
    return /\.(js|mjs|ts|jsx|tsx|mts)$/.test(filePath);
}
function processFile(filePath, transform) {
    try {
        const code = readFileSync(filePath, 'utf8');
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy']
        });
        const context = { filePath, ast };
        const modified = transform(context);
        if (modified) {
            const output = generate.default(ast, {
                retainLines: true,
                compact: false
            }, code);
            writeFileSync(filePath, output.code);
            console.log(`✓ Transformed: ${filePath}`);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error(`⚠️  Skipped ${filePath}: ${error.message}`);
        return false;
    }
}
