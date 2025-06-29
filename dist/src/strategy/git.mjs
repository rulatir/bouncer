// src/strategy/git.mts
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'node:path';
import { performStandardCopy } from '../util/copy.mjs';
const execAsync = promisify(exec);
export default {
    name: 'git',
    // Check if the directory is inside a Git repository
    async check(sourceDir) {
        try {
            await execAsync('git rev-parse --is-inside-work-tree', { cwd: sourceDir });
            return true;
        }
        catch {
            return false;
        }
    },
    async collectFiles(sourceDir, destDir) {
        const { stdout: rootDir } = await execAsync('git rev-parse --show-toplevel', { cwd: sourceDir });
        const gitRepoRoot = rootDir.trim();
        // Get all files tracked by Git
        const { stdout } = await execAsync('git ls-files', { cwd: sourceDir });
        const allGitFiles = stdout.trim().split('\n').filter(Boolean);
        // Convert source directory to absolute path
        const sourceDirAbs = path.resolve(sourceDir);
        // Calculate source directory's path relative to git root
        const relativeSourceDir = path.relative(gitRepoRoot, sourceDirAbs);
        const relativeSourceDirWithSep = relativeSourceDir ? `${relativeSourceDir}${path.sep}` : '';
        // Filter files to only those within the source directory
        const gitFiles = allGitFiles
            .filter(file => {
            if (!relativeSourceDir)
                return true;
            return file.startsWith(relativeSourceDirWithSep);
        })
            .map(file => {
            if (!relativeSourceDir)
                return file;
            return file.startsWith(relativeSourceDirWithSep)
                ? file.slice(relativeSourceDirWithSep.length)
                : file;
        });
        // Include essential files even if not tracked by Git
        const essentialFiles = ['package.json', 'pnpm-lock.yaml'];
        return [...new Set([...gitFiles, ...essentialFiles])];
    },
    async performBounce({ sourceDir, destDir }) {
        try {
            this.files = await performStandardCopy({
                sourceDir, destDir,
                files: await this.collectFiles(sourceDir, destDir)
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);
            throw new Error(`Git copy operation failed: ${errorMessage}`);
        }
    },
    async performScan(bouncedDir) {
        console.log((await this.collectFiles(bouncedDir)).map(_ => `--input ${_}`).join("\n"));
    }
};
