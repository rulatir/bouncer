import { execSync } from 'child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
async function createTestProject() {
    const root = await mkdtemp(join(tmpdir(), 'import-test-'));
    await writeFile(join(root, 'package.json'), JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        type: 'module'
    }, null, 2));
    return {
        root,
        cleanup: () => rm(root, { recursive: true, force: true })
    };
}
async function createFile(projectRoot, relativePath, content = '') {
    const fullPath = join(projectRoot, relativePath);
    const dir = join(fullPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content);
}
function canResolveWithImportMeta(specifier, importer) {
    try {
        execSync(`node --input-type=module -e "await import.meta.resolve('${specifier}', '${importer}')"`, { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
function canActuallyImport(specifier, importer) {
    try {
        // Write a test file that tries to actually import the specifier
        const testContent = `import '${specifier}';`;
        const testFile = importer.replace('file://', '').replace('main.mjs', 'test-import.mjs');
        require('fs').writeFileSync(testFile, testContent);
        execSync(`node ${testFile}`, { stdio: 'pipe' });
        // Clean up
        require('fs').unlinkSync(testFile);
        return true;
    }
    catch {
        // Clean up on error too
        const testFile = importer.replace('file://', '').replace('main.mjs', 'test-import.mjs');
        try {
            require('fs').unlinkSync(testFile);
        }
        catch { }
        return false;
    }
}
describe('import.meta.resolve vs actual import behavior', () => {
    let project;
    beforeEach(async () => {
        project = await createTestProject();
    });
    afterEach(async () => {
        await project.cleanup();
    });
    test('extensionless import to existing file', async () => {
        await createFile(project.root, 'src/utils.mjs', 'export const foo = 1;');
        await createFile(project.root, 'src/main.mjs', '');
        const importer = `file://${join(project.root, 'src/main.mjs')}`;
        const metaResolve = canResolveWithImportMeta('./utils', importer);
        const actualImport = canActuallyImport('./utils', importer);
        console.log(`./utils - meta.resolve: ${metaResolve}, actual import: ${actualImport}`);
        // We expect these to be different!
        assert.strictEqual(metaResolve, true); // meta.resolve is permissive
        assert.strictEqual(actualImport, false); // actual import requires extension
    });
    test('non-existent file', async () => {
        await createFile(project.root, 'src/main.mjs', '');
        const importer = `file://${join(project.root, 'src/main.mjs')}`;
        const metaResolve = canResolveWithImportMeta('./nonexistent', importer);
        const actualImport = canActuallyImport('./nonexistent', importer);
        console.log(`./nonexistent - meta.resolve: ${metaResolve}, actual import: ${actualImport}`);
        // Both should be false
        assert.strictEqual(metaResolve, false);
        assert.strictEqual(actualImport, false);
    });
    test('directory with index vs direct file priority', async () => {
        await createFile(project.root, 'src/plugins.mjs', 'export const direct = 1;');
        await createFile(project.root, 'src/plugins/index.mjs', 'export const fromIndex = 1;');
        await createFile(project.root, 'src/main.mjs', '');
        const importer = `file://${join(project.root, 'src/main.mjs')}`;
        const metaResolve = canResolveWithImportMeta('./plugins', importer);
        const actualImport = canActuallyImport('./plugins', importer);
        console.log(`./plugins - meta.resolve: ${metaResolve}, actual import: ${actualImport}`);
        // What does meta.resolve actually resolve to?
        try {
            const resolved = execSync(`node --input-type=module -e "console.log(await import.meta.resolve('./plugins', '${importer}'))"`, { stdio: 'pipe', encoding: 'utf8' }).trim();
            console.log(`./plugins resolves to: ${resolved}`);
        }
        catch (e) {
            console.log(`./plugins resolution failed: ${e}`);
        }
    });
});
