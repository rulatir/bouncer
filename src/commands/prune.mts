import {Command} from 'commander';
import {determineStrategy, Strategy} from "../strategy/index.mjs";
import { resolve } from 'path';
import { execSync } from 'child_process';
import { build } from 'esbuild';
import { DependencyGraph } from "esbuild-dependency-graph";
import {unlinkSync} from "node:fs";

async function prune(projectDir: string, entryFile: string): Promise<void> {
    const usedFiles = new Set<string>();
    const entry = resolve(projectDir, entryFile);
    const result = await build({
        entryPoints: [entry],
        bundle: true,
        metafile: true,
        platform: 'node',
        format: 'esm',
        resolveExtensions: ['.mjs', '.js'],
        mainFields: ['module','main'],
        write: false
    });
    if (!result.metafile) {
        throw new Error('No metafile generated.');
    }

    const graph = new DependencyGraph({root: projectDir});
    graph.load(result.metafile);

    const modules = graph.dependenciesOf(entry);
    const used = new Set(modules.map(m => resolve(m.path)));
    used.add(entry);

    const allFiles = execSync(
        `find ${projectDir}/node_modules -type f \\(-name "*.js" -o -name "*.mjs"\\)`,
        { encoding: 'utf8' }
    ).toString().split("\n").filter(Boolean);
    for (const file of allFiles) {
        if (!used.has(resolve(file))) {
            unlinkSync(file);
            console.log(`Pruned: ${file}`);
        }
    }
    console.log(`Pruning completed in ${projectDir}`);
}

export function definePruneCommand(program: Command) {
    program
        .command('prune')
        .description('Trim unused files in node_modules')
        .option('--path <path>', 'Path to prune (default: current working dir)', process.cwd())
        .action(async (opts) => {
            const pathToPrune = opts.path;
            await prune(pathToPrune, 'index.mjs');
        });
}