import { resolve, relative } from 'path';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import * as rollup from 'rollup';
import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";
async function strip(projectDir, entryFile, bouncedWitness, witness) {
    const entry = resolve(projectDir, entryFile);
    const usedFiles = new Set();
    const bundle = await rollup.rollup({
        input: entry,
        onwarn: () => { },
        plugins: [
            resolvePlugin({
                extensions: ['.mjs', '.js'],
                preferBuiltins: true,
            }),
            commonjs(),
            json(),
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
    const findCommands = [
        `find '${projectDir}/node_modules' -type f \\( -name '*.js' -o -name '*.mjs' -o -name '*.ts' \\)`,
        `find '${projectDir}/node_modules/aws-sdk/apis' -type f \\( -name '*.json' \\)`
    ];
    const allFiles = [...new Set(findCommands
            .map(cmd => execSync(cmd, { encoding: 'utf8' })
            .split("\n")
            .filter(Boolean)
            .map(f => resolve(f)))
            .flat())];
    for (const file of allFiles) {
        const abs = resolve(file);
        if (!usedFiles.has(abs)) {
            await fs.unlink(abs);
            console.log(`Stripped: ${relative(projectDir, abs)}`);
        }
    }
    // Create witness file
    const witnessPath = resolve(projectDir, witness);
    const bouncedWitnessPath = resolve(projectDir, bouncedWitness);
    await fs.writeFile(witnessPath, await fs.readFile(bouncedWitnessPath, { encoding: 'utf-8' }), 'utf8');
    console.log(`Stripping completed in ${projectDir}`);
}
export function defineStripCommand(program) {
    program
        .command('strip')
        .description('Trim unused JS in node_modules')
        .option('-d, --dir <path>', 'Bounced project root (default: current working dir)', process.cwd())
        .option('-b, --bounced <path>', 'Bounce stage witness (default: ./bounced)', 'bounced')
        .option('-w, --witness <path>', 'Witness file to create (default: ./stripped)', 'stripped')
        .action(async (opts) => {
        const pathToStrip = opts.path;
        await strip(pathToStrip, 'index.mjs', opts.bounced, opts.witness);
    });
}
