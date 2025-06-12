import { readFileSync, writeFileSync } from 'fs';
import * as ts from 'typescript';
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
function processFile(filePath, transform) {
    const code = readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
    const context = { filePath, sourceFile };
    const result = transform(context);
    if (result.modified) {
        const printer = ts.createPrinter();
        const newCode = printer.printFile(result.sourceFile);
        writeFileSync(filePath, newCode);
        return true;
    }
    return false;
}
function isJavaScriptFile(filePath) {
    return /\.(js|mjs|ts|jsx|tsx)$/.test(filePath);
}
