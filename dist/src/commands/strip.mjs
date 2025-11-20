import { resolve, relative } from 'path';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import * as rollup from 'rollup';
import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";
import YAML from 'yaml';
import mergeInto from "../util/mergeInto.mjs";
// New: fixed date constants for metadata sanitization
const FIXED_DATE_ISO = '2025-11-20T17:00:00Z';
const FIXED_DATE = new Date(FIXED_DATE_ISO);
const FIXED_PRUNED_AT = FIXED_DATE.toUTCString(); // e.g. "Thu, 20 Nov 2025 17:00:00 GMT"
const FIXED_LAST_VALIDATED_MS = FIXED_DATE.getTime(); // epoch ms
const FIXED_STORE_DIR = '/completely/fake/path/store/v10';
// New: helper to sanitize pnpm metadata files
async function sanitizePnpmMetadata(projectDir) {
    // helper: deep-merge patch into target (patch values overwrite scalars; objects merge recursively)
    const typeYaml = {
        parse: (raw) => YAML.parse(raw),
        unparse: (obj) => YAML.stringify(obj)
    }, typeJson = {
        parse: (raw) => JSON.parse(raw),
        unparse: (obj) => JSON.stringify(obj, null, 2) + '\n',
    };
    const candidates = [
        {
            filename: resolve(projectDir, 'node_modules', '.modules.yaml'),
            patch: { packageManager: 'pnpm', prunedAt: FIXED_PRUNED_AT },
            ...typeYaml
        },
        {
            filename: resolve(projectDir, 'node_modules', '.pnpm-workspace-state-v1.json'),
            patch: { lastValidatedTimestamp: FIXED_LAST_VALIDATED_MS },
            ...typeJson
        }
    ];
    for (const candidate of candidates) {
        let raw = null, parsed = null;
        try {
            raw = await fs.readFile(candidate.filename, 'utf8');
            parsed = candidate.parse(raw);
        }
        catch (e) {
            if (null != raw)
                console.log(`Warning: failed to parse ${candidate.filename}: ${e}`);
            continue;
        }
        if ('object' !== typeof parsed)
            continue;
        try {
            mergeInto(parsed, candidate.patch);
            await fs.writeFile(candidate.filename, candidate.unparse(parsed), 'utf8');
        }
        catch (e) {
            console.log(`Warning: failed to write sanitized file ${candidate.filename}: ${e}`);
        }
    }
}
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
                exportConditions: ['node']
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
    // New: sanitize pnpm metadata to remove non-deterministic timestamps/versions
    await sanitizePnpmMetadata(projectDir);
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
        const pathToStrip = opts.dir;
        await strip(pathToStrip, 'index.mjs', opts.bounced, opts.witness);
    });
}
