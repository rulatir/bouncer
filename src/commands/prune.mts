import { Command } from 'commander';
import { resolve, relative, dirname } from 'path';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import * as rollup from 'rollup';
import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

async function prune(projectDir: string, entryFile: string): Promise<void> {
    const entry = resolve(projectDir, entryFile);
    const usedFiles = new Set<string>();

    const bundle = await rollup.rollup({
        input: entry,
        onwarn: () => {},
        plugins: [
            resolvePlugin({
                extensions: ['.mjs', '.js'],
                preferBuiltins: true,
            }),
            commonjs(),
            {
                name: 'collect-used-files',
                load(id) {
                    usedFiles.add(resolve(id));
                    return null;
                }
            }
        ]
    });

    await bundle.generate({ format: 'esm', dir: '/dev/null' }); // no output needed

    const allFiles = execSync(
        `find '${projectDir}/node_modules' -type f \\( -name '*.js' -o -name '*.mjs' \\)`,
        { encoding: 'utf8' }
    ).split("\n").filter(Boolean);

    for (const file of allFiles) {
        const abs = resolve(file);
        if (!usedFiles.has(abs)) {
            await fs.unlink(abs);
            console.log(`Pruned: ${relative(projectDir, abs)}`);
        }
    }

    console.log(`Pruning completed in ${projectDir}`);
}

export function definePruneCommand(program: Command) {
    program
        .command('prune')
        .description('Trim unused JS in node_modules')
        .option('--path <path>', 'Path to prune (default: current working dir)', process.cwd())
        .action(async (opts) => {
            const pathToPrune = opts.path;
            await prune(pathToPrune, 'index.mjs');
        });
}
