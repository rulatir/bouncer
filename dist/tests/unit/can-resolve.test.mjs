import { canResolve } from '../../lib/utils/resolve.mjs';
import { mkdtemp, rm, writeFile, mkdir, symlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
async function createTestProject() {
    const root = await mkdtemp(join(tmpdir(), 'canresolve-test-'));
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
async function createSymlink(projectRoot, target, linkPath) {
    const fullLinkPath = join(projectRoot, linkPath);
    const dir = join(fullLinkPath, '..');
    await mkdir(dir, { recursive: true });
    await symlink(target, fullLinkPath);
}
describe('canResolve() comprehensive tests', () => {
    let project;
    beforeEach(async () => {
        project = await createTestProject();
    });
    afterEach(async () => {
        await project.cleanup();
    });
    describe('Direct file resolution', () => {
        test('should resolve existing .mjs file', async () => {
            await createFile(project.root, 'src/utils.mjs', 'export const foo = 1;');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./utils.mjs', importer), true);
        });
        test('should not resolve non-existent .mjs file', async () => {
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./nonexistent.mjs', importer), false);
        });
        test('should resolve existing .js file', async () => {
            await createFile(project.root, 'src/utils.js', 'export const foo = 1;');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./utils.js', importer), true);
        });
    });
    describe('Directory resolution (index files)', () => {
        test('should resolve directory with index.mjs', async () => {
            await createFile(project.root, 'src/lib/index.mjs', 'export const lib = 1;');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./lib/index.mjs', importer), true);
        });
        test('should resolve directory with index.js', async () => {
            await createFile(project.root, 'src/lib/index.js', 'export const lib = 1;');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./lib/index.js', importer), true);
        });
        test('should not resolve empty directory', async () => {
            await mkdir(join(project.root, 'src/empty'), { recursive: true });
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./empty/index.mjs', importer), false);
        });
    });
    describe('Extension-less imports (what our transform handles)', () => {
        test('should not resolve extensionless import to existing .mjs file', async () => {
            await createFile(project.root, 'src/utils.mjs', 'export const foo = 1;');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./utils', importer), false);
        });
        test('should not resolve extensionless import to directory without index', async () => {
            await createFile(project.root, 'src/lib/something.mjs', 'export const lib = 1;');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./lib', importer), false);
        });
        test('should not resolve directory to direct .mjs file when index exists', async () => {
            await createFile(project.root, 'src/plugins.mjs', 'export const direct = 1;');
            await createFile(project.root, 'src/plugins/index.mjs', 'export const fromIndex = 1;');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./plugins.mjs', importer), true);
            assert.strictEqual(canResolve('./plugins/index.mjs', importer), true);
            assert.strictEqual(canResolve('./plugins', importer), false);
        });
    });
    describe('False positive detection', () => {
        test('should not resolve specifier that looks like a package but is relative', async () => {
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./fake-package', importer), false);
        });
        test('should not resolve invalid relative path', async () => {
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./../../../../../../etc/passwd', importer), false);
        });
        test('should not resolve path with invalid characters', async () => {
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./utils\x00.mjs', importer), false);
        });
    });
    describe('Complex project structures', () => {
        test('should handle nested directories correctly', async () => {
            await createFile(project.root, 'src/deep/nested/path/utils.mjs', 'export const deep = 1;');
            await createFile(project.root, 'src/deep/nested/main.mjs', '');
            const importer = `file://${join(project.root, 'src/deep/nested/main.mjs')}`;
            assert.strictEqual(canResolve('./path/utils.mjs', importer), true);
            assert.strictEqual(canResolve('./path/nonexistent.mjs', importer), false);
        });
        test('should handle parent directory imports', async () => {
            await createFile(project.root, 'src/utils.mjs', 'export const utils = 1;');
            await createFile(project.root, 'src/nested/main.mjs', '');
            const importer = `file://${join(project.root, 'src/nested/main.mjs')}`;
            assert.strictEqual(canResolve('../utils.mjs', importer), true);
            assert.strictEqual(canResolve('../nonexistent.mjs', importer), false);
        });
        test('should handle sibling directory imports', async () => {
            await createFile(project.root, 'src/lib/utils.mjs', 'export const utils = 1;');
            await createFile(project.root, 'src/app/main.mjs', '');
            const importer = `file://${join(project.root, 'src/app/main.mjs')}`;
            assert.strictEqual(canResolve('../lib/utils.mjs', importer), true);
            assert.strictEqual(canResolve('../lib/nonexistent.mjs', importer), false);
        });
    });
    describe('Symlinks and pnpm scenarios', () => {
        test('should resolve through symlinks', async () => {
            await createFile(project.root, 'real/utils.mjs', 'export const real = 1;');
            await createSymlink(project.root, './real/utils.mjs', 'link/utils.mjs');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('../link/utils.mjs', importer), true);
        });
        test('should handle broken symlinks correctly', async () => {
            await createSymlink(project.root, './nonexistent.mjs', 'broken-link.mjs');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('../broken-link.mjs', importer), false);
        });
    });
    describe('Package imports (should not be handled by our transform)', () => {
        test('should handle built-in Node.js modules', async () => {
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('fs', importer), true);
            assert.strictEqual(canResolve('path', importer), true);
            assert.strictEqual(canResolve('nonexistent-builtin', importer), false);
        });
        test('should handle package imports in node_modules', async () => {
            await createFile(project.root, 'node_modules/fake-package/package.json', JSON.stringify({ name: 'fake-package', main: 'index.js', type: 'module' }));
            await createFile(project.root, 'node_modules/fake-package/index.js', 'export const pkg = 1;');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('fake-package', importer), true);
            assert.strictEqual(canResolve('nonexistent-package', importer), false);
        });
    });
    describe('Edge cases and error conditions', () => {
        test('should handle malformed file:// URLs', async () => {
            await createFile(project.root, 'src/utils.mjs', '');
            assert.strictEqual(canResolve('./utils.mjs', 'not-a-url'), false);
        });
        test('should handle very long paths', async () => {
            const longPath = 'a'.repeat(200);
            await createFile(project.root, `src/${longPath}.mjs`, '');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve(`./${longPath}.mjs`, importer), true);
        });
        test('should handle special characters in file names', async () => {
            await createFile(project.root, 'src/file with spaces.mjs', '');
            await createFile(project.root, 'src/file-with-dashes.mjs', '');
            await createFile(project.root, 'src/file_with_underscores.mjs', '');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            assert.strictEqual(canResolve('./file with spaces.mjs', importer), true);
            assert.strictEqual(canResolve('./file-with-dashes.mjs', importer), true);
            assert.strictEqual(canResolve('./file_with_underscores.mjs', importer), true);
        });
    });
    describe('Performance and reliability', () => {
        test('should handle concurrent resolution requests', async () => {
            const files = Array.from({ length: 10 }, (_, i) => `utils${i}.mjs`);
            for (const file of files) {
                await createFile(project.root, `src/${file}`, '');
            }
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            const promises = files.map(file => Promise.resolve(canResolve(`./${file}`, importer)));
            const results = await Promise.all(promises);
            assert.strictEqual(results.every(result => result === true), true);
        });
        test('should be consistent across multiple calls', async () => {
            await createFile(project.root, 'src/utils.mjs', '');
            await createFile(project.root, 'src/main.mjs', '');
            const importer = `file://${join(project.root, 'src/main.mjs')}`;
            const results = Array.from({ length: 5 }, () => canResolve('./utils.mjs', importer));
            assert.strictEqual(results.every(result => result === true), true);
            const failResults = Array.from({ length: 5 }, () => canResolve('./nonexistent.mjs', importer));
            assert.strictEqual(failResults.every(result => result === false), true);
        });
    });
});
